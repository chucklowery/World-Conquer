#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const zlib=require("node:zlib");
const os=require("node:os");
const {inventory,paint,renderSvg}=require("./wireframes");
const {encodeTacticalShape,decodeTacticalShape}=require("./encode-shape");
const {decodePng,indexPng,importFrames,crc32}=require("./png-to-frames");

function chunk(type,data){const name=Buffer.from(type);const result=Buffer.alloc(12+data.length);result.writeUInt32BE(data.length,0);name.copy(result,4);data.copy(result,8);result.writeUInt32BE(crc32(Buffer.concat([name,data])),8+data.length);return result;}
function samplePng(){
  const header=Buffer.alloc(13);header.writeUInt32BE(2,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
  const pixels=Buffer.from([0,0x45,0xcb,0xa2,255,0,0,0,0]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",zlib.deflateSync(pixels)),chunk("IEND",Buffer.alloc(0))]);
}
const assets=inventory();
const repo=path.resolve(__dirname,"../..");
const catalog=JSON.parse(fs.readFileSync(path.join(repo,"game/content/wireframes/catalog.json"),"utf8")).assets;
assert.equal(assets.length,295);
assert.deepEqual(assets,catalog);
assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
for(const a of assets){
  assert(fs.existsSync(path.join(repo,"game/content/wireframes",a.preview)),a.id);
  const pixels=paint(a);assert.equal(pixels.length,a.width*a.height);
  assert(pixels.some(x=>x!==0));assert(pixels.every(x=>x>=0&&x<=7));
  assert(renderSvg(a).includes(a.id));
}
const frameSet={frames:Array.from({length:3},(_,i)=>({width:assets[0].width,height:assets[0].height,pixels:paint(assets[0],i)}))};
assert.deepEqual(decodeTacticalShape(encodeTacticalShape(frameSet)),frameSet);
const png=samplePng();
const decoded=decodePng(png);
assert.equal(decoded.width,2);assert.equal(decoded.height,1);
assert.deepEqual(indexPng(decoded,["#000000","#45cba2"]).pixels,[1,0]);
const bad=Buffer.from(png);bad[bad.length-13]^=1;
assert.throws(()=>decodePng(bad),/CRC mismatch/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"wc-wireframe-import-"));
try{
  const frames=path.join(temp,"frames");fs.mkdirSync(frames);
  fs.writeFileSync(path.join(frames,"0000.png"),png);
  const palette=path.join(temp,"palette.json");fs.writeFileSync(palette,JSON.stringify({colors:["#000000","#45cba2"]}));
  assert.deepEqual(importFrames(frames,palette).frames[0].pixels,[1,0]);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`PASS: ${assets.length} catalog slots, previews, tactical frames and PNG artwork import`);
