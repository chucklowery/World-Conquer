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

async function clickNativeTile(canvas,x,y){
  // Emscripten scales the 720x440 SDL canvas to the CSS layout. Use the
  // displayed dimensions so far-edge tiles remain clickable at any viewport.
  const bounds=await canvas.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {width:rect.width,height:rect.height};
  });
  await canvas.click({position:{x:(x+0.5)*bounds.width/18,y:(y+0.5)*bounds.height/11}});
}

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
    assert((await page.locator("#log").textContent()).includes("engine world plan=ready cells=198 walls=14"),
           "Courier mission could not stage a bounded VanillaTD cell footprint");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] engine MapClass terrain=staged"),
           "Courier terrain was not written and read back through engine MapClass cells");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] verified HD aircraft texture=loaded"),
           "Verified Courier RGBA texture was not loaded by native C++ renderer");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] tactical infantry sprite=loaded"),
           "Original infantry SHP was not resolved and rendered by CC_Draw_Shape");
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] tactical terrain sprite=loaded"),
           "Original terrain SHP was not resolved and rendered by CC_Draw_Shape");
    const nativeCanvas=page.locator("#canvas");
    const nativeBefore=await nativeCanvas.screenshot();
    await nativeCanvas.click({position:{x:60,y:100}}); // scout at (1,2)
    await nativeCanvas.click({position:{x:140,y:100}}); // issue a reachable eastward move
    await page.waitForFunction(() => /\[browser-native-slice\] click x=\d+ y=2 selected=0 route=[1-9]/.test(
      document.getElementById("log").textContent),
                               undefined,{timeout:15000});
    assert((await page.locator("#log").textContent()).includes("[browser-native-slice] engine CELL target="),
           "Native mission did not encode its destination as a VanillaTD cell TARGET");
    await page.waitForTimeout(800);
    const nativeAfter=await nativeCanvas.screenshot();
    assert(!nativeBefore.equals(nativeAfter),"Native C++ unit did not move");
    await page.keyboard.press("r");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] mission restarted"),
                               undefined,{timeout:15000});
    assert.equal(await page.locator("body").getAttribute("data-mode"),"native-slice");
    messages.push("PASS: original-content tactical mission moves and restarts inside real VanillaTD WASM executable");
    // Separately allocate one real production house and E1 infantry in limbo.
    // This intentionally avoids Unlimbo/AI while the complete theater lifecycle
    // is being integrated; do not run on the already-started Courier instance.
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready",undefined,{timeout:90000});
    await page.locator("#run-unit-probe").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-unit-probe] native house=created infantry=created"),
                               undefined,{timeout:40000});
    assert((await page.locator("#log").textContent()).includes("on-map=yes"),
           "Native infantry diagnostic did not place a real infantry on MapClass");
    messages.push("PASS: original VanillaTD HouseClass and InfantryClass allocated and placed on the real map");
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready",undefined,{timeout:90000});
    assert.equal(await page.locator("#launch-alpha").isEnabled(),true,"Tactical Alpha launch button is disabled");
    await page.locator("#launch-alpha").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] movement source=InfantryClass::AI"),
                               undefined,{timeout:40000});
    await page.waitForFunction(() => window.WCRTS && window.WCRTS.latest() && window.WCRTS.latest().tick>=0,
                               undefined,{timeout:15000});
    const initialContract=await page.evaluate(()=>{
      const s=WCRTS.latest();
      return {version:s.version,tick:s.tick,dimensions:[s.map.width,s.map.height],
        walls:s.map.terrain.filter(t=>t===1).length,ids:s.entities.map(e=>e.id),
        owner:s.entities[0].ownerId,team:s.entities[0].teamId,
        selected:s.selectedEntityId,readonly:Object.isFrozen(s)&&Object.isFrozen(s.entities[0])};
    });
    assert.equal(initialContract.version,1);
    assert.deepEqual(initialContract.dimensions,[18,11]);
    assert.equal(initialContract.walls,14);
    assert.deepEqual(initialContract.ids,[1001,1002,2001,2002,3001,3002,4001]);
    assert.equal(initialContract.owner,1);
    assert.equal(initialContract.team,1);
    assert.equal(initialContract.selected,1001);
    assert.equal(initialContract.readonly,true);
    assert.equal(await page.locator("#tactical-hud").isVisible(),true,"In-game HUD did not open");
    assert.equal(await page.locator("#hud-build-panel").isVisible(),true,"Production sidebar was not visible");
    const layout=await page.evaluate(()=>{
      const rect=id=>document.getElementById(id).getBoundingClientRect();
      const field=rect("hud-playfield"),side=rect("hud-sidebar"),map=rect("hud-minimap"),build=rect("hud-build-panel");
      const canvas=rect("canvas");
      return {fieldRight:field.right,sideLeft:side.left,mapBottom:map.bottom,buildTop:build.top,
              canvasAspect:canvas.width/canvas.height,viewportWidth:innerWidth,viewportHeight:innerHeight,
              hudHeight:rect("tactical-hud").height};
    });
    assert(layout.fieldRight<=layout.sideLeft+2,"The battlefield and sidebar overlap");
    assert(layout.mapBottom<layout.buildTop,"Minimap must sit above building options");
    assert(Math.abs(layout.canvasAspect-18/11)<0.025,"Scaled game canvas lost its mission aspect ratio");
    assert.equal(Math.round(layout.hudHeight),layout.viewportHeight,"HUD does not use the entire viewport");
    await page.setViewportSize({width:720,height:480});
    await page.waitForFunction(() => document.getElementById("tactical-hud").classList.contains("sidebar-closed"),
                               undefined,{timeout:15000});
    const compact=await page.evaluate(()=>{
      const hud=document.getElementById("tactical-hud").getBoundingClientRect();
      const field=document.getElementById("canvas").getBoundingClientRect();
      return {height:hud.height,width:hud.width,aspect:field.width/field.height};
    });
    assert.equal(Math.round(compact.height),480,"Compact HUD must fill the browser viewport");
    assert.equal(Math.round(compact.width),720);
    assert(Math.abs(compact.aspect-18/11)<0.025,"Compact battlefield lost aspect ratio");
    await page.setViewportSize({width:1360,height:980});
    await page.waitForFunction(() => !document.getElementById("tactical-hud").classList.contains("sidebar-closed"),
                               undefined,{timeout:15000});
    await page.locator("#hud-tab-intel").click();
    assert.equal(await page.locator("#hud-intel-panel").isVisible(),true,"Sidebar intel navigation failed");
    await page.locator("#hud-tab-build").click();
    await page.locator('[data-build="relay"]').click();
    assert((await page.locator("#hud-build-detail").textContent()).includes("Placement is not yet enabled"),
           "Build option implied construction is already available");
    await page.locator("#hud-sidebar-toggle").click();
    assert.equal(await page.locator("#hud-sidebar").isVisible(),false,"Sidebar did not collapse");
    await page.locator("#hud-sidebar-toggle").click();
    assert.equal(await page.locator("#hud-sidebar").isVisible(),true,"Sidebar did not reopen");
    const engineCanvas=page.locator("#canvas");
    const minimapBefore=await page.locator("#hud-minimap").screenshot();
    // Rejection is an event, with no destination dispatch or gameplay mutation.
    const beforeInvalid=await page.evaluate(()=>{
      const s=WCRTS.latest();return {selected:s.selectedEntityId,
        scout:s.entities.find(e=>e.id===1001)};
    });
    await clickNativeTile(engineCanvas,5,2); // authored wall
    await page.waitForFunction(() => WCRTS.eventHistory().some(e=>e.type==="command"&&e.code==="blocked"),
                               undefined,{timeout:15000});
    const afterInvalid=await page.evaluate(()=>{
      const s=WCRTS.latest();return {selected:s.selectedEntityId,
        scout:s.entities.find(e=>e.id===1001)};
    });
    assert.deepEqual(afterInvalid,beforeInvalid,"Rejected wall order corrupted native infantry/selection");
    await clickNativeTile(engineCanvas,1,2);
    await clickNativeTile(engineCanvas,3,2);
    await page.waitForFunction(() => /\[browser-engine-courier\] live orders=[1-9]\d* nav-cell=\d+/.test(
      document.getElementById("log").textContent),undefined,{timeout:15000});
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] moved unit=0"),
                               undefined,{timeout:45000});
    await page.waitForFunction(()=>WCRTS.latest().entities.find(e=>e.id===1001).x>1,
                               undefined,{timeout:15000});
    const nativeParity=await page.evaluate(()=>{
      const e=WCRTS.latest().entities.find(u=>u.id===1001);
      const moves=[...document.getElementById("log").textContent.matchAll(/\[browser-engine-courier\] moved unit=0 x=(\d+) y=(\d+)/g)];
      const match=moves[moves.length-1];
      return {snapshot:[e.x,e.y],native:match&&[Number(match[1]),Number(match[2])],
        selected:WCRTS.latest().selectedEntityId,version:WCRTS.latest().version,
        tick:WCRTS.latest().tick,uiVersion:document.getElementById("engine-courier-status").dataset.snapshotVersion};
    });
    assert.deepEqual(nativeParity.snapshot,nativeParity.native,"HUD snapshot diverged from live InfantryClass position");
    assert.equal(nativeParity.selected,1001);
    assert.equal(nativeParity.version,1);
    assert.equal(nativeParity.uiVersion,"1");
    assert(nativeParity.tick>0);
    const minimapAfter=await page.locator("#hud-minimap").screenshot();
    assert(!minimapBefore.equals(minimapAfter),"Live minimap did not follow native unit movement");
    await clickNativeTile(engineCanvas,7,2); // first supply crate
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] crates=1/2"),
                               undefined,{timeout:120000});
    await clickNativeTile(engineCanvas,15,4); // second crate
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] crates=2/2"),
                               undefined,{timeout:120000});
    await clickNativeTile(engineCanvas,16,8); // approach extraction
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-native-slice] result=victory"),
                               undefined,{timeout:120000});
    assert((await page.locator("#alpha-result").textContent()).includes("Mission accomplished"),
           "Engine-owned mission victory was not visible in the browser HUD");
    assert.equal(await page.locator("#alpha-result").isVisible(),true,
                 "Victory panel did not become visible");
    await page.keyboard.press("r");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] mission restarted"),
                               undefined,{timeout:15000});
    await page.waitForFunction(()=>WCRTS.eventHistory().some(e=>e.type==="restart"),
                               undefined,{timeout:15000});
    assert.deepEqual(await page.evaluate(()=>{
      const s=WCRTS.latest(),scout=s.entities.find(e=>e.id===1001);
      return {selected:s.selectedEntityId,cargo:s.cargo,x:scout.x,y:scout.y};
    }),{selected:1001,cargo:0,x:1,y:2},"Restart did not republish the canonical initial state");
    assert((await page.locator("#engine-courier-status").textContent()).includes("Cargo 0/2"),
           "Engine-owned mission HUD did not reset after restart");
    assert.equal(await page.locator("#alpha-result").isHidden(),true,
                 "Victory panel did not clear on restart");
    // R01: the same compiled native mission now accepts two selected actors,
    // uses browser camera transforms, and routes each command to R00.
    await clickNativeTile(engineCanvas,1,2);
    await page.keyboard.down("Shift");
    await clickNativeTile(engineCanvas,2,3);
    await page.keyboard.up("Shift");
    assert((await page.locator("#hud-selection-text").textContent()).includes("2 selected"),
           "Shift-add did not show both selected infantry");
    await page.keyboard.press("Shift+3");
    await clickNativeTile(engineCanvas,1,2);
    assert((await page.locator("#hud-selection-text").textContent()).includes("1 selected"));
    await page.keyboard.press("3");
    assert((await page.locator("#hud-selection-text").textContent()).includes("2 selected"),
           "Control-group recall did not restore native-identity selection");
    const zoomBefore=await engineCanvas.boundingBox();
    await page.locator("#hud-zoom-in").click();
    const zoomAfter=await engineCanvas.boundingBox();
    assert(zoomAfter.width>zoomBefore.width,"RTS camera zoom failed");
    await page.keyboard.press("ArrowRight");
    const panAfter=await engineCanvas.boundingBox();
    assert(panAfter.x<zoomAfter.x,"Arrow-key pan did not move the world viewport");
    const beforeMinimap=await page.evaluate(()=>WCRTS.eventHistory().filter(e=>e.type==="command").length);
    await page.locator("#hud-minimap").click({position:{x:255,y:100}});
    const afterMinimap=await page.evaluate(()=>WCRTS.eventHistory().filter(e=>e.type==="command").length);
    assert.equal(afterMinimap,beforeMinimap,"Minimap click sent an unwanted native move order");
    await page.locator("#hud-zoom-out").click();
    const beforeGroupMove=await page.evaluate(()=>WCRTS.eventHistory().filter(e=>e.type==="command").length);
    const groundBounds=await engineCanvas.boundingBox();
    await engineCanvas.click({button:"right",position:{x:3.5*groundBounds.width/18,y:2.5*groundBounds.height/11}});
    await page.waitForFunction(count=>WCRTS.eventHistory().filter(e=>e.type==="command").length>=count+2,
                               beforeGroupMove,{timeout:15000});
    const groupMove=await page.evaluate(()=>WCRTS.eventHistory().filter(e=>e.type==="command").slice(-2));
    assert.deepEqual(groupMove.map(e=>e.entityId),[1001,1002],"Multi-move missed an R00 actor");
    assert(groupMove.every(e=>e.code==="accepted"),"R00 rejected the group move");
    await page.keyboard.press("r");
    await page.waitForFunction(()=>WCRTS.eventHistory().filter(e=>e.type==="restart").length>=2,
                               undefined,{timeout:15000});
    messages.push("PASS: R01 selected two native infantry, recalled a group, zoomed/panned, recentered minimap, ordered both and restarted");
    await page.keyboard.press("2");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] selected unit=1"),
                               undefined,{timeout:15000});
    assert((await page.locator("#engine-courier-status").textContent()).includes("Selected: Ranger"));
    await page.keyboard.press("1");
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] selected unit=0"),
                               undefined,{timeout:15000});
    await clickNativeTile(engineCanvas,10,2); // order the scout to attack a real sentry actor
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] attack-order unit=0 enemy=2"),
                               undefined,{timeout:15000});
    await page.waitForFunction(() => /\[browser-engine-courier\] combat unit=2 hp=[0-2]/.test(
      document.getElementById("log").textContent),undefined,{timeout:120000});
    assert((await page.locator("#engine-courier-status").textContent()).includes("Sentries"),
           "Tactical Alpha HUD did not report combat state");
    messages.push("PASS: native infantry recovered crates, extracted, restarted, and attacked a pursuing sentry");
    messages.push("PASS: R00 versioned native snapshots match live infantry and reject wall orders without changing state");
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
