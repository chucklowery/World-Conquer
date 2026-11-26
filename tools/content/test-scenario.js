#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {generate,decodeBIN,cell}=require("./scenario.js");
const source=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../game/content/scenarios/foundry-test-range.json"),"utf8"));
const {ini,bin}=generate(source);
assert.equal(bin.length,8192); // map.cpp:1130-1141: 4096 packed 2-byte cells
// M5 terrain: the ridge at 31,16 is the 2x2 rock template S03.
const S03=require("./art/templates.json").find(t=>t.name==="S03");
assert.equal(decodeBIN(bin)[cell([31,16])].template,S03.id);
assert.equal(decodeBIN(bin)[cell([32,17])].icon,3);
assert.equal(decodeBIN(bin)[cell([1,1])].template,0);
assert.match(ini,/\[Basic\][\s\S]*Name=Foundry Test Range/);
assert.match(ini,/\[Map\][\s\S]*Width=62/);
assert.match(ini,new RegExp("0="+cell([10,10])));
assert.match(ini,new RegExp("1="+cell([53,53])));
assert.match(ini,/\[Overlay\][\s\S]*TI1/);
assert.throws(()=>generate({...source,map:{...source.map,width:64}}),/bounds/);
assert.throws(()=>decodeBIN(bin.subarray(0,8190)),/size/);
const smallMap={...source,map:{...source.map,x:10,y:10,width:20,height:20},ponds:[],ridges:[],patches:[],roads:[]};
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
  overlays:[],trees:[],units:[],ponds:[],ridges:[],patches:[],roads:[],stamps:[],fields:[],treeLines:[]};
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

// M3 maps: compact fields/treeLines, start clearance, and every map builds.
{
  const assert=require("node:assert"),os=require("node:os");
  const {expand,build}=require("./scenario.js");
  const base={schema:1,file:"SCM50EA",name:"Test",map:{theater:"TEMPERATE",x:1,y:1,width:62,height:62},
    terrain:{fill:0,cells:[]},waypoints:[[10,10],[50,50],[50,10],[10,50],[31,8],[31,55]],
    overlays:[],trees:[],units:[]};
  const one=expand({...base,fields:[{center:[31,31],radius:2,type:"TI1"}]});
  assert.equal(one.overlays.length,21,"radius-2 field covers 21 cells (dx²+dy² ≤ r²+1)");
  assert.throws(()=>expand({...base,fields:[{center:[12,12],radius:2,type:"TI1"}]}),/blocked/);
  assert.throws(()=>expand({...base,treeLines:[{from:[8,10],to:[14,10],type:"T01"}]}),/blocked/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wc-maps-"));
  const names=build(dir);
  const inis=names.filter(n=>n.endsWith(".INI"));
  assert.ok(inis.length>=3,"at least three skirmish maps");
  for(const ini of inis){
    assert.match(ini,/^SCM\d\dEA\.INI$/);
    assert.ok(fs.existsSync(path.join(dir,ini.replace(".INI",".BIN"))));
    assert.match(build.sources[ini],/^game\/content\/scenarios\/.+\.json$/);
  }
  fs.rmSync(dir,{recursive:true,force:true});
  console.log("PASS: "+inis.length+" skirmish maps build: "+inis.join(", "));
}

// M5 terrain features: stamps by template name, ridges, ponds and roads;
// start positions stay clear and resources never sit on rock or water.
{
  const assert=require("node:assert");
  const {expand}=require("./scenario.js");
  const T=new Map(require("./art/templates.json").map(t=>[t.name,t]));
  const base={schema:1,file:"SCM50EA",name:"Test",map:{theater:"TEMPERATE",x:1,y:1,width:62,height:62},
    terrain:{fill:0,cells:[]},waypoints:[[10,10],[50,50],[50,10],[10,50],[31,8],[31,55]],
    overlays:[],trees:[],units:[]};
  const r=expand({...base,ridges:[{from:[20,20],to:[24,20],template:"S03"}]});
  assert.equal(r.terrain.cells.length,12,"three 2x2 rock stamps");
  assert.ok(r.terrain.cells.every(c=>c.template===T.get("S03").id));
  const p=expand({...base,ponds:[{at:[30,30]}]});
  assert.equal(p.terrain.cells.length,36,"a pond is 6x6 cells");
  assert.throws(()=>expand({...base,ridges:[{from:[12,12],to:[14,12]}]}),/blocked by terrain/);
  assert.throws(()=>expand({...base,stamps:[{template:"NOPE",at:[20,20]}]}),/Unknown temperate template/);
  const f=expand({...base,stamps:[{template:"B3",at:[30,30]}],overlays:[{at:[31,30],type:"TI1"},{at:[31,35],type:"TI1"}]});
  assert.deepEqual(f.overlays.map(o=>o.at),[[31,35]],"no crystal on rock");
  const road=expand({...base,roads:[{from:[20,40],to:[27,40]}]});
  assert.ok(road.terrain.cells.every(c=>c.template===T.get("D10").id));
  console.log("PASS: M5 terrain features (ridges, ponds, roads, clearance)");
}
