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
console.log("PASS: R00 immutable snapshots, validation, typed events, HUD projection and restart");
