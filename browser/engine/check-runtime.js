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
    // A second browser session tests an ordinary synchronous C++ while loop
    // suspended with Asyncify, rather than emscripten_set_main_loop().
    await page.reload({waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    await page.evaluate(() => {
      window.__heartbeat = 0;
      window.__heartbeatInterval = setInterval(() => { window.__heartbeat++; }, 40);
    });
    await page.locator("#run-cooperative").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-cooperative] synchronous loop started"),
                               undefined, {timeout: 40000});
    const heartbeatBefore = await page.evaluate(() => window.__heartbeat);
    const coopBefore = await canvas.screenshot();
    await page.waitForTimeout(400);
    const heartbeatAfter = await page.evaluate(() => window.__heartbeat);
    const coopAfter = await canvas.screenshot();
    assert(heartbeatAfter > heartbeatBefore + 1,
           "JavaScript heartbeat stopped while synchronous C++ loop was active");
    assert(!coopBefore.equals(coopAfter), "Cooperative C++ loop canvas stopped animating");
    await canvas.click({position: {x: 200, y: 180}});
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-cooperative] mouse button="),
                               undefined, {timeout: 15000});
    await page.keyboard.press("b");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-cooperative] key code="),
                               undefined, {timeout: 15000});
    assert.equal(await page.locator("body").getAttribute("data-mode"), "cooperative");
    await page.screenshot({path: path.join(root, "browser-probe.png"), fullPage: true});
    messages.push("PASS: synchronous C++ loop yielded to JavaScript heartbeat and SDL2 mouse/keyboard input");
    // Synthetic stand-ins exercise MEMFS and the real C++ file search,
    // but are NOT game assets and cannot prove archive/mission validity.
    await page.reload({waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    assert.equal(await page.locator("#run-game").isDisabled(), true);
    await page.locator("#select-files").setInputFiles([
      {name:"CONQUER.MIX", mimeType:"application/octet-stream", buffer:Buffer.from([1,2,3,4])},
      {name:"CCLOCAL.MIX", mimeType:"application/octet-stream", buffer:Buffer.from([1,2,3,4])},
      {name:"GENERAL.MIX", mimeType:"application/octet-stream", buffer:Buffer.from([1,2,3,4])}
    ]);
    await page.waitForFunction(() => document.querySelector("#asset-status").dataset.ready === "true",
                               undefined, {timeout: 20000});
    assert.equal(await page.locator("#run-game").isEnabled(), true);
    assert.equal(await page.evaluate(() => Module.FS.analyzePath("/game/CONQUER.MIX").exists), true);
    assert.equal(await page.evaluate(() => Module.FS.analyzePath("/game/GENERAL.MIX").exists), true);
    await page.locator("#run-asset-probe").click();
    await page.waitForFunction(() => {
      const text = document.getElementById("log").textContent;
      return text.includes("[browser-assets] CONQUER.MIX=1") &&
             text.includes("[browser-assets] LOCAL-or-CCLOCAL.MIX=1") &&
             text.includes("[browser-assets] GENERAL.MIX=1");
    }, undefined, {timeout: 25000});
    const assetLog = await page.locator("#log").textContent();
    assert(assetLog.includes("path lookup only"), "Engine must distinguish path check from asset integrity");
    await page.screenshot({path: path.join(root, "browser-probe.png"), fullPage: true});
    messages.push("PASS: synthetic file staging resolved through real engine CCFileClass search");


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
