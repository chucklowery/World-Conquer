#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {inventory,paint,renderSvg} = require("./wireframes");
const {factory,statePreviewSpecs} = require("./representative-animation");
const base = path.resolve(__dirname,"../../game/content/wireframes");
const assets = new Map(inventory().map(a=>[a.id,a]));
const sample = (id,frame) => paint(assets.get(id),frame);
function different(a,b,label) {assert.notDeepEqual(a,b,`${label} must have visually distinct indexed pixels`);}
function validate(pixels,w,h,label) {
  assert.equal(pixels.length,w*h,label);
  assert(pixels.every(v=>Number.isInteger(v)&&v>=0&&v<=7),label);
  assert(pixels.some(v=>v>1),label);
  assert(pixels.some(v=>v===0),`${label} requires transparent pixels`);
}

// Visual semantics are stronger than merely having nonempty, in-range frames.
const e1="WF-0185", tank="WF-0289", aircraft="WF-0004", fact="WF-0013";
different(sample(e1,0),sample(e1,16),"infantry stand/walk");
different(sample(e1,16),sample(e1,66),"infantry walk/fire");
different(sample(e1,66),sample(e1,192),"infantry fire/prone");
different(sample(e1,192),sample(e1,424),"infantry prone/death");
different(sample(e1,0),sample(e1,511),"infantry stand/salute");
different(sample(tank,0),sample(tank,8),"tank body heading");
different(sample(tank,0),sample(tank,32),"tank body/turret layers");
different(sample(tank,32),sample(tank,40),"tank turret heading");
different(sample(aircraft,0),sample(aircraft,32),"aircraft cruise/high speed");
different(sample(fact,0),sample(fact,5),"construction yard idle/production");
different(sample("WF-0256",0),sample("WF-0256",1),"tree health/damage");
different(sample("WF-0256",1),sample("WF-0256",9),"tree damage/crumble");
different(sample("WF-0072",0),sample("WF-0072",16),"explosion ignition/blast");
different(sample("WF-0072",16),sample("WF-0072",86),"explosion blast/fade");
different(factory(0,true,24),factory(12,true,24),"FACTMAKE foundation/halfway");
different(factory(12,true,24),factory(23,true,24),"FACTMAKE halfway/finished");

// Preserve transparent turret separation: no tank tracks in the turret layer.
const hull=sample(tank,0), turret=sample(tank,32), width=32;
assert(hull[16*width+8]!==0,"tank hull must expose a track at x=8");
assert.equal(turret[16*width+8],0,"tank turret must not paint body tracks");
for(const spec of statePreviewSpecs){
  const a=assets.get(spec.id);
  assert(a,`missing ${spec.id}`);
  const framePixels=spec.supplemental?factory(spec.frame,true,24):sample(spec.id,spec.frame);
  const size=spec.supplemental?48:a.width;
  validate(framePixels,size,size,`${spec.id}/${spec.name}`);
  const svgItem=spec.supplemental?{...a,engineFilename:"FACTMAKE.SHP",provisionalFrameCount:24}:a;
  const expected=renderSvg(svgItem,spec.frame,spec.supplemental?framePixels:null);
  assert.equal(fs.readFileSync(path.join(base,"states",`${spec.id}-${spec.name}.svg`),"utf8"),expected);
}
for(const a of [e1,tank,aircraft,fact,"WF-0256","WF-0072"]){
  const item=assets.get(a);
  for(const frame of [0,Math.floor(item.provisionalFrameCount/2),item.provisionalFrameCount-1]){
    const pixels=sample(a,frame);
    validate(pixels,item.width,item.height,`${a}/${frame}`);
    assert.deepEqual(pixels,sample(a,frame),"animation must be deterministic");
  }
}
for(const frame of [0,12,23])validate(factory(frame,true,24),48,48,`FACTMAKE/${frame}`);
assert.throws(()=>sample(e1,assets.get(e1).provisionalFrameCount),/Out-of-contract/);
console.log(`PASS: six distinct state-aware sprites, FACTMAKE buildup, ${statePreviewSpecs.length} linked previews`);
