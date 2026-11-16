"use strict";
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const bridge=require("./simulation-bridge.js");
const hud=require("./tactical-hud.js");
const binary=process.argv[2];
if(!binary)throw Error("Pass compiled test-rts-live-match executable");
const snapshots=execFileSync(binary,["--json"],{encoding:"utf8"})
  .trim().split("\n").map(JSON.parse);
assert.equal(snapshots.length,9);
assert(snapshots.every(s=>s.version===3));
const [ridge,moved,restarted,marsh,attacking,fightStart,fighting,won,revived]=snapshots;
assert.equal(ridge.map.id,"ridge-pass");
assert.equal(ridge.map.width,16);
assert.equal(ridge.map.height,10);
assert.equal(ridge.commandStates.length,6);
assert.deepEqual(ridge.entities.slice(0,4).map(e=>e.definitionId),
  ["game.aster.ranger","game.aster.ranger","game.forge.ranger","game.forge.ranger"]);
assert.equal(ridge.entities.filter(e=>e.ownerId===0).length,2);
assert.equal(ridge.selectedEntityId,0);
const mapModel=hud.create();
hud.applyWorldSnapshot(mapModel,ridge);
assert.equal(mapModel.width,16);
assert.equal(mapModel.units.length,6);
assert.deepEqual(mapModel.teams,[1,1,2,2,1,2]);
assert.equal(mapModel.selected,-1);
assert.equal(hud.inspect(mapModel,ridge.entities[0].x,ridge.entities[0].y).startsWith("Aster"),true);
assert.throws(()=>bridge.receive(ridge),/negotiated/);
for(const s of [ridge,moved,restarted]){
  const accepted=bridge.receive(s,{allowWorldV3:true});
  assert(Object.isFrozen(accepted)&&Object.isFrozen(accepted.map.resources));
}
assert.equal(bridge.latest().epoch,2);
assert.equal(restarted.events[0].type,"restart");
bridge.clear();
assert.equal(bridge.receive(marsh,{allowWorldV3:true}).map.width,24);
assert.equal(bridge.receive(attacking,{allowWorldV3:true}).map.height,14);
function invalid(edit,pattern){
  const bad=JSON.parse(JSON.stringify(attacking));
  edit(bad);
  assert.throws(()=>bridge.receive(bad,{allowWorldV3:true}),pattern);
  assert.equal(bridge.latest().map.id,"marsh-border");
}
invalid(s=>{s.map.costs[0]=9;},/map metadata/);
invalid(s=>{s.map.spawns[0].house=2;},/spawns/);
invalid(s=>{s.map.resources[0].amount=-1;},/resource/);
invalid(s=>{s.commandStates[0].queued=9;},/command state/);
invalid(s=>{s.commandStates[0].entityId=s.entities[6].id;},/command state/);
invalid(s=>{s.commandStates[0].kind="production";},/command state/);
bridge.clear();
for(const s of [fightStart,fighting,won,revived])
  bridge.receive(s,{allowWorldV3:true});
assert.equal(fighting.events.some(e=>e.type==="shot"),true);
assert.equal(fighting.events.some(e=>e.type==="hit"),true);
assert.equal(fighting.events.some(e=>e.type==="damage"),true);
assert.equal(won.phase,"won");
assert(won.entities.some(e=>e.lifecycle==="dead"));
hud.applyWorldSnapshot(mapModel,won);
assert.equal(mapModel.units.length,6);
assert(mapModel.units.some(u=>u.hp===0));
assert.equal(revived.epoch,2);
assert.equal(revived.phase,"playing");
console.log("PASS: R02/R03/R04 integrated native v3 -> JS, map metadata, dynamic commands, epoch and invalid-input guards");
