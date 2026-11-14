#!/usr/bin/env node
// Real Chromium input/coordinate tests using a synthetic R00 snapshot; the
// separate check-runtime.js validates these orders against compiled WASM.
"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const path=require("node:path");

async function main(){
  const browser=await chromium.launch({headless:true,
    ...(process.env.R01_CHROMIUM_PATH?{executablePath:process.env.R01_CHROMIUM_PATH}:{}),
    args:["--no-sandbox"]});
  try{
    for(const shape of [{width:1360,height:980},{width:720,height:480}]){
      const page=await browser.newPage({viewport:shape});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      await page.setContent(`<!doctype html><html><head><style>
        *{box-sizing:border-box}body{margin:0}#tactical-hud{height:100dvh;width:100vw;display:grid;grid-template-columns:minmax(0,1fr) 280px}
        #hud-playfield{position:relative;overflow:hidden;touch-action:none;background:#09241c}
        #canvas{position:absolute;border:0;aspect-ratio:auto;touch-action:none}
        #hud-selection-overlay{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
        aside{background:#17271e}#hud-minimap{width:260px;aspect-ratio:18/11}
        button{min-width:45px;min-height:25px}
      </style></head><body data-mode="engine-courier"><div id="tactical-hud"><div id="hud-playfield">
        <canvas id="hud-selection-overlay"></canvas><canvas id="canvas" width="720" height="440" tabindex="0"></canvas>
      </div><aside><canvas id="hud-minimap" width="360" height="220"></canvas><p id="hud-map-readout"></p><p id="hud-selection-text"></p>
        <button data-command-mode="context"></button><button data-command-mode="move"></button><button data-command-mode="attack"></button>
        <button id="hud-stop"></button><button id="hud-center"></button><button id="hud-zoom-in"></button><button id="hud-zoom-out"></button>
        <button id="hud-pan-up"></button><button id="hud-pan-down"></button><button id="hud-pan-left"></button><button id="hud-pan-right"></button>
        <input id="hud-edge-scroll" type="checkbox"></aside></div></body></html>`);
      await page.addScriptTag({path:path.join(__dirname,"rts-camera.js")});
      await page.addScriptTag({path:path.join(__dirname,"rts-input-ui.js")});
      await page.evaluate(()=>{
        const byId=id=>document.getElementById(id);
        window.commands=[];
        window.snapshot={map:{width:18,height:11},phase:"playing",selectedEntityId:1001,events:[],entities:[
          {id:1001,kind:"infantry",ownerId:1,x:1,y:2,hp:5,active:true},
          {id:1002,kind:"infantry",ownerId:1,x:2,y:3,hp:6,active:true},
          {id:2001,kind:"infantry",ownerId:2,x:10,y:2,hp:3,active:true}
        ]};
        window.ui=WCRTSBrowserInput.mount({
          playfield:byId("hud-playfield"),canvas:byId("canvas"),overlay:byId("hud-selection-overlay"),
          minimap:byId("hud-minimap"),readout:byId("hud-map-readout"),selectionLabel:byId("hud-selection-text"),
          modeButtons:document.querySelectorAll("[data-command-mode]"),
          onCommand:command=>{window.commands.push(command);return 0;},
          onRestart:()=>window.commands.push({kind:"restart"}),
          onDrawMinimap:()=>{}
        });
        ui.resize();ui.receive(snapshot);
      });
      const tile=async(x,y)=>page.evaluate(({x,y})=>{
        const p=ui.camera.worldToScreen((x+.5)*40,(y+.5)*40);
        const r=document.getElementById("hud-playfield").getBoundingClientRect();
        return {x:p.x+r.left,y:p.y+r.top};
      },{x,y});
      const unit=await tile(1,2),ranger=await tile(2,3);
      await page.mouse.click(unit.x,unit.y);
      await page.keyboard.down("Shift");
      await page.mouse.click(ranger.x,ranger.y);
      await page.keyboard.up("Shift");
      assert.deepEqual(await page.evaluate(()=>ui.selection.ids),[1001,1002],"Shift-add browser input failed");
      await page.keyboard.press("Shift+3");
      await page.mouse.click(unit.x,unit.y);
      await page.keyboard.press("3");
      assert.deepEqual(await page.evaluate(()=>ui.selection.ids),[1001,1002],"Group recall browser shortcut failed");
      const oldZoom=await page.evaluate(()=>ui.camera.zoom);
      await page.locator("#hud-zoom-in").click();
      assert((await page.evaluate(()=>ui.camera.zoom))>oldZoom,"Zoom button failed");
      const priorCenter=await page.evaluate(()=>ui.camera.centerX);
      await page.keyboard.press("ArrowRight");
      assert((await page.evaluate(()=>ui.camera.centerX))>priorCenter,"Arrow pan failed");
      const count=await page.evaluate(()=>commands.length);
      await page.locator("#hud-minimap").click({position:{x:220,y:100}});
      assert.equal(await page.evaluate(()=>commands.length),count,"Minimap issued a gameplay order");
      assert((await page.locator("#hud-map-readout").textContent()).includes("No unit order"));
      await page.locator("#hud-zoom-out").click();
      const ground=await tile(4,3);
      await page.mouse.click(ground.x,ground.y,{button:"right"});
      const moves=await page.evaluate(()=>commands.filter(c=>c.kind==="move"));
      assert.deepEqual(moves.map(c=>c.actor),[1001,1002],"Right-click did not issue one native order per selected actor");
      await page.keyboard.press("m");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(()=>commands.filter(c=>c.kind==="move").length),4,
        "Keyboard-only target mode did not send native moves");
      const dimensions=await page.evaluate(()=>{
        const r=document.getElementById("canvas").getBoundingClientRect();
        return {width:r.width,height:r.height,selected:document.getElementById("hud-selection-text").textContent};
      });
      assert(Math.abs(dimensions.width/dimensions.height-18/11)<.0001,"Browser canvas stretched");
      assert(dimensions.selected.includes("2 selected"),"Visual multi-selection feedback missing");
      assert.deepEqual(errors,[],"Browser page errors");
      await page.close();
      console.log(`PASS: Chromium ${shape.width}x${shape.height} multi-select, groups, pan/zoom, minimap, native orders`);
    }
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
