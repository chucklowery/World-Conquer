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
// Upload comparable per-map measurements alongside the browser probe. A
// requestAnimationFrame interval is UI responsiveness telemetry, not the
// duration of a native simulation tick or an approved performance budget.
const r20Metrics = {schemaVersion:1, sha:process.env.GITHUB_SHA||"local",
  runId:process.env.GITHUB_RUN_ID||"local",
  runAttempt:Number(process.env.GITHUB_RUN_ATTEMPT||0),
  status:"incomplete", maps:[]};
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

async function clickNativeTile(canvas,x,y,width=18,height=11){
  // Emscripten scales the native SDL canvas to the CSS layout. Use the
  // displayed dimensions so far-edge tiles remain clickable at any viewport.
  const bounds=await canvas.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {width:rect.width,height:rect.height};
  });
  await canvas.click({position:{x:(x+0.5)*bounds.width/width,y:(y+0.5)*bounds.height/height}});
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
      const overlay=getComputedStyle(document.getElementById("hud-selection-overlay"));
      return {fieldRight:field.right,sideLeft:side.left,mapBottom:map.bottom,buildTop:build.top,
              canvasAspect:canvas.width/canvas.height,viewportWidth:innerWidth,viewportHeight:innerHeight,
              hudHeight:rect("tactical-hud").height,overlayBackground:overlay.backgroundColor,
              overlayBorder:overlay.borderTopWidth,overlayMargin:overlay.marginTop};
    });
    assert(layout.fieldRight<=layout.sideLeft+2,"The battlefield and sidebar overlap");
    assert(layout.mapBottom<layout.buildTop,"Minimap must sit above building options");
    assert(Math.abs(layout.canvasAspect-18/11)<0.025,"Scaled game canvas lost its mission aspect ratio");
    assert.equal(layout.overlayBackground,"rgba(0, 0, 0, 0)","Selection overlay obscures the native battlefield");
    assert.equal(layout.overlayBorder,"0px","Selection overlay has an inherited canvas border");
    assert.equal(layout.overlayMargin,"0px","Selection overlay inherited canvas margin and shifted coordinates");
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
    await page.screenshot({path:path.join(root,"r01-compact.png")});
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
    await page.screenshot({path:path.join(root,"r01-desktop.png")});
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
    const beforeAttack=await page.evaluate(()=>({
      tick:WCRTS.latest().tick,
      eventCount:WCRTS.eventHistory().length
    }));
    await clickNativeTile(engineCanvas,10,2); // order the scout to attack a real sentry actor
    await page.waitForFunction(() => document.getElementById("log").textContent.includes("[browser-engine-courier] attack-order unit=0 enemy=2"),
                               undefined,{timeout:15000});
    await page.waitForFunction(before=>{
      const current=WCRTS.latest(),fresh=WCRTS.eventHistory().slice(before.eventCount);
      return current.tick>before.tick&&current.entities.find(e=>e.id===2001).hp<3&&
        fresh.some(e=>e.type==="damage"&&e.entityId===2001&&e.sourceId===1001);
    },beforeAttack,{timeout:120000});
    const combatEvidence=await page.evaluate(before=>({
      events:WCRTS.eventHistory().slice(before.eventCount).filter(e=>
        ["shot","hit","damage","death"].includes(e.type)),
      sentryHP:WCRTS.latest().entities.find(e=>e.id===2001).hp,
      hud:document.getElementById("engine-courier-status").textContent
    }),beforeAttack);
    assert(combatEvidence.events.some(e=>e.type==="shot"&&e.sourceId===1001&&e.weaponId===1));
    assert(combatEvidence.events.some(e=>e.type==="hit"&&e.entityId===2001));
    assert(combatEvidence.events.some(e=>e.type==="damage"&&e.value===1));
    assert(combatEvidence.sentryHP<=2&&combatEvidence.hud.includes("Sentries"));
    assert((await page.locator("#engine-courier-status").textContent()).includes("Sentries"),
           "Tactical Alpha HUD did not report combat state");
    messages.push("PASS: native infantry recovered crates, extracted, restarted, and attacked a pursuing sentry");
    messages.push("PASS: R00 versioned native snapshots match live infantry and reject wall orders without changing state");
    // R02: entirely separate, real four-InfantryClass command mode. Native
    // C++ A* reserves waypoints, MapClass supplies terrain, and Infantry AI
    // changes actual positions. The existing Courier regression above remains.
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready",undefined,{timeout:90000});
    await page.locator("#run-r02-orders").click();
    await page.waitForFunction(() => document.getElementById("log").textContent.includes(
      "[r02] navigation=bounded-A* movement=InfantryClass::AI terrain=MapClass"),
      undefined,{timeout:45000});
    assert((await page.locator("#log").textContent()).includes("[r02] production infantry=4 on-map=ready"));
    assert.equal(await page.locator("body").getAttribute("data-mode"),"r02-orders");
    assert.equal(await page.locator(".hud-command-bar").isVisible(),false,
      "R01 command toolbar intercepted the independent R02 native battlefield");
    assert.equal(await page.locator(".hud-pan-pad").isVisible(),false,
      "R01 camera buttons covered R02 native input tiles");
    const r02Canvas=page.locator("#canvas");
    await clickNativeTile(r02Canvas,5,2);
    await page.waitForFunction(() => WCRTS.eventHistory().some(e=>e.type==="command"&&e.code==="blocked"),
      undefined,{timeout:15000});
    const commands=[
      {unit:"1",target:[15,1]},
      {unit:"2",target:[15,3]},
      {unit:"3",target:[14,8],attack:true},
      {unit:"4",target:[15,9],patrol:true}
    ];
    for(const c of commands){
      await page.keyboard.press(c.unit);
      if(c.patrol)await page.keyboard.press("p");
      if(c.attack)await page.keyboard.down("Shift");
      await clickNativeTile(r02Canvas,...c.target);
      if(c.attack)await page.keyboard.up("Shift");
    }
    await page.waitForFunction(()=>WCRTS.latest().commandStates.length===4 &&
      WCRTS.latest().commandStates.some(o=>o.kind==="attack_move") &&
      WCRTS.latest().commandStates.some(o=>o.kind==="patrol"),undefined,{timeout:15000});
    await page.waitForFunction(()=>WCRTS.latest().entities.filter(e=>e.kind==="infantry"&&e.x>=7).length===4,
      undefined,{timeout:150000});
    const crossed=await page.evaluate(()=>{
      const s=WCRTS.latest();
      return {units:s.entities.filter(e=>e.kind==="infantry").map(e=>[e.id,e.x,e.y]),
        states:s.commandStates,budgetLog:document.getElementById("log").textContent.includes("[r02] budget searches="),
        immutable:Object.isFrozen(s.commandStates)};
    });
    assert.equal(new Set(crossed.units.map(e=>e[1]+","+e[2])).size,4,"Production units phased into a shared cell");
    assert(crossed.budgetLog,"No native bounded-search telemetry");
    assert(crossed.immutable,"R02 state did not use the immutable R00 snapshot bridge");
    await page.keyboard.press("1");
    await page.keyboard.press("h");
    await page.waitForFunction(()=>WCRTS.latest().commandStates[0].status==="holding",
      undefined,{timeout:15000});
    await page.keyboard.press("2");
    await page.keyboard.press("g");
    const third=await page.evaluate(()=>{
      const u=WCRTS.latest().entities.find(e=>e.id===1003);return [u.x,u.y];
    });
    await clickNativeTile(r02Canvas,...third);
    await page.waitForFunction(()=>WCRTS.latest().commandStates[1].kind==="guard",
      undefined,{timeout:15000});
    await page.keyboard.press("3");
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>WCRTS.latest().commandStates[2].status==="idle",
      undefined,{timeout:15000});
    await page.screenshot({path:path.join(root,"r02-orders.png"),fullPage:true});
    await page.keyboard.press("r");
    await page.waitForFunction(()=>WCRTS.eventHistory().some(e=>e.type==="restart"),
      undefined,{timeout:15000});
    assert.deepEqual(await page.evaluate(()=>WCRTS.latest().entities.map(e=>[e.x,e.y])),
      [[1,2],[2,3],[1,4],[2,5]],"R02 restart did not reset native unit positions");
    messages.push("PASS: R02 four real production units crossed obstacles with bounded A*, command states, hold/guard/stop/restart and no phasing");
    // R04: load both new maps into the *real* browser WASM engine. Terrain,
    // infantry and HUD/minimap must all read native state, including restart.
    for(const item of [
      {id:"ridge-pass",width:16,height:10,scout:[1,2],destination:[2,2],wall:[8,1]},
      {id:"marsh-border",width:24,height:14,scout:[1,1],destination:[3,1],wall:[3,4]}
    ]){
      await page.reload({waitUntil:"domcontentloaded",timeout:90000});
      await page.waitForFunction(()=>document.body.dataset.runtime==="ready"&&
        document.getElementById("map-choice").options.length===3,undefined,{timeout:90000});
      await page.locator("#map-choice").selectOption(item.id);
      await page.locator("#launch-alpha").click();
      await page.waitForFunction(id=>window.WCRTS&&WCRTS.latest()?.map.id===id,item.id,{timeout:60000});
      const native=await page.evaluate(()=>{
        const s=WCRTS.latest(),m=s.map;
        return {version:s.version,id:m.id,size:[m.width,m.height],tiles:m.tiles.length,
          costs:m.costs,resources:m.resources.length,bases:m.bases.length,
          units:s.entities.filter(e=>e.kind==="infantry").map(e=>[e.x,e.y]),
          canvas:[document.getElementById("canvas").width,document.getElementById("canvas").height],
          minimap:[document.getElementById("hud-minimap").width,document.getElementById("hud-minimap").height]};
      });
      assert.equal(native.version,2);
      assert.equal(native.id,item.id);
      assert.deepEqual(native.size,[item.width,item.height]);
      assert.deepEqual(native.canvas,[item.width*40,item.height*40]);
      assert.deepEqual(native.minimap,[item.width*20,item.height*20]);
      assert.equal(native.tiles,item.width*item.height);
      assert.equal(native.resources,2);assert.equal(native.bases,2);
      assert(native.costs.includes(2)&&native.costs.includes(3)&&native.costs.includes(0));
      assert.deepEqual(native.units[0],item.scout);
      const log=await page.locator("#log").textContent();
      assert(log.includes(`engine world plan=ready cells=${item.width*item.height}`));
      assert(log.includes("engine MapClass terrain=staged"));
      assert(log.includes("movement source=InfantryClass::AI"));
      const tiles=await page.evaluate(wall=>{
        const c=document.getElementById("hud-minimap"),ctx=c.getContext("2d");
        const s=WCRTS.latest(),m=s.map;
        const pixel=(x,y)=>[...ctx.getImageData(x*20+6,y*20+6,1,1).data].slice(0,3);
        return {wall:pixel(wall[0],wall[1]),clear:pixel(0,0),
          mapWall:m.terrain[wall[1]*m.width+wall[0]],
          renderedWidth:c.width,renderedHeight:c.height};
      },item.wall);
      assert.equal(tiles.mapWall,1,"Authored obstruction missing from R00 native snapshot");
      assert.notDeepEqual(tiles.wall,tiles.clear,"Minimap rendered blocked terrain as clear");
      const active=await page.evaluate(async()=>{
        const before=WCRTS.latest().map.id;
        const fetcher=async url=>url.endsWith(".map")?
          {ok:true,arrayBuffer:async()=>new Uint8Array([60,115,99,114,105,112,116,62]).buffer}:fetch(url);
        let rejected=false;
        try{await WCMissionPack.load("missions",fetcher,undefined,before);}
        catch(error){rejected=/checksum mismatch/.test(error.message);}
        return {rejected,map:WCRTS.latest().map.id};
      });
      assert.deepEqual(active,{rejected:true,map:item.id},"Corrupt map changed active WASM mission");
      const field=page.locator("#canvas");
      await clickNativeTile(field,...item.scout,item.width,item.height);
      await clickNativeTile(field,...item.destination,item.width,item.height);
      await page.waitForFunction(goal=>{
        const unit=WCRTS.latest()?.entities.find(e=>e.id===1001);
        return unit?.x===goal[0]&&unit?.y===goal[1];
      },item.destination,{timeout:60000});
      await field.focus();await page.keyboard.press("r");
      await page.waitForFunction(start=>{
        const s=WCRTS.latest(),u=s?.entities.find(e=>e.id===1001);
        return s?.events.some(e=>e.type==="restart")&&u?.x===start[0]&&u?.y===start[1];
      },item.scout,{timeout:20000});
      assert.equal(await page.locator("#hud-map-size").textContent(),`${item.width} × ${item.height}`);
      messages.push(`PASS: ${item.id} ${item.width}x${item.height} validated map loaded in native WASM, traversed, minmap verified, corruption rejected and restarted`);
    }
    // R02/R03/R04 final acceptance: the same live R18 world owns the actors,
    // map and weapons; the actual InfantryClass::AI remains movement authority.
    for(const item of [
      {id:"ridge-pass",size:[16,10],goal:[6,2]},
      {id:"marsh-border",size:[24,14],goal:[3,1]}
    ]){
      await page.reload({waitUntil:"domcontentloaded",timeout:90000});
      await page.waitForFunction(()=>document.body.dataset.runtime==="ready"&&
        document.getElementById("map-choice").options.length===3,undefined,{timeout:90000});
      await page.locator("#map-choice").selectOption(item.id);
      await page.locator("#launch-rts-match").click();
      await page.waitForFunction(id=>WCRTS.latest()?.version===3&&
        WCRTS.latest().map.id===id,item.id,{timeout:60000});
      await page.waitForFunction(()=>document.getElementById("log").textContent.includes(
        "[rts-live] integration=R02+R03+R04 authority=R18 movement=InfantryClass::AI terrain=MapClass"),
        undefined,{timeout:30000});
      const initial=await page.evaluate(()=>{
        const s=WCRTS.latest();
        return {size:[s.map.width,s.map.height],epoch:s.epoch,
          factions:s.houses.map(h=>h.faction),entities:s.entities.map(e=>
            ({id:e.id,def:e.definitionId,visual:e.visualKey,owner:e.ownerId})),
          selected:s.selectedEntityId,commands:s.commandStates.length,
          resources:s.map.resources.length,tiles:s.map.tiles.length};
      });
      assert.deepEqual(initial.size,item.size);
      assert.equal(initial.epoch,1);
      assert.deepEqual(initial.factions,["aster","forge"]);
      assert.equal(initial.commands,6);
      assert.equal(initial.resources,2);
      assert.equal(initial.tiles,item.size[0]*item.size[1]);
      assert.equal(initial.selected,0,"Unselected state must be representable");
      assert.deepEqual(initial.entities.slice(0,4).map(e=>e.owner),[1,1,2,2]);
      assert.equal(initial.entities[0].def,"game.aster.ranger");
      assert.equal(initial.entities[2].def,"game.forge.ranger");
      assert.equal(initial.entities[0].visual,"r05.aster.ranger");
      assert.equal(initial.entities[2].visual,"r05.forge.ranger");
      assert(initial.entities.some(e=>e.owner===0));
      const first=initial.entities[0].id;
      // The native SDL canvas must fit the visible battlefield on a narrow
      // screen, and Courier-only command overlays must not steal click input.
      await page.setViewportSize({width:480,height:720});
      await page.waitForFunction(()=>{
        const c=document.getElementById("canvas").getBoundingClientRect();
        const p=document.getElementById("hud-playfield").getBoundingClientRect();
        return c.width>0&&c.height>0&&c.left>=p.left-1&&c.top>=p.top-1&&
          c.right<=p.right+1&&c.bottom<=p.bottom+1;
      },undefined,{timeout:10000});
      const fitted=await page.evaluate(()=>({
        commands:getComputedStyle(document.querySelector(".hud-command-bar")).display,
        pan:getComputedStyle(document.querySelector(".hud-pan-pad")).display,
        overlay:getComputedStyle(document.getElementById("hud-selection-overlay")).display,
        rect:document.getElementById("canvas").getBoundingClientRect().toJSON()
      }));
      assert(fitted.commands!=="none"&&fitted.pan!=="none"&&fitted.overlay!=="none",
        "Integrated R18 mode must expose the shared R01 input controls");
      const click=await page.evaluate(()=>{
        const rect=document.getElementById("canvas").getBoundingClientRect();
        const e=WCRTS.latest().entities[0],m=WCRTS.latest().map;
        return {x:rect.left+(e.x+.5)/m.width*rect.width,
          y:rect.top+(e.y+.5)/m.height*rect.height};
      });
      await page.mouse.click(click.x,click.y);
      await page.waitForFunction(id=>WCRTS.latest().selectedEntityId===id,first,{timeout:15000});
      await page.setViewportSize({width:1280,height:800});
      // FND-002: real pointer box/multi-select and local control groups issue
      // per-actor orders through the R18 native command boundary.
      // ResizeObserver/RAF must finish fitting the native canvas before
      // translating real pointer coordinates into R01 world coordinates.
      await page.waitForFunction(()=>{
        const c=document.getElementById("canvas").getBoundingClientRect();
        const p=document.getElementById("hud-playfield").getBoundingClientRect();
        const m=WCRTS.latest()?.map;
        if(!m||!p.width||!p.height)return false;
        const expected=Math.min(p.width/m.width,p.height/m.height);
        return Math.abs(c.width-expected*m.width)<1&&
          Math.abs(c.height-expected*m.height)<1;
      },undefined,{timeout:10000});
      const groupCanvas=await page.evaluate(()=>{
        const c=document.getElementById("canvas").getBoundingClientRect();
        const m=WCRTS.latest().map;
        return {x:c.left,y:c.top,w:c.width,h:c.height,mw:m.width,mh:m.height};
      });
      const point=(x,y)=>({x:groupCanvas.x+x*groupCanvas.w/groupCanvas.mw,
        y:groupCanvas.y+y*groupCanvas.h/groupCanvas.mh});
      // Drag from an unobstructed map corner across the entire battlefield;
      // this selects all active allied units regardless of native AI movement.
      const dragFrom=point(groupCanvas.mw-.25,groupCanvas.mh-.25);
      const dragTo=point(.25,.25);
      await page.mouse.move(dragFrom.x,dragFrom.y);
      await page.mouse.down();
      await page.mouse.move(dragTo.x,dragTo.y,{steps:6});
      await page.mouse.up();
      const boxSelected=await page.locator("#hud-selection-text").textContent();
      if(!/[2-9] selected/.test(boxSelected)){
        const debug=await page.evaluate(()=>({
          label:document.getElementById("hud-selection-text").textContent,
          mode:document.body.dataset.mode,
          units:WCRTS.latest().entities.filter(e=>e.ownerId===1).map(e=>
            ({id:e.id,x:e.x,y:e.y,active:e.active,hp:e.hp})),
          canvas:document.getElementById("canvas").getBoundingClientRect().toJSON(),
          playfield:document.getElementById("hud-playfield").getBoundingClientRect().toJSON()
        }));
        throw Error("R18 drag box failed: "+JSON.stringify(debug));
      }
      const selectedGroup=await page.locator("#hud-selection-text").textContent();
      assert(/[2-9] selected/.test(selectedGroup));
      await page.keyboard.press("Shift+1");
      await page.keyboard.press("1");
      assert(/[2-9] selected/.test(await page.locator("#hud-selection-text").textContent()),
        "Local control group lost native-owned actors");
      const liveCanvas=page.locator("#canvas");
      const zoomBefore=await liveCanvas.evaluate(e=>e.getBoundingClientRect().width);
      await page.locator("#hud-zoom-in").click();
      const zoomAfter=await liveCanvas.evaluate(e=>e.getBoundingClientRect().width);
      assert(zoomAfter>zoomBefore,"R18 map camera did not zoom");
      const commandsBefore=await page.evaluate(()=>
        WCRTS.eventHistory().filter(e=>e.type==="command").length);
      await page.locator("#hud-stop").click();
      await page.waitForFunction(count=>
        WCRTS.eventHistory().filter(e=>e.type==="command").length>=count+2,
        commandsBefore,{timeout:15000});
      messages.push("PASS: integrated R18 native box selection, group recall, zoom and multi-unit Stop routed through C++");
      const rejected=await page.evaluate(id=>Module._Browser_Live_World_Command(
        1,2,id,3,1,0,0),first);
      assert.notEqual(rejected,0,"Forge issued an order to an Aster-owned unit");
      assert.equal(await page.evaluate(id=>WCRTS.latest().entities.find(e=>e.id===id).ownerId,first),1);
      assert.equal(await page.evaluate(id=>Module._Browser_Live_World_Command(
        0,1,id,0,0,0,0),first),0);
      assert.equal(await page.evaluate(({id,goal})=>Module._Browser_Live_World_Command(
        1,1,id,goal[0],goal[1],0,0),{id:first,goal:item.goal}),0);
      await page.waitForFunction(id=>WCRTS.latest().selectedEntityId===id,first,{timeout:15000});
      await page.waitForFunction(id=>WCRTS.latest().entities.find(e=>e.id===id).x>1,
        first,{timeout:60000});
      const moved=await page.evaluate(id=>{
        const u=WCRTS.latest().entities.find(e=>e.id===id);
        const pattern=new RegExp(`\\[rts-live\\] moved id=${id} x=(\\d+) y=(\\d+)`,"g");
        const matches=[...document.getElementById("log").textContent.matchAll(pattern)];
        const last=matches[matches.length-1];
        return {hud:[u.x,u.y],native:last&&[Number(last[1]),Number(last[2])],
          version:WCRTS.latest().version,ui:document.getElementById("engine-courier-status").dataset.snapshotVersion};
      },first);
      assert.deepEqual(moved.hud,moved.native,"R18 v3 HUD diverged from actual InfantryClass position");
      assert.equal(moved.version,3);assert.equal(moved.ui,"3");
      const ally=initial.entities[1].id,third=initial.entities[4].id;
      assert.equal(await page.evaluate(id=>Module._Browser_Live_World_Command(
        4,1,id,0,0,0,0),ally),0,"R18 hold was rejected");
      assert.equal(await page.evaluate(({guard,target})=>Module._Browser_Live_World_Command(
        5,1,guard,0,0,target,0),{guard:third,target:first}),0,"R18 guard was rejected");
      await page.waitForFunction(({hold,guard})=>{
        const states=WCRTS.latest().commandStates;
        return states.some(s=>s.entityId===hold&&s.kind==="hold")&&
          states.some(s=>s.entityId===guard&&s.kind==="guard");
      },{hold:ally,guard:third},{timeout:15000});
      assert.equal(await page.evaluate(()=>Module._Browser_Live_World_Restart()),1);
      await page.waitForFunction(()=>WCRTS.latest().epoch===2&&
        WCRTS.latest().events.some(e=>e.type==="restart"),undefined,{timeout:15000});
      const next=await page.evaluate(()=>WCRTS.latest());
      assert.equal(next.selectedEntityId,0);
      assert.notEqual(next.entities[0].id,first,"Restart reused a stable entity ID");
      assert.equal(next.entities[0].x,1);
      messages.push(`PASS: ${item.id} R18 v3 world, six true InfantryClass actors, R02 movement parity, R04 terrain, ownership and epoch restart`);
    }
    // R20: repeated real-WASM epochs on both native RTS maps. This runs
    // inside the compiled VanillaTD module, not the host-only fixture.
    // Keep the normal smoke test fast when no explicit soak is requested.
    const soakEpochs=Number(process.env.R20_WASM_SOAK_EPOCHS||0);
    assert(Number.isInteger(soakEpochs)&&soakEpochs>=0&&soakEpochs<=24,
           "R20_WASM_SOAK_EPOCHS must be an integer between 0 and 24");
    if(soakEpochs){
      for(const item of [
        {id:"ridge-pass",goal:[6,2]},
        {id:"marsh-border",goal:[3,1]}
      ]){
        await page.reload({waitUntil:"domcontentloaded",timeout:90000});
        await page.waitForFunction(()=>document.body.dataset.runtime==="ready"&&
          document.getElementById("map-choice").options.length===3,undefined,{timeout:90000});
        await page.locator("#map-choice").selectOption(item.id);
        await page.locator("#launch-rts-match").click();
        await page.waitForFunction(id=>WCRTS.latest()?.version===3&&
          WCRTS.latest().map.id===id,item.id,{timeout:60000});
        await page.evaluate(()=>{
          const intervals=[];
          let previous=null,stopped=false;
          function sample(now){
            if(stopped)return;
            if(previous!==null&&intervals.length<15000)intervals.push(now-previous);
            previous=now;
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
          window.__r20StopFrameSampling=()=>{stopped=true;return intervals;};
        });
        const started=Date.now(),heaps=[];
        const pageErrorsBefore=messages.filter(m=>m.startsWith("PAGE ERROR:")).length;
        let sampledTicks=0,lastId=0;
        for(let cycle=0;cycle<soakEpochs;cycle++){
          const before=await page.evaluate(()=>{
            const s=WCRTS.latest();
            return {epoch:s.epoch,tick:s.tick,actorId:s.entities[0].id,
              owner:s.entities[0].ownerId,commands:s.commandStates.length};
          });
          assert.equal(before.epoch,cycle+1,"Native epoch skipped during soak");
          assert.equal(before.owner,1);
          assert.equal(before.commands,6);
          if(lastId)assert.notEqual(before.actorId,lastId,"Native ID reused after restart");
          assert.equal(await page.evaluate(({id,goal})=>
            Module._Browser_Live_World_Command(1,1,id,goal[0],goal[1],0,0),
            {id:before.actorId,goal:item.goal}),0,"Soak move was rejected");
          await page.waitForFunction(({epoch,tick})=>WCRTS.latest()?.epoch===epoch&&
            WCRTS.latest().tick>=tick+40,
            {epoch:before.epoch,tick:before.tick},{timeout:25000});
          const after=await page.evaluate(id=>{
            const s=WCRTS.latest(),actor=s.entities.find(e=>e.id===id);
            return {epoch:s.epoch,tick:s.tick,map:s.map.id,
              actor:actor&&{id:actor.id,owner:actor.ownerId,x:actor.x,y:actor.y},
              width:s.map.width,height:s.map.height,
              resourceCount:s.map.resources.length,commands:s.commandStates.length,
              history:WCRTS.eventHistory().length,
              accepted:WCRTS.eventHistory().some(e=>e.type==="command"&&
                e.entityId===id&&e.code==="accepted"),
              heapBytes:Module.HEAPU8?.buffer?.byteLength||0};
          },before.actorId);
          assert.equal(after.epoch,before.epoch);
          assert.equal(after.map,item.id);
          assert(after.actor&&after.actor.owner===1);
          assert(after.actor.x>=0&&after.actor.x<after.width);
          assert(after.actor.y>=0&&after.actor.y<after.height);
          assert.equal(after.resourceCount,2);
          assert.equal(after.commands,6);
          assert(after.history<=256&&after.accepted,
                 "Native command/event history lost parity during soak");
          assert(after.heapBytes>0,"Native WASM heap was not observable");
          heaps.push(after.heapBytes);
          sampledTicks+=after.tick-before.tick;
          lastId=before.actorId;
          assert.equal(await page.evaluate(()=>Module._Browser_Live_World_Restart()),1);
          await page.waitForFunction(epoch=>WCRTS.latest()?.epoch===epoch+1&&
            WCRTS.latest().selectedEntityId===0, before.epoch,{timeout:15000});
        }
        assert.equal(messages.filter(m=>m.startsWith("PAGE ERROR:")).length,
                     pageErrorsBefore,"Browser page error during native R20 soak");
        const heapGrowth=heaps.length>1?
          Math.max(...heaps.slice(1))-Math.min(...heaps.slice(1)):0;
        const frameIntervals=await page.evaluate(()=>window.__r20StopFrameSampling());
        frameIntervals.sort((a,b)=>a-b);
        const frameP95=frameIntervals.length?
          Number(frameIntervals[Math.floor(frameIntervals.length*0.95)].toFixed(2)):null;
        const measurement={map:item.id,epochs:soakEpochs,sampledTicks,
          elapsedSeconds:Number(((Date.now()-started)/1000).toFixed(2)),
          wasmHeapBytes:heaps,postWarmupHeapDeltaBytes:heapGrowth,
          animationFrameSamples:frameIntervals.length,
          animationFrameIntervalP95Ms:frameP95,
          pageErrors:messages.filter(m=>m.startsWith("PAGE ERROR:")).length-pageErrorsBefore};
        r20Metrics.maps.push(measurement);
        messages.push("PASS: R20 native WASM "+item.id+" "+soakEpochs+
          " restarts, "+sampledTicks+" live ticks, bounded events and IDs, "+
          "allocated heap delta "+heapGrowth+" bytes, rAF interval p95 "+
          frameP95+" ms/"+frameIntervals.length+" samples, "+
          measurement.elapsedSeconds+" elapsed seconds (budgets pending approval)");
      }
    }
    // The integrated v3 scenario uses the real R03 combat system, not Courier
    // sentry arrays or JavaScript damage. Fight to a native match outcome.
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(()=>document.body.dataset.runtime==="ready"&&
      document.getElementById("map-choice").options.length===3,undefined,{timeout:90000});
    await page.locator("#map-choice").selectOption("ridge-pass");
    await page.locator("#launch-rts-match").click();
    await page.waitForFunction(()=>WCRTS.latest()?.version===3&&WCRTS.latest().commandStates.length===6,
      undefined,{timeout:60000});
    const combatIds=await page.evaluate(()=>WCRTS.latest().entities.slice(0,6).map(e=>e.id));
    assert.notEqual(await page.evaluate(ids=>Module._Browser_Live_World_Command(
      7,1,ids[0],0,0,ids[1],0),combatIds),0,"R03 accepted a friendly attack");
    for(const [i,goal] of [[0,[10,2]],[1,[9,3]],[4,[10,6]]]){
      const accepted=await page.evaluate(({id,goal})=>Module._Browser_Live_World_Command(
        2,1,id,goal[0],goal[1],0,0),{id:combatIds[i],goal});
      assert.equal(accepted,0,`Integrated attack-move ${i} was rejected`);
    }
    await page.waitForFunction(()=>WCRTS.eventHistory().some(e=>e.type==="shot")&&
      WCRTS.eventHistory().some(e=>e.type==="hit")&&
      WCRTS.eventHistory().some(e=>e.type==="damage"),undefined,{timeout:150000});
    await page.waitForFunction(()=>WCRTS.latest().phase!=="playing",
      undefined,{timeout:150000});
    const battle=await page.evaluate(()=>({
      phase:WCRTS.latest().phase,
      dead:WCRTS.latest().entities.filter(e=>e.lifecycle==="dead").map(e=>e.id),
      hp:WCRTS.latest().entities.slice(0,6).map(e=>e.hp),
      result:document.getElementById("alpha-result").textContent,
      types:[...new Set(WCRTS.eventHistory().map(e=>e.type))]
    }));
    assert(["won","lost"].includes(battle.phase));
    assert(battle.dead.length>0&&battle.hp.includes(0));
    assert(battle.types.includes("damage")&&battle.types.includes("death"));
    assert(battle.result.includes(battle.phase==="won"?"victory":"defeated"));
    assert.equal(await page.evaluate(()=>Module._Browser_Live_World_Restart()),1);
    await page.waitForFunction(()=>WCRTS.latest().epoch===2&&WCRTS.latest().phase==="playing",
      undefined,{timeout:15000});
    messages.push(`PASS: native R18-v3 combat emitted shot/hit/damage/death, ${battle.phase} HUD and restart with six engine infantry`);
    messages.push("PASS: R03 canonical shot/hit/damage events and sentry HP synchronized to tactical HUD");
    // Opt-in deterministic drill: actual native infantry are overwhelmed by
    // armored sentries, making target rejection, defeat and restart observable.
    await page.reload({waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => document.body.dataset.runtime === "ready",undefined,{timeout:90000});
    await page.evaluate(()=>{
      window.__r03DrillUnits=null;
      const originalReceive=WCRTS.receive;
      WCRTS.receive=function(payload){
        const snapshot=originalReceive(payload);
        if(window.__r03DrillUnits===null&&snapshot.entities[2].kind==="vehicle")
          window.__r03DrillUnits=snapshot.entities.slice(0,4).map(e=>[e.id,e.kind,e.hp]);
        return snapshot;
      };
    });
    await page.locator("#launch-r03-drill").click();
    await page.waitForFunction(() => window.__r03DrillUnits!==null,
                               undefined,{timeout:40000});
    const drillUnits=await page.evaluate(()=>window.__r03DrillUnits);
    assert.deepEqual(drillUnits,[[1001,"infantry",5],[1002,"infantry",6],
                                 [2001,"vehicle",8],[2002,"vehicle",8]]);
    await clickNativeTile(page.locator("#canvas"),3,2);
    await page.waitForFunction(()=>WCRTS.eventHistory().some(e=>e.type==="command"&&e.code==="bad_target"),
                               undefined,{timeout:15000});
    await page.waitForFunction(() => WCRTS.latest()&&WCRTS.latest().phase==="lost",
                               undefined,{timeout:60000});
    const defeat=await page.evaluate(()=>({
      phase:WCRTS.latest().phase,
      squad:WCRTS.latest().entities.slice(0,2).map(e=>e.hp),
      types:WCRTS.eventHistory().map(e=>e.type),
      result:document.getElementById("alpha-result").textContent
    }));
    assert.deepEqual(defeat.squad,[0,0]);
    assert(defeat.types.includes("damage")&&defeat.types.includes("death")&&defeat.types.includes("phase"));
    assert(defeat.result.includes("Squad lost"));
    await page.screenshot({path:path.join(root,"r03-defeat.png"),fullPage:true});
    // The drill resumes automatic fire immediately after restart. Capture the
    // authoritative restart snapshot at receipt rather than racing its brief
    // live display against the next combat tick.
    await page.evaluate(()=>{
      window.__r03RestartSnapshot=null;
      const originalReceive=WCRTS.receive;
      WCRTS.receive=function(payload){
        const snapshot=originalReceive(payload);
        if(snapshot.events.some(e=>e.type==="restart"))
          window.__r03RestartSnapshot={phase:snapshot.phase,
            hp:snapshot.entities.slice(0,4).map(e=>e.hp)};
        return snapshot;
      };
    });
    await page.keyboard.press("r");
    await page.waitForFunction(()=>window.__r03RestartSnapshot!==null,
      undefined,{timeout:15000});
    assert.deepEqual(await page.evaluate(()=>window.__r03RestartSnapshot),
      {phase:"playing",hp:[5,6,8,8]});
    messages.push("PASS: R03 native armored vehicles reject infantry rifles; damage, death, defeat HUD and restart observed");
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
    r20Metrics.status="complete";
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
    fs.writeFileSync(path.join(root, "r20-wasm-metrics.json"),
      JSON.stringify(r20Metrics,null,2)+"\n");
    await browser.close();
  }
}
main().catch(err => {console.error(err.stack || err); process.exitCode = 1;})
  .finally(() => {server.close();});
