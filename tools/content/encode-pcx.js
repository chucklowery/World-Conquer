"use strict";
const {rgbPalette}=require("./boot-colors.js");
// Original 8-bit PCX background for high-resolution title mode.
// Header fields follow common/filepcx.h; RLE follows common/filepcx.cpp.
function encodePCX(width=640,height=400,index=5,colors=rgbPalette()){
  if(!Number.isInteger(width)||width<1||width>65535||
     !Number.isInteger(height)||height<1||height>65535||
     !Number.isInteger(index)||index<0||index>255)throw Error("Invalid PCX dimensions");
  const head=Buffer.alloc(128);
  head[0]=10;head[1]=5;head[2]=1;head[3]=8;
  head.writeUInt16LE(width-1,8);head.writeUInt16LE(height-1,10);
  head.writeUInt16LE(width,12);head.writeUInt16LE(height,14);
  head[65]=1;head.writeUInt16LE(width+(width&1),66);
  head.writeUInt16LE(1,68);
  const bytes=[];
  const padded=width+(width&1);
  for(let y=0;y<height;y++){
    let remaining=padded;
    while(remaining){
      const length=Math.min(remaining,63);
      if(length>1||index>=192)bytes.push(0xC0|length,index);
      else bytes.push(index);
      remaining-=length;
    }
  }
  if(!Array.isArray(colors)||colors.length!==256)
    throw Error("PCX requires a 256-entry original indexed palette");
  const palette=Buffer.alloc(769);palette[0]=12;
  for(let i=0;i<256;i++){
    const rgb=colors[i];
    if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(x=>!Number.isInteger(x)||x<0||x>255))
      throw Error("Invalid PCX palette index: "+i);
    for(let channel=0;channel<3;channel++)palette[1+i*3+channel]=rgb[channel];
  }
  return Buffer.concat([head,Buffer.from(bytes),palette]);
}
function verifyPCX(blob){
  if(blob.length<897||blob[0]!==10||blob[1]!==5||blob[3]!==8)throw Error("PCX header");
  const width=blob.readUInt16LE(8)+1,height=blob.readUInt16LE(10)+1;
  let pos=128,pixels=0;
  while(pixels<(width+(width&1))*height&&pos<blob.length-769){
    const n=blob[pos++];if((n&0xC0)===0xC0){pixels+=n&0x3F;pos++;}else pixels++;
  }
  if(pixels!==(width+(width&1))*height||blob[blob.length-769]!==12)throw Error("PCX pixels");
  return true;
}
module.exports={encodePCX,verifyPCX};
