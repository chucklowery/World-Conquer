#!/usr/bin/env node
"use strict";
// WSA animation encoder and decoder (common/wsa.cpp Open_Animation,
// Apply_Delta). Layout:
//   14-byte header: total_frames, x, y, width, height, largest_frame_size,
//                   flags (bit 0 = palette present; always 0 here)
//   (total_frames + 2) uint32 frame offsets (absolute file positions; the last
//                   entry is 0, which makes the animation linear-only)
//   frame data: each frame is an LCW-compressed (common/lcw.cpp) XOR delta
//                   (common/xordelta.cpp Apply_XOR_Delta) from the previous
//                   frame; frame 0 is a delta from a cleared (all 0) buffer.
// Only the LCW literal and fill commands are emitted, and only the XOR skip,
// literal and fill commands, so the output is simple and deterministic.

const HEADER=14;

// common/xordelta.cpp command set.
function xorDelta(prev,next){
  const out=[];
  let i=0;
  const n=next.length;
  while(i<n){
    let j=i;
    while(j<n&&prev[j]===next[j])j++;
    let skip=j-i;
    while(skip>0){                       // 0x80 + word < 0x8000: skip
      const s=Math.min(skip,0x7FFF);
      if(s<=0x7F)out.push(0x80|s);
      else out.push(0x80,s&0xFF,s>>8);
      skip-=s;
    }
    i=j;
    if(i>=n)break;
    // A changed run ends where 4 or more unchanged bytes start (a cheap skip)
    // or at the end of the frame.
    let k=i;
    while(k<n){
      if(prev[k]!==next[k]){k++;continue;}
      let t=k;
      while(t<n&&prev[t]===next[t]&&t-k<4)t++;
      if(t-k>=4||t===n)break;
      k=t;
    }
    // Emit the run as XOR fills (repeated XOR value) and literals.
    while(i<k){
      const v=prev[i]^next[i];
      let r=i+1;
      while(r<k&&(prev[r]^next[r])===v&&r-i<0x3FFF)r++;
      const len=r-i;
      if(len>=4){
        if(len<=0xFF)out.push(0x00,len,v);
        else out.push(0x80,len&0xFF,0xC0|(len>>8),v);
        i=r;
        continue;
      }
      // Literal until the next fill-worthy run.
      let e=i;
      while(e<k&&e-i<0x3FFF){
        const w=prev[e]^next[e];
        let t=e+1;
        while(t<k&&(prev[t]^next[t])===w&&t-e<4)t++;
        if(t-e>=4)break;
        e++;
      }
      const lit=e-i;
      if(lit<=0x7F)out.push(lit);
      else out.push(0x80,lit&0xFF,0x80|(lit>>8));
      for(let p=i;p<e;p++)out.push(prev[p]^next[p]);
      i=e;
    }
  }
  out.push(0x80,0x00,0x00);
  return Buffer.from(out);
}

// common/lcw.cpp: 0x80|n (n=1..63) copies n literal bytes, 0xFE count value
// fills, 0x80 ends.
function lcw(data){
  const out=[];
  let i=0;
  while(i<data.length){
    let r=i+1;
    while(r<data.length&&data[r]===data[i]&&r-i<0xFFFF)r++;
    if(r-i>=4){out.push(0xFE,(r-i)&0xFF,(r-i)>>8,data[i]);i=r;continue;}
    let e=i;
    while(e<data.length&&e-i<63){
      let t=e+1;
      while(t<data.length&&data[t]===data[e]&&t-e<4)t++;
      if(t-e>=4)break;
      e++;
    }
    out.push(0x80|(e-i));
    for(let p=i;p<e;p++)out.push(data[p]);
    i=e;
  }
  out.push(0x80);
  return Buffer.from(out);
}

function encodeWSA({width,height,x=0,y=0,frames}){
  if(!Array.isArray(frames)||frames.length<1)throw Error("WSA needs at least one frame");
  const size=width*height;
  let prev=Buffer.alloc(size);
  const blobs=[];
  let largest=0;
  for(const f of frames){
    const next=Buffer.from(f);
    if(next.length!==size)throw Error("WSA frame size mismatch");
    const delta=xorDelta(prev,next),packed=lcw(delta);
    // Open_Animation/Apply_Delta load the packed data at the end of the delta
    // buffer and uncompress it in place to the start, so the buffer must
    // hold both without overlap.
    largest=Math.max(largest,delta.length+packed.length);
    blobs.push(packed);
    prev=next;
  }
  if(largest>0xFFFF)throw Error("WSA frame too large for a 16-bit buffer size: "+largest);
  const n=frames.length,table=(n+2)*4;
  const header=Buffer.alloc(HEADER+table);
  header.writeUInt16LE(n,0);header.writeUInt16LE(x,2);header.writeUInt16LE(y,4);
  header.writeUInt16LE(width,6);header.writeUInt16LE(height,8);
  header.writeUInt16LE(largest,10);header.writeUInt16LE(0,12);
  let pos=HEADER+table;
  blobs.forEach((b,i)=>{header.writeUInt32LE(pos,HEADER+i*4);pos+=b.length;});
  header.writeUInt32LE(pos,HEADER+n*4);
  header.writeUInt32LE(0,HEADER+(n+1)*4); // linear only: no loop delta
  return Buffer.concat([header,...blobs]);
}

// Decoders mirror the engine, for tests.
function unlcw(src){
  const out=[];let i=0;
  for(;;){
    const op=src[i++];
    if(op===0x80)return Buffer.from(out);
    if(op===0xFE){const c=src[i]|(src[i+1]<<8),v=src[i+2];i+=3;for(let k=0;k<c;k++)out.push(v);}
    else if((op&0xC0)===0x80){for(let k=0;k<(op&0x3F);k++)out.push(src[i++]);}
    else throw Error("Unsupported LCW command 0x"+op.toString(16));
  }
}
function applyXor(buf,d){
  let p=0,i=0;
  for(;;){
    const cmd=d[i++];
    if(!(cmd&0x80)){
      if(cmd===0){const c=d[i++],v=d[i++];for(let k=0;k<c;k++)buf[p++]^=v;}
      else for(let k=0;k<cmd;k++)buf[p++]^=d[i++];
      continue;
    }
    if(cmd&0x7F){p+=cmd&0x7F;continue;}
    const w=d[i]|(d[i+1]<<8);i+=2;
    if(w===0)return buf;
    if(!(w&0x8000)){p+=w;continue;}
    const c=w&0x3FFF;
    if(w&0x4000){const v=d[i++];for(let k=0;k<c;k++)buf[p++]^=v;}
    else for(let k=0;k<c;k++)buf[p++]^=d[i++];
  }
}
function decodeWSA(file){
  const n=file.readUInt16LE(0),width=file.readUInt16LE(6),height=file.readUInt16LE(8);
  const largest=file.readUInt16LE(10),flags=file.readUInt16LE(12);
  let buf=Buffer.alloc(width*height);
  const frames=[];
  for(let f=0;f<n;f++){
    const a=file.readUInt32LE(HEADER+f*4),b=file.readUInt32LE(HEADER+(f+1)*4);
    const delta=unlcw(file.subarray(a,b));
    if(delta.length+(b-a)>largest)throw Error("Frame "+f+" exceeds largest_frame_size");
    buf=applyXor(Buffer.from(buf),delta);
    frames.push(buf);
  }
  return {width,height,x:file.readUInt16LE(2),y:file.readUInt16LE(4),flags,largest,frames};
}

module.exports={encodeWSA,decodeWSA,xorDelta,lcw};
