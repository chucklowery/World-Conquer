"use strict";
// Format: 16-bit encoded size (excluding the size field), followed by
// common/iff.h CompHeaderType and a single LCW fill operation (common/lcw.cpp).
function encodeCPS(pixelIndex=5,width=320,height=200) {
  if(!Number.isInteger(pixelIndex)||pixelIndex<0||pixelIndex>255||
     !Number.isInteger(width)||!Number.isInteger(height)||
     width*height<1||width*height>65535) throw Error("Invalid CPS dimensions");
  const lcw=Buffer.from([0xFE,width*height&255,width*height>>8,pixelIndex,0x80]);
  const blob=Buffer.alloc(2+8+lcw.length);
  blob.writeUInt16LE(8+lcw.length,0);
  blob[2]=4; // LCW compression, common/iff.h
  blob.writeUInt32LE(width*height,4);
  blob.writeUInt16LE(0,8);
  lcw.copy(blob,10);
  return blob;
}
function decodeCPS(blob) {
  if(blob.readUInt16LE(0)!==blob.length-2||blob[2]!==4||blob[10]!==0xFE)throw Error("Invalid CPS");
  const n=blob.readUInt32LE(4),count=blob.readUInt16LE(11);
  if(n!==count)throw Error("Invalid CPS run length");
  return Buffer.alloc(n,blob[13]);
}
module.exports={encodeCPS,decodeCPS};
