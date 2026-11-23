#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {generate,decodeBIN,cell}=require("./scenario.js");
const source=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../game/content/scenarios/foundry-test-range.json"),"utf8"));
const {ini,bin}=generate(source);
assert.equal(bin.length,8192); // map.cpp:1130-1141: 4096 packed 2-byte cells
assert.equal(decodeBIN(bin)[cell([31,31])].template,1);
assert.equal(decodeBIN(bin)[cell([1,1])].template,0);
assert.match(ini,/\[Basic\][\s\S]*Name=Foundry Test Range/);
assert.match(ini,/\[Map\][\s\S]*Width=62/);
assert.match(ini,new RegExp("0="+cell([10,10])));
assert.match(ini,new RegExp("1="+cell([53,53])));
assert.match(ini,/\[Overlay\][\s\S]*TI1/);
assert.throws(()=>generate({...source,map:{...source.map,width:64}}),/bounds/);
assert.throws(()=>decodeBIN(bin.subarray(0,8190)),/size/);
assert.deepEqual(generate(source),generate(source),"generator must be deterministic");
console.log("PASS: original scenario INI and 4096-cell BIN round-trip");
