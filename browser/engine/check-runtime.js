#!/usr/bin/env node
// Tests the actual VanillaTD engine's embedded browser diagnostic mode.
// No proprietary EA game files are needed, read, or uploaded.
"use strict";
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const assert = require("node:assert/strict");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "../../build/browser-engine");
const messages = [];
const mime = {".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm"};
const server = http.createServer((req, res) => {
  const filename = decodeURIComponent((req.url || "/").split("?")[0]);
  if (!/^\/[a-zA-Z0-9_.-]+$/.test(filename)) {
    res.writeHead(400); res.end("Invalid path"); return;
  }
  const full = path.join(root, filename.substring(1));
  fs.readFile(full, (err, bytes) => {
    if (err) {res.writeHead(404); res.end("Missing file"); return;}
    res.writeHead(200, {"Content-Type": mime[path.extname(full)] || "application/octet-stream",
                        "Cache-Control": "no-store"});
    res.end(bytes);
  });
});

async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const browser = await chromium.launch({headless: true, args: ["--no-sandbox"]});
  const page = await browser.newPage({viewport: {width: 1360, height: 980}});
  page.on("pageerror", error => messages.push("PAGE ERROR: " + error.stack));
  page.on("console", msg => messages.push("CONSOLE " + msg.type() + ": " + msg.text()));
  try {
    await page.goto("http://127.0.0.1:" + port + "/vanillatd.html", {waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    messages.push("Real VanillaTD WASM runtime initialized");
    await page.locator("#run-probe").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-probe] real VanillaTD module"),
                               undefined, {timeout: 40000});
    const canvas = page.locator("#canvas");
    const before = await canvas.screenshot();
    await page.waitForTimeout(350);
    const after = await canvas.screenshot();
    assert(!before.equals(after), "SDL2 probe canvas did not animate");
    await canvas.click({position: {x: 180, y: 180}});
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-probe] mouse button="),
                               undefined, {timeout: 15000});
    await page.keyboard.press("a");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-probe] key code="),
                               undefined, {timeout: 15000});
    assert.equal(await page.locator("body").getAttribute("data-mode"), "probe");
    const runtimeLog = await page.locator("#log").textContent();
    assert(!runtimeLog.includes("registerOrRemoveHandler"), "SDL2 event listeners failed to bind to #canvas");
    await page.screenshot({path: path.join(root, "browser-probe.png"), fullPage: true});
    messages.push("PASS: canvas animation, mouse click and keyboard input in the real engine module");
  } catch (err) {
    messages.push("FAIL: " + (err.stack || err));
    // Print diagnostic log even when the test fails; CI should not require
    // downloading an artifact just to see the initial browser errors.
    console.error((await page.locator("#log").textContent().catch(() => "(log unavailable)")).slice(-12000));
    try {await page.screenshot({path: path.join(root, "browser-probe.png"), fullPage: true});} catch (_) {}
    throw err;
  } finally {
    messages.push("PAGE LOG: " + await page.locator("#log").textContent().catch(() => "(unavailable)"));
    fs.writeFileSync(path.join(root, "browser-probe.log"), messages.join("\n") + "\n");
    await browser.close();
  }
}
main().catch(err => {console.error(err.stack || err); process.exitCode = 1;})
  .finally(() => {server.close();});
