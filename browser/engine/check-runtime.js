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
const mime = {".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".shp": "application/octet-stream"};
const server = http.createServer((req, res) => {
  const filename = decodeURIComponent((req.url || "/").split("?")[0]);
  if (!/^\/[a-zA-Z0-9_./-]+$/.test(filename) || filename.split("/").includes("..") ||
      filename.split("/").includes(".")) {
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
    const sliceCanvas=page.locator("#vertical-slice-canvas");
    const sliceBlank=await sliceCanvas.screenshot();
    await page.locator("#slice-start").click();
    const sliceStarted=await sliceCanvas.screenshot();
    assert(!sliceBlank.equals(sliceStarted), "Standalone mission did not render a map");
    assert((await page.locator("#slice-status").textContent()).includes("Cargo 0/2"));
    await sliceCanvas.click({position:{x:75,y:125}}); // select starting scout
    await sliceCanvas.click({position:{x:175,y:125}}); // order move east
    await page.waitForTimeout(700);
    assert((await page.locator("#slice-status").textContent()).includes("PLAYING"));
    await page.locator("#slice-restart").click();
    assert((await page.locator("#slice-status").textContent()).includes("Cargo 0/2"));
    messages.push("PASS: no-game-data tactical scenario launches, draws and accepts move/restart input");
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
    // A real C++ tactical mission, not the independent JavaScript slice.
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready",undefined,{timeout:90000});
    await page.locator("#run-native-slice").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] C++ tactical mission started"),
                               undefined,{timeout:40000});
    assert((await page.locator("#log").textContent()).includes("verified external mission map loaded"),
           "Native C++ mission did not consume the verified source-controlled map");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] verified HD aircraft texture=loaded"),
           "Verified Courier RGBA texture was not loaded by native C++ renderer");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] tactical infantry sprite=loaded"),
           "Original infantry SHP was not resolved and rendered by CC_Draw_Shape");
    const nativeCanvas=page.locator("#canvas");
    const nativeBefore=await nativeCanvas.screenshot();
    await nativeCanvas.click({position:{x:60,y:100}}); // scout at (1,2)
    await nativeCanvas.click({position:{x:140,y:100}}); // issue a reachable eastward move
    await page.waitForFunction(() => /\[browser-native-slice\] click x=\d+ y=2 selected=0 route=[1-9]/.test(
      document.getElementById("log").textContent),
                               undefined,{timeout:15000});
    await page.waitForTimeout(800);
    const nativeAfter=await nativeCanvas.screenshot();
    assert(!nativeBefore.equals(nativeAfter),"Native C++ unit did not move");
    await page.keyboard.press("r");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] mission restarted"),
                               undefined,{timeout:15000});
    assert.equal(await page.locator("body").getAttribute("data-mode"),"native-slice");
    messages.push("PASS: original-content tactical mission moves and restarts inside real VanillaTD WASM executable");
    // Original project-owned sprite, no EA media: verified HTTP package,
    // manifest SHA-256, MEMFS, C++ indexed SHP decode, and SDL2 texture render.
    await page.reload({waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    const emptyCanvas = await page.locator("#canvas").screenshot();
    await page.locator("#run-shape").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-shape] CC_Draw_Shape rendered original tactical SHP via engine buffer"),
                               undefined, {timeout: 40000});
    await page.waitForTimeout(250);
    const renderedCanvas = await page.locator("#canvas").screenshot();
    assert(!emptyCanvas.equals(renderedCanvas), "Original shape was not rendered to canvas");
    assert.equal(await page.locator("body").getAttribute("data-mode"), "shape");
    messages.push("PASS: original sample SHP loaded with integrity check and rendered by engine SDL2 diagnostic");
    // HD canvas is deliberately separate from the C++ tactical SHP renderer.
    await page.reload({waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    await page.locator("#load-cargo-hd").click();
    await page.waitForFunction(() => document.getElementById("cargo-hd-status").textContent.includes("heading 1/32"),
                               undefined, {timeout: 60000});
    const hdBefore = await page.locator("#cargo-hd-canvas").screenshot();
    await page.locator("#cargo-next").click();
    const hdAfter = await page.locator("#cargo-hd-canvas").screenshot();
    assert(!hdBefore.equals(hdAfter), "HD heading switch did not update the canvas");
    await page.locator("#cargo-ramp").click();
    assert((await page.locator("#cargo-hd-status").textContent()).includes("ramp 1/4"));
    assert.equal(await page.locator("body").getAttribute("data-mode"), "idle",
                 "HD preview must not launch the native game or change its mode");
    messages.push("PASS: HD SHA-verified 512x512 directional/ramp canvas rendering independent of native engine");
    // Six project-owned wireframes loaded by manifest/roster, SHA-256 verified,
    // resolved by CCFileClass and actually drawn with CC_Draw_Shape.
    await page.reload({waitUntil: "domcontentloaded", timeout: 90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready", undefined, {timeout: 90000});
    const blankRoster = await page.locator("#canvas").screenshot();
    await page.locator("#run-wireframes").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-wireframes] rendered 6 original placeholder shapes via native engine"),
                               undefined, {timeout: 40000});
    await page.waitForTimeout(250);
    const renderedRoster = await page.locator("#canvas").screenshot();
    assert(!blankRoster.equals(renderedRoster), "Six-class wireframe roster did not render to canvas");
    const rosterLog = await page.locator("#log").textContent();
    const expectedContracts=JSON.parse(fs.readFileSync(path.join(root,"wireframes/contracts.json"),"utf8"));
    for(const {engineFilename:filename, diagnosticActionFrame:stateFrame} of expectedContracts.assets){
      const line=rosterLog.split("\n").find(entry=>entry.includes("[browser-wireframes] CC_Draw_Shape " + filename + " "));
      assert(line && line.includes("state-frame=" + stateFrame + " pixels="), filename + " action frame was not drawn by engine");
      assert(await page.evaluate(filename => Module.FS.analyzePath("/game/" + filename).exists, filename), filename + " missing from MEMFS");
    }
    assert(rosterLog.includes("verified and staged 7 shapes and palette"), "Separate buildup SHP was not staged");
    assert(await page.evaluate(() => Module.FS.analyzePath("/game/FACTMAKE.SHP").exists),
           "FACTMAKE.SHP missing from MEMFS");
    assert.equal(await page.locator("body").getAttribute("data-mode"), "wireframes");
    await page.screenshot({path: path.join(root, "browser-probe.png"), fullPage: true});
    messages.push("PASS: manifest-verified six-class base and action frames rendered by actual VanillaTD CC_Draw_Shape");
    // Direct-launch build uses the same checksum-verified mission pack without WASM.
    await page.goto("http://127.0.0.1:"+port+"/play.html",{waitUntil:"domcontentloaded",timeout:30000});
    await page.locator("#start").click();
    await page.waitForFunction(() => document.getElementById("status").textContent.includes("PLAYING"),
                               undefined,{timeout:20000});
    assert((await page.locator("#status").textContent()).includes("Supplies 0/2"));
    await page.locator("#restart").click();
    assert((await page.locator("#status").textContent()).includes("Supplies 0/2"));
    messages.push("PASS: direct-launch static browser mission and restart without WASM or proprietary media");
    // Synthetic stand-ins exercise MEMFS and the real C++ file search,
    // but are NOT game assets and cannot prove archive/mission validity.
    await page.goto("http://127.0.0.1:" + port + "/vanillatd.html", {waitUntil: "domcontentloaded", timeout: 90000});
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
