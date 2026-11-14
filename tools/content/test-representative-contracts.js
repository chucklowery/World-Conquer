#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {buildContracts,renderDoc}=require("./representative-contracts");

const root=path.resolve(__dirname,"../..");
const contracts=buildContracts();
const stored=JSON.parse(fs.readFileSync(path.join(root,"game/content/wireframes/representative-contracts.json"),"utf8"));
assert.deepEqual(contracts,stored,"Generated frame contracts are stale");
assert.equal(renderDoc(contracts),fs.readFileSync(path.join(root,"docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md"),"utf8"));
assert.equal(contracts.assets.length,6);
const index=new Map(contracts.assets.map(a=>[a.id,a]));
const cpp=fs.readFileSync(path.join(root,"browser/engine/shape_probe.cpp"),"utf8");
const samples=cpp.match(/const int actionFrames\[\] = \{([^}]+)\};/);
assert(samples,"Browser state frame roster missing");
assert.deepEqual(samples[1].split(",").map(s=>Number(s.trim())),contracts.assets.map(a=>a.diagnosticActionFrame));
assert.equal(index.get("WF-0185").minimumFrames,532);
assert.equal(index.get("WF-0185").stateRules.length,34);
assert.equal(index.get("WF-0185").stateRules.find(s=>s.action==="DO_SALUTE2").lastFrame,531);
assert.deepEqual(index.get("WF-0289").stateRules.map(s=>s.start),[0,32]);
assert.deepEqual(index.get("WF-0004").stateRules.map(s=>s.start),[0,32]);
assert(index.get("WF-0013").dependencies.includes("FACTMAKE.SHP"));
assert.deepEqual(index.get("WF-0256").probes,[0,1]);
assert(index.get("WF-0072").remaining.some(s=>s.includes("Stages=-1")));
for(const a of contracts.assets){
  assert(a.probes.every(frame=>frame>=0&&frame<a.placeholderFrames));
  assert(a.minimumFrames<=a.placeholderFrames);
  for(const ref of a.renderSources){
    const line=fs.readFileSync(path.join(root,ref.source),"utf8").split("\n")[ref.line-1];
    assert(line.includes(ref.evidence.split("\n")[0]),ref.source+":"+ref.line);
  }
}
console.log("PASS: six source-derived frame contracts and 34 infantry choreography states");
