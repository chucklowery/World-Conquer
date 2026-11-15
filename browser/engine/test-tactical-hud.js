"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const HUD=require("./tactical-hud.js");
const source=fs.readFileSync(path.resolve(__dirname,"../../game/content/missions/courier-extraction.map"),"utf8");
const model=HUD.create(source);
assert.equal(model.blocked.size,14);
assert.equal(HUD.create().blocked.size,14);
assert.deepEqual(model.units.map(({x,y})=>[x,y]),[[1,2],[2,3],[10,2],[14,6]]);
assert.equal(HUD.inspect(model,5,2),"Blocked terrain");
assert.equal(HUD.inspect(model,16,9),"Extraction zone");
assert.equal(HUD.inspect(model,7,2),"Supply cache");
assert(HUD.observe(model,"[browser-engine-courier] moved unit=0 x=3 y=2"));
assert(HUD.observe(model,"[browser-engine-courier] sentry moved unit=2 x=9 y=2"));
assert(HUD.observe(model,"[browser-engine-courier] combat unit=2 hp=0"));
assert(HUD.observe(model,"[browser-native-slice] crates=1/2"));
assert(HUD.observe(model,"[browser-engine-courier] crate collected=1"));
assert(HUD.observe(model,"[browser-engine-courier] selected unit=1"));
assert.equal(model.units[2].hp,0);
assert.equal(model.cargo,1);
assert.equal(model.selected,1);
assert.equal(HUD.inspect(model,15,4),"Clear terrain");
assert.equal(HUD.inspect(model,7,2),"Supply cache");
const calls=[];
const context={
  fillRect(...args){calls.push(["rect",...args]);},strokeRect(...args){calls.push(["stroke",...args]);},
  beginPath(){},arc(...args){calls.push(["arc",...args]);},fill(){},stroke(){}
};
HUD.draw({width:360,height:220,getContext:()=>context},model);
assert(calls.filter(([type])=>type==="rect").length>198);
assert(calls.some(([type])=>type==="arc"));
assert(HUD.observe(model,"[browser-engine-courier] mission restarted"));
assert.deepEqual(model.units[0],{x:1,y:2,hp:5});
assert.equal(model.cargo,0);
assert.equal(model.inspect,null);
assert.throws(()=>HUD.create("invalid"),/Invalid tactical minimap/);
console.log("PASS: minimap terrain, unit telemetry, combat, selection and restart");
