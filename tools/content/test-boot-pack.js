"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {build,stringTable}=require("./boot-pack.js");
const {encodeFont,verifyFont}=require("./encode-font.js");
const {encodeCPS,decodeCPS}=require("./encode-cps.js");
const {decodeShape}=require("./encode-shape.js");
const {shape}=require("./boot-pack.js");
assert.equal(verifyFont(encodeFont()),true);
assert.equal(decodeCPS(encodeCPS())[0],5);
assert.equal(decodeCPS(encodeCPS()).length,64000);
assert.equal(decodeShape(shape(16,16,16,5)).frames.length,16);
const eng=stringTable();
assert.equal(eng.readUInt16LE(0),9134);
assert.ok(eng.readUInt16LE(4566*2)<eng.length);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"wc-m1-"));
try{
  const a=build(path.join(tmp,"first")),b=build(path.join(tmp,"second"));
  assert.deepEqual(a,b,"manifest must be deterministic");
  for(const f of a.files){
    assert.deepEqual(fs.readFileSync(path.join(tmp,"first/game",f.path)),
      fs.readFileSync(path.join(tmp,"second/game",f.path)),f.path+" must be deterministic");
  }
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(tmp,"first/PROVENANCE.json")))).length,a.files.length);
  console.log("Original boot pack determinism and format checks passed");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
