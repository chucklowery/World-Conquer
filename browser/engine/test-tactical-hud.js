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
const orders=HUD.create(source);
HUD.applyOrdersSnapshot(orders,{
  version:1,map:{width:18,height:11,terrain:Array(198).fill(0)},
  selectedEntityId:1003,
  entities:[1001,1002,1003,1004].map((id,i)=>({id,kind:"infantry",x:i+1,y:2,hp:5})),
  commandStates:[]
});
assert.equal(orders.selected,2);
assert.equal(HUD.inspect(orders,3,2),"Infantry 3");
assert.doesNotThrow(()=>HUD.draw({width:360,height:220,getContext:()=>context},orders));
assert(HUD.observe(model,"[browser-engine-courier] mission restarted"));
assert.deepEqual(model.units[0],{x:1,y:2,hp:5});
assert.equal(model.cargo,0);
assert.equal(model.inspect,null);
assert.throws(()=>HUD.create("invalid"),/Invalid tactical minimap/);
for(const [name,width,height] of [["ridge-pass",16,10],["marsh-border",24,14]]){
  const v2=HUD.create(fs.readFileSync(path.resolve(__dirname,"../../game/content/missions/"+name+".map"),"utf8"));
  assert.deepEqual([v2.width,v2.height],[width,height]);
  assert.equal(v2.resources.length,2);
  const rough=v2.terrain.indexOf(2),marsh=v2.terrain.indexOf(3),rock=v2.terrain.indexOf(4);
  assert(rough>=0&&marsh>=0&&rock>=0);
  assert.equal(HUD.inspect(v2,rough%width,Math.floor(rough/width)),"Rough terrain · cost 2");
  assert.equal(HUD.inspect(v2,marsh%width,Math.floor(marsh/width)),"Marsh terrain · cost 3");
  assert.equal(HUD.inspect(v2,rock%width,Math.floor(rock/width)),"Blocked terrain");
  assert.equal(HUD.inspect(v2,v2.resources[0].x,v2.resources[0].y),"Resource node");
  assert.equal(HUD.inspect(v2,v2.bases[0].x,v2.bases[0].y),"Starting base");
  const pixels=[];
  const visual={fillRect(x,y,w,h){pixels.push({x,y,w,h,color:this.fillStyle});},
    strokeRect(){},beginPath(){},arc(){},fill(){},stroke(){}};
  HUD.draw({width:width*20,height:height*20,getContext:()=>visual},v2);
  assert.equal(pixels[1+rock].color,"#5c546b");
  assert.equal(pixels[1+marsh].color,"#386873");
  assert.equal(pixels[1+rough].color,"#80694b");
  HUD.reset(v2);
  assert.deepEqual([v2.units[0].x,v2.units[0].y],[v2.spawn[0].x,v2.spawn[0].y]);
}
console.log("PASS: minimap terrain, unit telemetry, combat, selection and restart");
