#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {inventory,paint,renderSvg}=require("./wireframes");
const {archetype,ARCHETYPES}=require("./first-pass-art");
const {encodeTacticalShape,decodeTacticalShape}=require("./encode-shape");

const root=path.resolve(__dirname,"../../game/content/wireframes");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"first-pass-manifest.json"),"utf8"));
const items=inventory(),byId=new Map(items.map(a=>[a.id,a]));
assert.equal(manifest.schemaVersion,1);
assert.equal(manifest.total,295);
assert.equal(manifest.packable,265);
assert.equal(manifest.designOnly,30);
assert.equal(manifest.assets.length,items.length);
assert.deepEqual(manifest.supplemental,["FACTMAKE.SHP"]);
const hashes=new Set(),seenTypes=new Map();
for(const asset of manifest.assets){
  const original=byId.get(asset.id);
  assert(original,asset.id);
  assert.equal(asset.archetype,archetype(original));
  assert(ARCHETYPES[original.category].includes(asset.archetype));
  const pixels=paint(original,0);
  assert.equal(pixels.length,original.width*original.height);
  assert(pixels.some(c=>c>1),`${asset.id} has no visible art`);
  assert(pixels.some(c=>c===0),`${asset.id} has no transparency`);
  assert(pixels.every(c=>c>=0&&c<=7),`${asset.id} exceeded project palette`);
  const sha=crypto.createHash("sha256").update(Buffer.from(pixels)).digest("hex");
  assert.equal(sha,asset.firstFrameSha256,`stale image hash ${asset.id}`);
  assert(!hashes.has(sha),`duplicate visual identity ${asset.id}`);
  hashes.add(sha);
  assert.equal(asset.runtimeStatus,original.status);
  assert.deepEqual(asset.canvas,[original.width,original.height]);
  assert.equal(asset.provisionalFrames,original.provisionalFrameCount);
  const previewPath=path.join(root,asset.preview);
  assert.equal(fs.readFileSync(previewPath,"utf8"),renderSvg(original));
  if(!seenTypes.has(original.category))seenTypes.set(original.category,new Set());
  seenTypes.get(original.category).add(asset.archetype);
}
assert.equal(hashes.size,295);
for(const [category,types] of seenTypes){
  assert(types.size>=3,`${category} needs at least three art archetypes`);
  const sheet=fs.readFileSync(path.join(root,"sheets",category+".svg"),"utf8");
  assert(sheet.startsWith("<svg")&&sheet.endsWith("</svg>\n"));
  for(const item of items.filter(a=>a.category===category)){
    assert(sheet.includes(item.id),`Missing ${item.id} on ${category} contact sheet`);
  }
}
const probes=[
  ["vehicle","light-wheeled",8],["aircraft","rotorcraft",8],
  ["infantry","civilian",16],["building","civilian",64],
  ["terrain","tree",1],["effect","smoke",8],
  ["projectile","rocket",4],["overlay","resource",1]
];
for(const [category,type,frame] of probes){
  const a=items.find(x=>x.category===category&&archetype(x)===type);
  assert(a,`${category} ${type} missing`);
  assert.notDeepEqual(paint(a,0),paint(a,frame),`${a.id}: first-pass state variation missing`);
  if(a.status!=="design-only"){
    const shape=encodeTacticalShape({frames:[0,frame].map(i=>({width:a.width,height:a.height,pixels:paint(a,i)}))});
    assert.equal(decodeTacticalShape(shape).frames.length,2);
  }
}
console.log(`PASS: ${manifest.total} unique original sprite concepts, 8 category sheets, ${probes.length} state families and ${manifest.packable} tactical-packable slots`);
