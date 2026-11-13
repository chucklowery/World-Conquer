#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function paeth(a,b,c) {
  const p=a+b-c, pa=Math.abs(p-a), pb=Math.abs(p-b), pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
}
// Strictly supports conventional 8-bit, noninterlaced RGB/RGBA PNGs.
// Explicit rejection avoids silent alpha/palette corruption.
function decodePng(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0,8).equals(signature)) throw new Error("Invalid PNG signature");
  let offset=8,width=0,height=0,channels=0,interlace=0,bitDepth=0;
  const parts=[];let sawIhdr=false,sawEnd=false;
  while(offset+12<=bytes.length){
    const n=bytes.readUInt32BE(offset), type=bytes.toString("ascii",offset+4,offset+8);
    if(n>bytes.length-offset-12)throw new Error("Truncated PNG chunk");
    if(crc32(bytes.subarray(offset+4,offset+8+n))!==bytes.readUInt32BE(offset+8+n))throw new Error(`PNG CRC mismatch in ${type}`);
    const chunk=bytes.subarray(offset+8,offset+8+n);
    if(type==="IHDR"){
      if(sawIhdr||n!==13)throw new Error("Invalid IHDR");sawIhdr=true;
      width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);
      bitDepth=chunk[8];channels=chunk[9]===6?4:chunk[9]===2?3:0;
      interlace=chunk[12];
      if(chunk[10]!==0||chunk[11]!==0)throw new Error("Unsupported PNG compression/filter method");
    }else if(type==="IDAT")parts.push(chunk);
    else if(type==="IEND"){sawEnd=true;break;}
    offset+=12+n;
  }
  if(!sawIhdr||!sawEnd||!parts.length||!width||!height||width>256||height>256||
    bitDepth!==8||!channels||interlace!==0)throw new Error("Unsupported PNG format (use 8-bit RGB/RGBA, noninterlaced, max 256px)");
  const rowBytes=width*channels, expected=(rowBytes+1)*height;
  const raw=zlib.inflateSync(Buffer.concat(parts),{maxOutputLength:expected+1});
  if(raw.length!==expected)throw new Error("Incorrect decompressed PNG length");
  const rgba=Buffer.alloc(width*height*4);
  let prev=Buffer.alloc(rowBytes),cursor=0;
  for(let y=0;y<height;y++){
    const filter=raw[cursor++];if(filter>4)throw new Error("Unsupported PNG row filter");
    const row=Buffer.alloc(rowBytes);
    for(let i=0;i<rowBytes;i++){
      const x=raw[cursor++],a=i>=channels?row[i-channels]:0,b=prev[i],c=i>=channels?prev[i-channels]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      row[i]=(x+predictor)&255;
    }
    for(let x=0;x<width;x++){
      const src=x*channels,dst=(y*width+x)*4;
      row.copy(rgba,dst,src,src+3);rgba[dst+3]=channels===4?row[src+3]:255;
    }
    prev=row;
  }
  return {width,height,rgba};
}
function indexPng(png, colors, maxDistance=0) {
  const palette=colors.map((hex,i)=>{
    if(typeof hex!=="string"||!/^#[0-9a-f]{6}$/i.test(hex))throw new Error(`Invalid palette color ${i}`);
    return [1,3,5].map(p=>parseInt(hex.slice(p,p+2),16));
  });
  if(!palette.length||palette.length>256||colors[0].toUpperCase()!=="#000000")throw new Error("Invalid palette");
  const pixels=[];
  for(let i=0;i<png.rgba.length;i+=4){
    const a=png.rgba[i+3];if(a<128){pixels.push(0);continue;}
    if(a!==255)throw new Error(`Partial alpha at pixel ${i/4}; use opaque or transparent art`);
    let best=-1,bestDistance=Infinity;
    for(let j=1;j<palette.length;j++){
      const c=palette[j],d=Math.hypot(png.rgba[i]-c[0],png.rgba[i+1]-c[1],png.rgba[i+2]-c[2]);
      if(d<bestDistance){bestDistance=d;best=j;}
    }
    if(best<0||bestDistance>maxDistance)throw new Error(`Out-of-palette color at pixel ${i/4} (distance ${bestDistance.toFixed(1)})`);
    pixels.push(best);
  }
  return {width:png.width,height:png.height,pixels};
}
function importFrames(directory,paletteFile) {
  const colors=JSON.parse(fs.readFileSync(paletteFile,"utf8")).colors;
  const names=fs.readdirSync(directory).filter(n=>n.toLowerCase().endsWith(".png")).sort();
  if(!names.length||!names.every((n,i)=>n===String(i).padStart(4,"0")+".png")) {
    throw new Error("Frames must be sequentially named 0000.png, 0001.png, ...");
  }
  const frames=names.map(n=>indexPng(decodePng(fs.readFileSync(path.join(directory,n))),colors));
  if(frames.some(f=>f.width!==frames[0].width||f.height!==frames[0].height))throw new Error("All frames must share dimensions");
  return {frames};
}
if(require.main===module){
  try{
    if(process.argv.length!==5)throw new Error("Usage: node tools/content/png-to-frames.js <numbered-png-directory> <palette.json> <new-frames.json>");
    fs.writeFileSync(process.argv[4],JSON.stringify(importFrames(process.argv[2],process.argv[3]),null,2)+"\n",{flag:"wx"});
  }catch(err){console.error(err.message);process.exitCode=1;}
}
module.exports={decodePng,indexPng,importFrames,crc32};
