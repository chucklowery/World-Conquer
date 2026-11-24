#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const {encodeIconset,decodeIconset}=require("./encode-iconset.js");
const a=Array.from({length:576},(_,i)=>i%24===0?0:42);
const b=Array.from({length:576},(_,i)=>i%24===0?0:78);
const sample={width:24,height:24,icons:[a,b],map:[1,0,1,1]};
const output=encodeIconset(sample);
assert.equal(output.readUInt32LE(12),32); // stock stamp.cpp TD marker
assert.equal(output.readUInt16LE(4),4);
assert.deepEqual(decodeIconset(output),sample);
assert.throws(()=>decodeIconset(output.subarray(0,30)),/Truncated/);
assert.throws(()=>encodeIconset({...sample,map:[3]}),/map/);
const overlapping=Buffer.from(output);
overlapping.writeUInt32LE(overlapping.readUInt32LE(24)+1,28);
assert.throws(()=>decodeIconset(overlapping),/transparency offsets/);
const zeroImages=Buffer.from(output);
zeroImages.writeUInt32LE(32,24);
assert.throws(()=>decodeIconset(zeroImages),/transparency offsets/);
console.log("PASS: TD icon-set header, raw pixels and tile map round-trip");
