"use strict";
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const bridge=require("./simulation-bridge.js");
const binary=process.argv[2];
if(!binary)throw Error("Pass compiled test-rts-world executable");
const snapshots=execFileSync(binary,["--json"],{encoding:"utf8"})
  .trim().split("\n").map(JSON.parse);
assert.equal(snapshots.length,6);
assert.equal(snapshots[0].version,3);
assert.equal(snapshots[0].selectedEntityId,0);
assert.throws(()=>bridge.receive(snapshots[0]),/negotiated/);
assert.equal(bridge.latest(),null);
for(const s of snapshots){
  const result=bridge.receive(s,{allowWorldV3:true});
  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.entities));
  assert(Object.isFrozen(result.houses));
}
const [initial,spawned,observed,removed,restarted,newMatch]=snapshots;
assert.equal(initial.entities.length,0);
assert.equal(spawned.entities.length,3);
assert.deepEqual(spawned.entities.map(e=>e.definitionId),
  ["game.aster.ranger","game.forge.ranger","game.world.crystal"]);
assert.deepEqual(spawned.entities.map(e=>e.visualKey),
  ["r05.aster.ranger","r05.forge.ranger","r05.world.crystal"]);
assert.deepEqual(spawned.events.map(e=>e.type),
  ["command","spawn","command","spawn","command","spawn"]);
assert.deepEqual(spawned.events.map(e=>e.sequence),[1,1,2,2,3,3]);
assert.deepEqual(observed.events.map(e=>e.type),["position","damage"]);
assert.equal(observed.entities[0].hp,3);
assert.deepEqual(removed.entities.slice(0,2).map(e=>e.lifecycle),["dead","despawned"]);
assert.equal(removed.selectedEntityId,0);
assert.equal(restarted.epoch,2);
assert.equal(restarted.tick,0);
assert.equal(restarted.events[0].type,"restart");
assert.equal(newMatch.entities[0].id,2*1048576+1);
assert.notEqual(newMatch.entities[0].id,spawned.entities[0].id);
assert.equal(bridge.latest().epoch,2);
assert(bridge.eventHistory().some(e=>e.type==="spawn"));
const copy=JSON.parse(JSON.stringify(newMatch));
copy.entities[0].teamId=999;
assert.throws(()=>bridge.receive(copy,{allowWorldV3:true}),/definition|entity/);
copy.entities[0].teamId=1;
copy.definitions[0].visualKey="r05.forge.ranger";
assert.throws(()=>bridge.receive(copy,{allowWorldV3:true}),/definition|entity/);
assert.equal(bridge.latest().entities[0].visualKey,"r05.aster.rover");
const rewind=JSON.parse(JSON.stringify(spawned));
assert.throws(()=>bridge.receive(rewind,{allowWorldV3:true}),/epoch/);
bridge.clear();
const v1={version:1,tick:0,map:{width:18,height:11,terrain:Array(198).fill(0)},
  selectedEntityId:1001,cargo:0,phase:"playing",
  entities:[{id:1001,kind:"infantry",ownerId:1,teamId:1,x:1,y:1,hp:5,active:true,order:null}],
  events:[]};
assert.equal(bridge.receive(v1).version,1); // no v3 migration imposed on Courier
assert.throws(()=>bridge.receive(snapshots[0]),/negotiated/);
assert.equal(bridge.latest().version,1);
console.log("PASS: R18 C++ -> JS v3 schema, event parity, epochs, opt-in negotiation and R00 v1 compatibility");
