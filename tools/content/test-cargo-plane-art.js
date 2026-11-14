#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {paintCargo,makePng,stateSvg,atlasSvg,samples,frameCount}=require("./cargo-plane-art");
const {decodePng,importFrames}=require("./png-to-frames");
const {decodeTacticalShape}=require("./encode-shape");
const {inventory,paint,renderSvg,build}=require("./wireframes");

const root=path.resolve(__dirname,"../..");
const media=path.join(root,"game/content/wireframes");
const final=path.join(media,"final/WF-0002");
const palette=path.join(root,"game/content/source/placeholder.palette.json");
const slot=inventory().find(a=>a.id==="WF-0002");
assert(slot&&slot.engineEnum==="AIRCRAFT_CARGO"&&slot.engineFilename==="C17.SHP");
assert.equal(slot.provisionalFrameCount,80);assert.equal(frameCount,80);
assert.deepEqual([slot.width,slot.height],[32,32]);
assert.deepEqual(slot.sharedFilenameWith,[]);
const files=fs.readdirSync(final).filter(name=>name.endsWith(".png")).sort();
assert.equal(files.length,80);
assert.deepEqual(files,Array.from({length:80},(_,i)=>`${String(i).padStart(4,"0")}.png`));
const imported=importFrames(final,palette).frames;
assert.equal(imported.length,frameCount);
const provenance=JSON.parse(fs.readFileSync(path.join(final,"ATTRIBUTION.json"),"utf8"));
for(const key of ["creator","license","source","revision"])assert(typeof provenance[key]==="string"&&provenance[key].length);
assert.equal(provenance.stage,"draft");
const hashes=new Set();
for(let i=0;i<frameCount;i++){
  const frame=imported[i];
  assert.deepEqual([frame.width,frame.height],[32,32]);
  assert.deepEqual(frame.pixels,paintCargo(i),`WF-0002 frame ${i} differs from authored source`);
  assert.deepEqual(frame.pixels,paint(slot,i));
  assert(frame.pixels.some(c=>c===0)&&frame.pixels.some(c=>c>1));
  assert(frame.pixels.every(c=>c>=0&&c<=7));
  const png=decodePng(fs.readFileSync(path.join(final,files[i])));
  assert(png.rgba.every((byte,offset)=>offset%4!==3||byte===0||byte===255),`bad alpha in ${files[i]}`);
  assert.deepEqual(makePng(frame.pixels),fs.readFileSync(path.join(final,files[i])));
  hashes.add(Buffer.from(frame.pixels).toString("base64"));
}
assert(hashes.size>=60,"Too many visually duplicate cargo poses");
for(let frame=0;frame<32;frame++){
  const pixels=paintCargo(frame);
  for(let i=0;i<32;i++){
    assert.equal(pixels[i],0,`top clipping frame ${frame}`);
    assert.equal(pixels[31*32+i],0,`bottom clipping frame ${frame}`);
    assert.equal(pixels[i*32],0,`left clipping frame ${frame}`);
    assert.equal(pixels[i*32+31],0,`right clipping frame ${frame}`);
  }
}
for(const frame of [8,16,24,31,32,33,34,35,40,64])assert.notDeepEqual(paintCargo(0),paintCargo(frame));
for(let frame=32;frame<35;frame++)assert.notDeepEqual(paintCargo(frame),paintCargo(frame+1));
assert.equal(fs.readFileSync(path.join(media,slot.preview),"utf8"),renderSvg(slot));
for(const spec of samples)assert.equal(fs.readFileSync(path.join(media,"states",`WF-0002-${spec.key}.svg`),"utf8"),stateSvg(spec));
assert.equal(fs.readFileSync(path.join(media,"states/WF-0002-atlas.svg"),"utf8"),atlasSvg());

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"world-conquer-cargo-"));
try{
  const destination=path.join(temp,"cargo-pack");
  build(destination,["WF-0002"]);
  const manifest=JSON.parse(fs.readFileSync(path.join(destination,"manifest.json"),"utf8"));
  const entry=manifest.assets.find(a=>a.id==="WF-0002");
  assert(entry);assert.equal(entry.status,"authored-draft");
  assert.equal(entry.provenance.stage,"draft");
  assert.equal(entry.engineFilename,"C17.SHP");
  const shape=fs.readFileSync(path.join(destination,"game-root/C17.SHP"));
  const decoded=decodeTacticalShape(shape);
  assert.equal(decoded.frames.length,80);
  for(const frame of [0,8,16,24,32,33,34,35,40,64,79]){
    assert.deepEqual(decoded.frames[frame].pixels,imported[frame].pixels);
  }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`PASS: WF-0002 authored ${frameCount} palette-safe PNGs, ${samples.length} poses, native-format SHP and draft provenance`);
