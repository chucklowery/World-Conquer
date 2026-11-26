#!/usr/bin/env node
"use strict";
// M4: measure what a visitor to the published play site downloads and how
// long the game takes to reach its menu, in Chromium, Firefox and WebKit, and
// fail if a roadmap budget is exceeded in any of them.
// SITE_BUDGET_REPORT_ONLY=1 reports without failing; SITE_BUDGET_BROWSERS
// (default "chromium,firefox,webkit") picks the browsers.
//
//   node browser/engine/check-site-budget.js <site-url> [out-dir]
//
// Two measurements against the live site:
//  1. Per file: every file in site.json is fetched with
//     "Accept-Encoding: br, gzip" without decompressing, giving the bytes
//     the host actually sends and the encoding it chose.
//  2. Per browser: the browser loads the play view through a local proxy that
//     forwards each request to the live site and hands the response back
//     unchanged (compressed body, cache headers), paced to 20 Mbps with 40 ms
//     of latency. Play is pressed and the time to the engine's menu is
//     recorded; the proxy counts the bytes it delivered. A second visit with
//     the same on-disk profile measures what the HTTP cache and the pack
//     loader's Cache Storage save. The proxy works the same in every browser;
//     the DevTools throttling used before (run 45748629132 and earlier) is
//     Chromium-only.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");
const playwright = require("playwright");

const base = (process.argv[2] || "").replace(/\/?$/, "/");
const outDir = path.resolve(process.argv[3] || "build/site-budget");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: check-site-budget.js <site-url> [out-dir]");
  process.exit(2);
}
const browsers = (process.env.SITE_BUDGET_BROWSERS || "chromium,firefox,webkit").split(",").map(s => s.trim()).filter(Boolean);
for (const b of browsers) {
  if (!["chromium", "firefox", "webkit"].includes(b)) throw Error("Unknown browser in SITE_BUDGET_BROWSERS: " + b);
}

// Roadmap M4 targets (docs/ROADMAP.md).
const BUDGETS = {
  firstVisitTransferBytes: 15 * 1024 * 1024,
  repeatVisitTransferBytes: 100 * 1024,
  firstVisitTimeToMenuMs: 8000,
  repeatVisitTimeToMenuMs: 2000,
};
const THROTTLE = {downloadBitsPerSecond: 20e6, latencyMs: 40};

const lib = url => url.startsWith("https:") ? https : http;

function getRaw(url) {
  // Raw bytes as sent (no decompression), with the response headers.
  return new Promise((resolve, reject) => {
    const req = lib(url).get(url, {headers: {"Accept-Encoding": "br, gzip"}}, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(getRaw(new URL(res.headers.location, url).href));
        return;
      }
      let bytes = 0;
      res.on("data", chunk => { bytes += chunk.length; });
      res.on("end", () => resolve({status: res.statusCode, bytes, headers: res.headers}));
    });
    req.on("error", reject);
    req.setTimeout(120000, () => req.destroy(Error("Timed out: " + url)));
  });
}

async function measureFiles() {
  const site = JSON.parse(await new Promise((resolve, reject) => {
    lib(base).get(base + "site.json", res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", c => { text += c; });
      res.on("end", () => res.statusCode === 200 ? resolve(text) : reject(Error("site.json HTTP " + res.statusCode)));
    }).on("error", reject);
  }));
  const files = [];
  for (const f of site.files) {
    const r = await getRaw(base + f.path.split("/").map(encodeURIComponent).join("/"));
    files.push({path: f.path, bytes: f.bytes, sent: r.bytes, status: r.status,
      encoding: r.headers["content-encoding"] || "identity",
      type: r.headers["content-type"] || null, cacheControl: r.headers["cache-control"] || null});
  }
  return {commit: site.commit, files};
}

// A local HTTP proxy to the live site, paced like a 20 Mbps link. All
// responses share one link, so parallel downloads split the bandwidth.
function startProxy() {
  const bytesPerMs = THROTTLE.downloadBitsPerSecond / 8 / 1000;
  let linkFreeAt = 0;
  const stats = {requests: 0, bytes: 0, dataRequests: 0, dataBytes: 0, notModified: 0};
  const forward = ["accept", "accept-encoding", "accept-language", "if-none-match", "if-modified-since", "range", "user-agent"];
  const hopByHop = new Set(["connection", "keep-alive", "transfer-encoding", "strict-transport-security", "alt-svc"]);
  const server = http.createServer((req, res) => {
    const target = base + req.url.replace(/^\//, "");
    const headers = {};
    for (const h of forward) if (req.headers[h]) headers[h] = req.headers[h];
    const isData = req.url.startsWith("/data/");
    const up = lib(target).get(target, {headers}, upstream => {
      stats.requests++;
      if (isData) stats.dataRequests++;
      if (upstream.statusCode === 304) stats.notModified++;
      const out = {};
      for (const [k, v] of Object.entries(upstream.headers)) if (!hopByHop.has(k)) out[k] = v;
      setTimeout(() => {
        res.writeHead(upstream.statusCode, out);
        const queue = [];
        let busy = false, ended = false;
        const pump = () => {
          if (busy) return;
          const chunk = queue.shift();
          if (!chunk) {
            if (ended) res.end(); else upstream.resume();
            return;
          }
          busy = true;
          const now = Date.now();
          linkFreeAt = Math.max(now, linkFreeAt) + chunk.length / bytesPerMs;
          setTimeout(() => {
            res.write(chunk);
            stats.bytes += chunk.length;
            if (isData) stats.dataBytes += chunk.length;
            busy = false;
            pump();
          }, linkFreeAt - now);
        };
        upstream.on("data", chunk => { queue.push(chunk); upstream.pause(); pump(); });
        upstream.on("end", () => { ended = true; pump(); });
        upstream.on("error", () => res.destroy());
      }, THROTTLE.latencyMs);
    });
    up.on("error", e => { res.writeHead(502); res.end(String(e)); });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () =>
    resolve({server, stats, url: "http://127.0.0.1:" + server.address().port + "/"})));
}

async function visit(context, proxy, browserName, label) {
  for (const k of Object.keys(proxy.stats)) proxy.stats[k] = 0;
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  const t0 = Date.now();
  await page.goto(proxy.url + "vanillatd.html?play", {waitUntil: "domcontentloaded", timeout: 180000});
  await page.waitForFunction(() => document.body.dataset.runtime === "ready", null, {timeout: 180000});
  const ready = Date.now() - t0;
  await page.locator("#play-stock").click();
  await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-game] menu.enter"),
    null, {timeout: 240000});
  const menu = Date.now() - t0;
  // Let in-flight transfers finish so their sizes are counted.
  await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({path: path.join(outDir, "site-budget-" + browserName + "-" + label + ".png")});
  await page.close();
  return {label, timeToRuntimeReadyMs: ready, timeToMenuMs: menu, receivedBytes: proxy.stats.bytes,
    requests: proxy.stats.requests, notModified: proxy.stats.notModified,
    dataRequests: proxy.stats.dataRequests, dataBytes: proxy.stats.dataBytes, pageErrors: errors};
}

async function measureBrowser(proxy, browserName) {
  // A fresh on-disk profile, so the repeat visit uses a real disk cache. An
  // in-memory (incognito-style) context cannot hold the large WebAssembly
  // file and re-downloaded it (run 45726607953), unlike a visitor's browser.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "site-budget-" + browserName + "-"));
  const context = await playwright[browserName].launchPersistentContext(profile,
    {headless: true, args: browserName === "chromium" ? ["--no-sandbox"] : [], viewport: {width: 1100, height: 900}});
  try {
    const firstVisit = await visit(context, proxy, browserName, "first");
    const repeatVisit = await visit(context, proxy, browserName, "repeat");
    const check = (value, budget) => ({value, budget, within: value <= budget});
    return {firstVisit, repeatVisit, results: {
      firstVisitTransferBytes: check(firstVisit.receivedBytes, BUDGETS.firstVisitTransferBytes),
      repeatVisitTransferBytes: check(repeatVisit.receivedBytes, BUDGETS.repeatVisitTransferBytes),
      firstVisitTimeToMenuMs: check(firstVisit.timeToMenuMs, BUDGETS.firstVisitTimeToMenuMs),
      repeatVisitTimeToMenuMs: check(repeatVisit.timeToMenuMs, BUDGETS.repeatVisitTimeToMenuMs),
    }};
  } finally {
    await context.close();
    fs.rmSync(profile, {recursive: true, force: true});
  }
}

function mb(n) { return (n / 1024 / 1024).toFixed(2) + " MB"; }
function sec(ms) { return (ms / 1000).toFixed(1) + " s"; }

async function main() {
  fs.mkdirSync(outDir, {recursive: true});
  const reportOnly = process.env.SITE_BUDGET_REPORT_ONLY === "1";
  const report = {schema: 2, site: base, measuredAt: new Date().toISOString(),
    sha: process.env.GITHUB_SHA || "local", throttle: THROTTLE, budgets: BUDGETS, browsers: {}};
  const files = await measureFiles();
  report.siteCommit = files.commit;
  report.files = files.files;
  const sum = (list, key) => list.reduce((n, f) => n + f[key], 0);
  report.totals = {files: files.files.length, rawBytes: sum(files.files, "bytes"), sentBytes: sum(files.files, "sent"),
    byEncoding: files.files.reduce((m, f) => { m[f.encoding] = (m[f.encoding] || 0) + f.sent; return m; }, {})};
  const proxy = await startProxy();
  const failures = [];
  try {
    for (const name of browsers) {
      try {
        report.browsers[name] = await measureBrowser(proxy, name);
      } catch (e) {
        report.browsers[name] = {error: String(e.stack || e)};
        failures.push(name + ": measurement failed: " + String(e.message || e).split("\n")[0]);
      }
    }
  } finally {
    proxy.server.close();
  }
  const over = [];
  for (const [name, r] of Object.entries(report.browsers)) {
    if (!r.results) continue;
    for (const [k, v] of Object.entries(r.results)) if (!v.within) over.push(name + "." + k);
    const errors = r.firstVisit.pageErrors.concat(r.repeatVisit.pageErrors);
    if (errors.length) failures.push(name + ": page errors: " + errors.join(" | "));
  }
  report.overBudget = over;
  fs.writeFileSync(path.join(outDir, "site-budget.json"), JSON.stringify(report, null, 1) + "\n");

  const cell = (r, key, fmt) => r.results ? fmt(r.results[key].value) + (r.results[key].within ? "" : " **over**") : "error";
  const largest = [...files.files].sort((a, b) => b.sent - a.sent).slice(0, 12);
  const lines = [
    "## Play site budget" + (reportOnly ? " (report only)" : ""),
    "",
    "Site `" + base + "` (commit `" + String(files.commit).slice(0, 12) + "`), " +
      "through a local proxy paced to 20 Mbps with 40 ms latency.",
    "",
    "| Browser | First-visit transfer | Repeat-visit transfer | Time to menu, first | Time to menu, repeat |",
    "| --- | ---: | ---: | ---: | ---: |",
    "| _Budget_ | " + mb(BUDGETS.firstVisitTransferBytes) + " | " + mb(BUDGETS.repeatVisitTransferBytes) + " | " +
      sec(BUDGETS.firstVisitTimeToMenuMs) + " | " + sec(BUDGETS.repeatVisitTimeToMenuMs) + " |",
    ...Object.entries(report.browsers).map(([name, r]) => "| " + name + " | " +
      cell(r, "firstVisitTransferBytes", mb) + " | " + cell(r, "repeatVisitTransferBytes", mb) + " | " +
      cell(r, "firstVisitTimeToMenuMs", sec) + " | " + cell(r, "repeatVisitTimeToMenuMs", sec) + " |"),
    "",
    ...Object.entries(report.browsers).filter(([, r]) => r.results).map(([name, r]) =>
      "- " + name + " requests: first visit " + r.firstVisit.requests + " (" + r.firstVisit.dataRequests +
      " for data/, " + mb(r.firstVisit.dataBytes) + "); repeat visit " + r.repeatVisit.requests + " (" +
      r.repeatVisit.dataRequests + " for data/, " + r.repeatVisit.notModified + " not modified). " +
      "Engine ready after " + sec(r.firstVisit.timeToRuntimeReadyMs) + " / " + sec(r.repeatVisit.timeToRuntimeReadyMs) +
      " (first / repeat); Play to menu " + sec(r.firstVisit.timeToMenuMs - r.firstVisit.timeToRuntimeReadyMs) + " / " +
      sec(r.repeatVisit.timeToMenuMs - r.repeatVisit.timeToRuntimeReadyMs) + "."),
    "",
    "Site files: " + report.totals.files + ", " + mb(report.totals.rawBytes) + " raw, " + mb(report.totals.sentBytes) +
      " as served. Served bytes by encoding: " +
      Object.entries(report.totals.byEncoding).map(([k, v]) => k + " " + mb(v)).join(", ") + ".",
    "",
    "| Largest files as served | Raw | Sent | Encoding |",
    "| --- | ---: | ---: | --- |",
    ...largest.map(f => "| `" + f.path + "` | " + mb(f.bytes) + " | " + mb(f.sent) + " | " + f.encoding + " |"),
    "",
  ];
  const summary = lines.join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
  if (over.length) {
    console.error("Over budget: " + over.join(", ") + (reportOnly ? " (report only, not failing)" : ""));
    if (!reportOnly) process.exitCode = 1;
  }
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
