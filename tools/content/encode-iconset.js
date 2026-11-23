#!/usr/bin/env node
"use strict";
// CC0-1.0 geometry-only TD icon-set encoder. Layout: tile.h IControl_Type
// (32 bytes); stamp.cpp checks Icons == 0x20 and draws raw 24x24 pixels.
function encodeIconset({width=24,height=24,icons,map}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
     width>256||height>256||!Array.isArray(icons)||icons.length<1||icons.length>255)
    throw Error("Invalid icon dimensions or count");
  const area=width*height;
  for(const pixels of icons)
    if(!Array.isArray(pixels)||pixels.length!==area||!pixels.every(x=>Number.isInteger(x)&&x>=0&&x<=255))
      throw Error("Invalid indexed pixels");
  const cells=map||icons.map((_,i)=>i);
  if(!Array.isArray(cells)||cells.length<1||cells.length>255||
     !cells.every(i=>Number.isInteger(i)&&i>=0&&i<icons.length))
    throw Error("Invalid logical icon map");
  const iconOffset=32,transOffset=iconOffset+icons.length*area;
  const mapOffset=transOffset+icons.length;
  const buffer=Buffer.alloc(mapOffset+cells.length);
  buffer.writeUInt16LE(width,0);buffer.writeUInt16LE(height,2);
  buffer.writeUInt16LE(cells.length,4);buffer.writeUInt16LE(0,6);
  buffer.writeUInt32LE(buffer.length,8);
  buffer.writeUInt32LE(iconOffset,12);
  buffer.writeUInt32LE(0,16);buffer.writeUInt32LE(0,20);
  buffer.writeUInt32LE(transOffset,24);buffer.writeUInt32LE(mapOffset,28);
  icons.forEach((pixels,i)=>{
    Buffer.from(pixels).copy(buffer,iconOffset+i*area);
    buffer[transOffset+i]=pixels.includes(0)?1:0;
  });
  cells.forEach((i,j)=>{buffer[mapOffset+j]=i;});
  return buffer;
}
function decodeIconset(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<32)throw Error("Truncated icon-set");
  const width=buffer.readUInt16LE(0),height=buffer.readUInt16LE(2);
  const count=buffer.readUInt16LE(4),size=buffer.readUInt32LE(8);
  const start=buffer.readUInt32LE(12),flags=buffer.readUInt32LE(24),mapAt=buffer.readUInt32LE(28);
  if(!width||!height||!count||start!==32||size!==buffer.length||
     flags<start||mapAt<flags||mapAt+count>buffer.length||
     (flags-start)%(width*height)!==0)throw Error("Malformed icon-set");
  const n=(flags-start)/(width*height);
  const icons=Array.from({length:n},(_,i)=>[...buffer.subarray(start+i*width*height,start+(i+1)*width*height)]);
  const map=[...buffer.subarray(mapAt,mapAt+count)];
  if(map.some(i=>i>=n))throw Error("Icon map exceeds image count");
  return {width,height,icons,map};
}
module.exports={encodeIconset,decodeIconset};
