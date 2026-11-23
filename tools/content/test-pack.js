#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto"),cp=require("node:child_process");
const {build}=require("./pack.js");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"wc-m2-pack-"));
function verify(dir){
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,"pack.json"),"utf8"));
  const provenance=JSON.parse(fs.readFileSync(path.join(dir,"PROVENANCE.json"),"utf8"));
  const coverage=JSON.parse(fs.readFileSync(path.join(dir,"coverage.json"),"utf8"));
  assert.equal(manifest.schema,1);
  const names=new Set(manifest.files.map(x=>x.path));
  for(const filename of ["CCLOCAL.MIX","CONQUER.MIX","GENERAL.MIX","SCM94EA.INI","FACTMAKE.SHP","E1.SHP"]){
    assert(names.has(filename),"Missing required generated file "+filename);
  }
  const digest=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const actual=fs.readdirSync(path.join(dir,"game")).sort();
  assert.deepEqual(actual,[...names].sort(),"Manifest does not match game directory");
  for(const entry of manifest.files){
    const file=path.join(dir,"game",entry.path);
    const stat=fs.statSync(file);
    assert(stat.size>0,"Empty file "+entry.path);
    assert.equal(stat.size,entry.bytes,"Byte count mismatch "+entry.path);
    assert.equal(digest(file),entry.sha256,"Hash mismatch "+entry.path);
  }
  for(const file of manifest.files){
    const p=provenance[file.path];
    assert(p&&p.generator&&p.sourceFiles?.length&&p.license==="CC0-1.0"&&p.sourceRevision);
  }
  assert.equal(coverage.produced+coverage.missing.length,coverage.total);
  return {manifest,provenance,coverage};
}
try{
  // Guard a catastrophic mistyped target before any pack is built.
  assert.throws(()=>build(path.resolve(__dirname,"../..")),/inside build\/ or the OS temp/);
  const occupied=path.join(base,"occupied");
  fs.mkdirSync(occupied);
  fs.writeFileSync(path.join(occupied,"user-work.txt"),"must survive");
  assert.throws(()=>build(occupied),/Refusing to overwrite non-pack directory/);
  assert.equal(fs.readFileSync(path.join(occupied,"user-work.txt"),"utf8"),"must survive");
  build(path.join(base,"first"));
  build(path.join(base,"second"));
  const a=verify(path.join(base,"first")),b=verify(path.join(base,"second"));
  assert.deepEqual(a,b,"two independent pack builds differ");
  // Probe that the hash verifier rejects tampering with an emitted asset.
  const victim=path.join(base,"first/game/SCM94EA.INI");
  fs.appendFileSync(victim,"; tampered\n");
  assert.throws(()=>verify(path.join(base,"first")),/mismatch/);
  // Independent process: no cached build state may mask missing content.
  const secondProcess=path.join(base,"subprocess");
  cp.execFileSync(process.execPath,[path.join(__dirname,"pack.js"),"build",secondProcess],{stdio:"pipe"});
  assert.deepEqual(verify(secondProcess),b,"subprocess build differs");
  console.log("Pack determinism PASS; coverage",JSON.stringify(a.coverage));
}finally{fs.rmSync(base,{recursive:true,force:true});}
