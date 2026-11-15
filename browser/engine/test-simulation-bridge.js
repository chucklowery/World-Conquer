"use strict";
const assert=require("node:assert/strict");
const bridge=require("./simulation-bridge.js");
const HUD=require("./tactical-hud.js");
const base={version:1,tick:0,map:{width:18,height:11,terrain:Array(198).fill(0)},
  selectedEntityId:1001,cargo:0,phase:"playing",
  entities:[
    {id:1001,kind:"infantry",ownerId:1,teamId:1,x:1,y:2,hp:5,active:true,order:null},
    {id:1002,kind:"infantry",ownerId:1,teamId:1,x:2,y:3,hp:6,active:true,order:null},
    {id:2001,kind:"infantry",ownerId:2,teamId:2,x:10,y:2,hp:3,active:true,order:null},
    {id:2002,kind:"infantry",ownerId:2,teamId:2,x:14,y:6,hp:3,active:true,order:null},
    {id:3001,kind:"supply",ownerId:0,teamId:0,x:7,y:2,hp:0,active:true,order:null},
    {id:3002,kind:"supply",ownerId:0,teamId:0,x:15,y:4,hp:0,active:true,order:null},
    {id:4001,kind:"extraction",ownerId:0,teamId:0,x:16,y:9,hp:0,active:true,order:null}],events:[]};
base.map.terrain[2*18+5]=1;
let calls=0;
bridge.subscribe(s=>{assert(Object.isFrozen(s));calls++;});
const first=bridge.receive(JSON.stringify(base));
assert.equal(first.version,bridge.VERSION);
assert(Object.isFrozen(first.entities[0]));
assert(Object.isFrozen(first.map.terrain));
assert.throws(()=>{first.entities[0].x=55;},TypeError);
const next=JSON.parse(JSON.stringify(base));
next.tick=1;next.entities[0].x=3;next.entities[4].active=false;next.cargo=1;
next.events=[{type:"position",tick:1,entityId:1001,sequence:0,x:3,y:2,value:0,code:"accepted"}];
bridge.receive(next);
assert.equal(bridge.latest().entities[0].x,3);
assert.equal(bridge.eventHistory()[0].type,"position");
assert(Object.isFrozen(bridge.eventHistory()));
const commandSnapshot=JSON.parse(JSON.stringify(next));
commandSnapshot.commandStates=[{entityId:1001,kind:"patrol",status:"patrolling",x:14,y:8,queued:2}];
bridge.receive(commandSnapshot);
assert(Object.isFrozen(bridge.latest().commandStates[0]));
assert.equal(bridge.latest().commandStates[0].queued,2);
assert.throws(()=>bridge.receive({...commandSnapshot,commandStates:[{...commandSnapshot.commandStates[0],kind:"teleport"}]}),/command state/);
const hud=HUD.create();
HUD.applySnapshot(hud,bridge.latest());
assert.deepEqual([hud.units[0].x,hud.units[0].y],[3,2]);
assert.equal(hud.collected[0],true);
assert.equal(hud.cargo,1);
assert.equal(HUD.inspect(hud,5,2),"Blocked terrain");
assert.equal(HUD.inspect(hud,7,2),"Clear terrain");
assert.throws(()=>bridge.receive({...base,version:2}),/version/);
assert.throws(()=>bridge.receive({...base,entities:[...base.entities,base.entities[0]]}),/duplicate/);
assert.throws(()=>bridge.receive({...base,map:{...base.map,terrain:[]}}),/terrain/);
assert.throws(()=>bridge.receive(base),/regressed/);
const restart=JSON.parse(JSON.stringify(base));
restart.events=[{type:"restart",tick:0,entityId:0,sequence:0,x:0,y:0,value:0,code:"accepted"}];
bridge.receive(restart);
HUD.applySnapshot(hud,bridge.latest());
assert.equal(hud.inspect,null);
assert.equal(hud.cargo,0);
assert.equal(calls,4);
bridge.clear();
assert.equal(bridge.latest(),null);
assert.equal(bridge.eventHistory().length,0);
const v2=JSON.parse(JSON.stringify(base));
v2.version=2;
v2.map={id:"ridge-pass",title:"Ridge Pass",biome:"highland",width:16,height:10,
  terrain:Array(160).fill(0),tiles:Array(160).fill(0),costs:Array(160).fill(1),
  resources:[{x:7,y:3,amount:450}],
  spawns:[{house:1,x:0,y:0,w:5,h:5},{house:2,x:10,y:0,w:6,h:10}],
  bases:[{house:1,x:0,y:0},{house:2,x:15,y:9}],victory:{x:13,y:8,w:3,h:2}};
v2.map.tiles[6]=4;v2.map.terrain[6]=1;v2.map.costs[6]=0;
v2.entities.find(e=>e.id===4001).x=14;
v2.events=[];
const accepted=bridge.receive(v2);
assert.equal(accepted.version,bridge.MAP_VERSION);
assert(Object.isFrozen(accepted.map.resources));
assert.equal(bridge.latest().map.id,"ridge-pass");
const tainted=JSON.parse(JSON.stringify(v2));tainted.map.costs[6]=9;
assert.throws(()=>bridge.receive(tainted),/versioned/);
assert.equal(bridge.latest(),accepted,"Rejected snapshot must not replace native state");
const view=HUD.create();
HUD.applySnapshot(view,accepted);
assert.deepEqual([view.width,view.height],[16,10]);
assert.equal(HUD.inspect(view,6,0),"Blocked terrain");
console.log("PASS: R00 immutable snapshots, validation, typed events, HUD projection and restart");
