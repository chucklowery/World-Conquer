#!/usr/bin/env node
"use strict";
// Round-trips the WSA encoder (encode-wsa.js) through decoders that mirror
// common/lcw.cpp and common/xordelta.cpp, including long skips, fills and
// literals, and checks the end-of-match score background.
const assert=require("node:assert");
const {encodeWSA,decodeWSA}=require("./encode-wsa.js");
const {placeholder}=require("./placeholders.js");

let seed=7;
const rand=()=>(seed=(seed*1103515245+12345)>>>0)/4294967296;
const W=320,H=200;
const frames=[];
let cur=Buffer.alloc(W*H);
for(let f=0;f<6;f++){
  cur=Buffer.from(cur);
  for(let r=0;r<40;r++){                       // rectangles: fills and skips
    const x=Math.floor(rand()*W),y=Math.floor(rand()*H),w=Math.floor(rand()*120),h=Math.floor(rand()*60);
    const c=Math.floor(rand()*256);
    for(let yy=y;yy<Math.min(H,y+h);yy++)for(let xx=x;xx<Math.min(W,x+w);xx++)cur[yy*W+xx]=c;
  }
  for(let r=0;r<2000;r++)cur[Math.floor(rand()*W*H)]=Math.floor(rand()*256); // literals
  frames.push(cur);
}
frames.push(Buffer.from(frames[frames.length-1]));   // an unchanged frame
const file=encodeWSA({width:W,height:H,frames});
const out=decodeWSA(file);
assert.equal(out.frames.length,frames.length);
frames.forEach((f,i)=>assert.ok(out.frames[i].equals(f),"frame "+i+" differs"));
assert.ok(encodeWSA({width:W,height:H,frames}).equals(file),"encoder is not deterministic");

const score=decodeWSA(placeholder("MLTIPLYR.WSA",{contract:{frames:8}},new Map(),"/nonexistent"));
assert.equal(score.width,320);assert.equal(score.height,200);assert.equal(score.flags,0);
assert.ok(score.frames.length>=2);
const last=score.frames[score.frames.length-1];
assert.equal(last[4*320+4],15,"border reaches the corner on the last frame");
assert.ok(!last.includes(0),"score background has no transparent (index 0) pixels");
console.log("PASS: WSA encoder round-trips "+frames.length+" frames ("+file.length+" bytes); score background valid");
