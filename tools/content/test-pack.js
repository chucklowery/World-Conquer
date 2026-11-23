#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {build}=require("./pack.js");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"wc-m2-pack-"));
function verify(dir){
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,"pack.json"),"utf8"));
  const provenance=JSON.parse(fs.readFileSync(path.join(dir,"PROVENANCE.json"),"utf8"));
  const coverage=JSON.parse(fs.readFileSync(path.join(dir,"coverage.json"),"utf8"));
  assert.equal(manifest.schema,1);
  for(const file of manifest.files){
    const p=provenance[file.path];
    assert(p&&p.generator&&p.sourceFiles?.length&&p.license==="CC0-1.0"&&p.sourceRevision);
  }
  assert.equal(coverage.produced+coverage.missing.length,coverage.total);
  return {manifest,provenance,coverage};
}
try{
  build(path.join(base,"first"));
  build(path.join(base,"second"));
  const a=verify(path.join(base,"first")),b=verify(path.join(base,"second"));
  assert.deepEqual(a,b,"two independent pack builds differ");
  console.log("Pack determinism PASS; coverage",JSON.stringify(a.coverage));
}finally{fs.rmSync(base,{recursive:true,force:true});}
