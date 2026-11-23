#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {generate,decodeBIN,cell}=require("./scenario.js");
const source=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../game/content/scenarios/foundry-test-range.json"),"utf8"));
const {ini,bin}=generate(source);
assert.equal(bin.length,8192); // map.cpp:1130-1141: 4096 packed 2-byte cells
assert.equal(decodeBIN(bin)[cell([31,31])].template,1);
assert.equal(decodeBIN(bin)[cell([1,1])].template,0);
assert.match(ini,/\[Basic\][\s\S]*Name=Foundry Test Range/);
assert.match(ini,/\[Map\][\s\S]*Width=62/);
assert.match(ini,new RegExp("0="+cell([10,10])));
assert.match(ini,new RegExp("1="+cell([53,53])));
assert.match(ini,/\[Overlay\][\s\S]*TI1/);
assert.throws(()=>generate({...source,map:{...source.map,width:64}}),/bounds/);
assert.throws(()=>decodeBIN(bin.subarray(0,8190)),/size/);
const smallMap={...source,map:{...source.map,x:10,y:10,width:20,height:20}};
assert.throws(()=>generate(smallMap),/outside playable map/);
for(const field of ["cells","overlays","trees","waypoints","units"]){
  const base=field==="cells"?source.terrain.cells:source[field];
  if(!base.length)continue;
  const first=field==="waypoints"?[63,10]:{...base[0],at:[63,10]};
  const broken=field==="cells"?
    {...source,terrain:{...source.terrain,cells:[first,...base.slice(1)]}}:
    {...source,[field]:[first,...base.slice(1)]};
  assert.throws(()=>generate(broken),/Cell must lie/,"grid bounds: "+field);
}
// Isolate each feature category so an unrelated invalid feature cannot mask it.
const enclosed={...source,map:{...source.map,x:10,y:10,width:20,height:20},
  terrain:{...source.terrain,cells:[]},waypoints:[[12,12],[13,13],[14,14],[15,15],[16,16],[17,17]],
  overlays:[],trees:[],units:[]};
assert.doesNotThrow(()=>generate(enclosed));
for(const field of ["cells","overlays","trees","waypoints","units"]){
  const changed=field==="waypoints"?[12,53]:{at:[12,53],type:"TI1",template:0,icon:0,house:"GoodGuy"};
  const invalid=field==="cells"?
    {...enclosed,terrain:{...enclosed.terrain,cells:[changed]}}:
    field==="waypoints"?
      {...enclosed,waypoints:[[12,12],changed,...enclosed.waypoints.slice(2)]}:
      {...enclosed,[field]:[changed]};
  assert.throws(()=>generate(invalid),/outside playable map/,"map bounds: "+field);
}
assert.throws(()=>generate({...source,waypoints:source.waypoints.slice(0,5)}),/six start waypoints/);
for(let i=0;i<6;i++)assert.match(ini,new RegExp("\\n"+i+"="+cell(source.waypoints[i])+"\\n"));
assert.deepEqual(generate(source),generate(source),"generator must be deterministic");
console.log("PASS: original scenario INI and 4096-cell BIN round-trip");
