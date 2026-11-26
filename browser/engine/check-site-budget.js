#!/usr/bin/env node
"use strict";
// M4: measure what a visitor to the published play site downloads and how
// long the game takes to reach its menu, and fail if a roadmap budget is
// exceeded. SITE_BUDGET_REPORT_ONLY=1 reports without failing.
//
//   node browser/engine/check-site-budget.js <site-url> [out-dir]
//
// Two measurements against the live site:
//  1. Per file: every file in site.json is fetched with
//     "Accept-Encoding: br, gzip" without decompressing, giving the bytes
//     the host actually sends and the encoding it chose.
//  2. In Chromium: the play view is loaded with network throttling (20 Mbps
//     down, 5 Mbps up, 40 ms latency), Play is pressed, and the time to the
//     engine's menu and the bytes received (encodedDataLength, from the
//     DevTools protocol) are recorded. A second visit with the same on-disk
//     profile measures what the HTTP cache and the pack loader's Cache
//     Storage save.
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");
const {chromium} = require("playwright");

const base = (process.argv[2] || "").replace(/\/?$/, "/");
const outDir = path.resolve(process.argv[3] || "build/site-budget");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: check-site-budget.js <site-url> [out-dir]");
  process.exit(2);
}

// Roadmap M4 targets (docs/ROADMAP.md).
const BUDGETS = {
  firstVisitTransferBytes: 15 * 1024 * 1024,
  repeatVisitTransferBytes: 100 * 1024,
  firstVisitTimeToMenuMs: 8000,
  repeatVisitTimeToMenuMs: 2000,
};
const THROTTLE = {offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8};

function getRaw(url) {
  // Raw bytes as sent (no decompression), with the response headers.
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, {headers: {"Accept-Encoding": "br, gzip"}}, res => {
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
    const lib = base.startsWith("https:") ? https : http;
    lib.get(base + "site.json", res => {
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

async function visit(context, label) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", THROTTLE);
  let received = 0, requests = 0, fromCache = 0, dataRequests = 0, dataBytes = 0;
  const urls = new Map();
  cdp.on("Network.requestWillBeSent", e => urls.set(e.requestId, e.request.url));
  cdp.on("Network.loadingFinished", e => {
    received += e.encodedDataLength; requests++;
    // Pack files the loader found in Cache Storage make no request at all.
    if ((urls.get(e.requestId) || "").includes("/data/")) { dataRequests++; dataBytes += e.encodedDataLength; }
  });
  cdp.on("Network.requestServedFromCache", () => { fromCache++; });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  const t0 = Date.now();
  await page.goto(base + "vanillatd.html?play", {waitUntil: "domcontentloaded", timeout: 180000});
  await page.waitForFunction(() => document.body.dataset.runtime === "ready", null, {timeout: 180000});
  const ready = Date.now() - t0;
  await page.locator("#play-stock").click();
  await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-game] menu.enter"),
    null, {timeout: 240000});
  const menu = Date.now() - t0;
  // Let in-flight transfers finish so their sizes are counted.
  await page.waitForLoadState("networkidle", {timeout: 30000}).catch(() => {});
  await page.screenshot({path: path.join(outDir, "site-budget-" + label + ".png")});
  await page.close();
  return {label, timeToRuntimeReadyMs: ready, timeToMenuMs: menu, receivedBytes: received,
    requests, servedFromHttpCache: fromCache, dataRequests, dataBytes, pageErrors: errors};
}

function mb(n) { return (n / 1024 / 1024).toFixed(2) + " MB"; }

async function main() {
  fs.mkdirSync(outDir, {recursive: true});
  const report = {schema: 1, site: base, measuredAt: new Date().toISOString(),
    sha: process.env.GITHUB_SHA || "local", throttle: THROTTLE, budgets: BUDGETS};
  const files = await measureFiles();
  report.siteCommit = files.commit;
  report.files = files.files;
  const sum = (list, key) => list.reduce((n, f) => n + f[key], 0);
  report.totals = {files: files.files.length, rawBytes: sum(files.files, "bytes"), sentBytes: sum(files.files, "sent"),
    byEncoding: files.files.reduce((m, f) => { m[f.encoding] = (m[f.encoding] || 0) + f.sent; return m; }, {})};
  // A fresh on-disk profile, so the repeat visit uses a real disk cache. An
  // in-memory (incognito-style) context cannot hold the 27 MB WebAssembly
  // file and re-downloaded it (run 45726607953), unlike a visitor's browser.
  const profile = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "site-budget-"));
  const context = await chromium.launchPersistentContext(profile,
    {headless: true, args: ["--no-sandbox"], viewport: {width: 1100, height: 900}});
  try {
    report.firstVisit = await visit(context, "first");
    report.repeatVisit = await visit(context, "repeat");
  } finally {
    await context.close();
    fs.rmSync(profile, {recursive: true, force: true});
  }
  const check = (value, budget) => ({value, budget, within: value <= budget});
  report.results = {
    firstVisitTransferBytes: check(report.firstVisit.receivedBytes, BUDGETS.firstVisitTransferBytes),
    repeatVisitTransferBytes: check(report.repeatVisit.receivedBytes, BUDGETS.repeatVisitTransferBytes),
    firstVisitTimeToMenuMs: check(report.firstVisit.timeToMenuMs, BUDGETS.firstVisitTimeToMenuMs),
    repeatVisitTimeToMenuMs: check(report.repeatVisit.timeToMenuMs, BUDGETS.repeatVisitTimeToMenuMs),
  };
  const reportOnly = process.env.SITE_BUDGET_REPORT_ONLY === "1";
  const over = Object.entries(report.results).filter(([, r]) => !r.within).map(([k]) => k);
  report.overBudget = over;
  fs.writeFileSync(path.join(outDir, "site-budget.json"), JSON.stringify(report, null, 1) + "\n");

  const largest = [...files.files].sort((a, b) => b.sent - a.sent).slice(0, 12);
  const lines = [
    "## Play site budget" + (reportOnly ? " (report only)" : ""),
    "",
    "Site `" + base + "` (commit `" + String(files.commit).slice(0, 12) + "`), " +
      "throttled to 20 Mbps down / 40 ms in Chromium.",
    "",
    "| Measure | Measured | Target | Within |",
    "| --- | ---: | ---: | :---: |",
    "| First-visit transfer | " + mb(report.firstVisit.receivedBytes) + " | " + mb(BUDGETS.firstVisitTransferBytes) + " | " + (report.results.firstVisitTransferBytes.within ? "yes" : "no") + " |",
    "| Repeat-visit transfer | " + mb(report.repeatVisit.receivedBytes) + " | " + mb(BUDGETS.repeatVisitTransferBytes) + " | " + (report.results.repeatVisitTransferBytes.within ? "yes" : "no") + " |",
    "| Time to menu, first visit | " + (report.firstVisit.timeToMenuMs / 1000).toFixed(1) + " s | 8 s | " + (report.results.firstVisitTimeToMenuMs.within ? "yes" : "no") + " |",
    "| Time to menu, repeat visit | " + (report.repeatVisit.timeToMenuMs / 1000).toFixed(1) + " s | 2 s | " + (report.results.repeatVisitTimeToMenuMs.within ? "yes" : "no") + " |",
    "",
    "Requests: first visit " + report.firstVisit.requests + " (" + report.firstVisit.dataRequests + " for data/, " +
      mb(report.firstVisit.dataBytes) + "); repeat visit " + report.repeatVisit.requests + " (" +
      report.repeatVisit.dataRequests + " for data/, " + mb(report.repeatVisit.dataBytes) + ").",
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
  const errors = report.firstVisit.pageErrors.concat(report.repeatVisit.pageErrors);
  if (errors.length) {
    console.error("Page errors during the measurement:\n" + errors.join("\n"));
    process.exitCode = 1;
  }
  if (over.length) {
    console.error("Over budget: " + over.join(", ") + (reportOnly ? " (report only, not failing)" : ""));
    if (!reportOnly) process.exitCode = 1;
  }
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
