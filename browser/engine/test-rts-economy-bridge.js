"use strict";
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const bridge=require("./simulation-bridge.js");
const binary=process.argv[2];
if(!binary)throw Error("Pass compiled test-rts-economy executable");
const [initial,depleted,returned,restarted]=execFileSync(binary,["--json"],{encoding:"utf8"})
  .trim().split("\n").map(JSON.parse);
const opts={capabilities:["economy"]};
assert.equal(initial.version,4);
assert.throws(()=>bridge.receive(initial),/negotiated/);
assert.throws(()=>bridge.receive(initial,{allowWorldV3:true}),/negotiated/);
assert.throws(()=>bridge.receive(initial,{capabilities:["visibility"]}),/negotiated/);
assert.equal(bridge.latest(),null);
for(const s of [initial,depleted,returned,restarted]){
  const next=bridge.receive(s,opts);
  assert(Object.isFrozen(next)&&Object.isFrozen(next.resources)&&
    Object.isFrozen(next.houses)&&Object.isFrozen(next.harvesters));
}
assert.equal(initial.resources[0].remaining,3);
assert.equal(initial.harvesters[0].capacity,20);
assert.equal(depleted.resources[0].remaining,0);
assert.equal(depleted.entities[2].active,false);
assert.deepEqual(depleted.events.map(e=>e.type).slice(0,5),
  ["command","order","harvest_state","resource_delta","cargo_delta"]);
assert.equal(depleted.events.find(e=>e.type==="resource_delta").value,-3);
assert.equal(depleted.events.filter(e=>e.type==="resource_depleted").length,1);
assert.equal(depleted.harvesters[0].cargo,3);
assert.equal(returned.houses[0].credits,3);
assert.equal(returned.houses[1].credits,0);
assert.equal(returned.harvesters[0].cargo,0);
assert.deepEqual(returned.events.filter(e=>e.type.endsWith("_delta")).map(e=>e.value),[-3,3]);
assert.equal(restarted.resources.length,0);
assert.equal(restarted.houses[0].credits,0);
assert.deepEqual(bridge.eventHistory().map(e=>e.type),["restart"]);

function invalid(edit,pattern){
  bridge.clear();
  const bad=JSON.parse(JSON.stringify(initial));
  edit(bad);
  assert.throws(()=>bridge.receive(bad,opts),pattern);
  assert.equal(bridge.latest(),null);
}
invalid(s=>{s.capabilities.push("visibility");},/capabilities/);
invalid(s=>{s.capabilities=["economy","unknown"];},/capabilities/);
invalid(s=>{s.houses[0].credits=-1;},/house/);
invalid(s=>{s.houses[0].credits=1000000001;},/house/);
invalid(s=>{s.resources[0].remaining=4;},/resource/);
invalid(s=>{s.resources[0].entityId=s.entities[0].id;},/resource/);
invalid(s=>{s.resources[0].maxAmount=100001;},/resource/);
invalid(s=>{s.harvesters[0].cargo=21;},/harvester/);
invalid(s=>{s.harvesters[0].capacity=200;},/harvester/);
invalid(s=>{s.harvesters[0].resourceId=s.entities[2].id;},/job state/);
invalid(s=>{s.harvesters[0].jobState="harvesting";},/job state/);
invalid(s=>{s.houses[0].credits="1";},/house/);
invalid(s=>{s.events.push({...depleted.events[3],ownerId:1});},/event/);
invalid(s=>{s.events.push({...returned.events[4],value:1000000001});},/event/);
invalid(s=>{s.version=3;},/negotiated/);
bridge.clear();
const disguised=JSON.parse(JSON.stringify(initial));
disguised.version=3;
assert.throws(()=>bridge.receive(disguised,{allowWorldV3:true}),/Economy fields require/);
assert.equal(bridge.latest(),null);
bridge.clear();
bridge.receive(initial,opts);
assert.throws(()=>bridge.receive(depleted,{capabilities:["economy","visibility"]}),/negotiated/);
assert.equal(bridge.latest().tick,initial.tick);
bridge.receive(depleted,opts);
assert.throws(()=>bridge.receive(initial,opts),/epoch/);
assert.equal(bridge.latest().tick,depleted.tick);
// The actual R04 map seed path keeps a one-to-one native identity/amount
// contract across both authored maps and epoch reloads.
const liveBinary=process.argv[3];
if(liveBinary){
  bridge.clear();
  const maps=execFileSync(liveBinary,["--economy-json"],{encoding:"utf8"})
    .trim().split("\n").map(JSON.parse);
  assert.deepEqual(maps.map(s=>s.map.id),["ridge-pass","ridge-pass","marsh-border"]);
  for(const s of maps){
    assert.equal(s.resources.length,s.map.resources.length);
    assert.equal(s.resources.every(r=>r.remaining===r.maxAmount),true);
    bridge.receive(s,opts);
  }
  assert.equal(maps[0].resources[0].entityId+1048576,maps[1].resources[0].entityId);
  assert.notEqual(maps[1].resources[0].entityId,maps[2].resources[0].entityId);
  bridge.clear();
  const corrupt=JSON.parse(JSON.stringify(maps[0]));
  corrupt.resources[0].maxAmount--;
  corrupt.resources[0].remaining--;
  assert.throws(()=>bridge.receive(corrupt,opts),/map\/resource identity parity/);
  assert.equal(bridge.latest(),null);
}
console.log("PASS: FND-004/005 native v4 -> JS negotiation, economy state, event parity, atomic rejection and epoch history");
