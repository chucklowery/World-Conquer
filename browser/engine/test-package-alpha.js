#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {packageAlpha,files,folders}=require("./package-alpha.js");

const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),"world-conquer-package-"));
try{
  const source=path.join(sandbox,"engine"),target=path.join(sandbox,"site");
  fs.mkdirSync(source);
  for(const file of files)fs.writeFileSync(path.join(source,file),"original-content-fixture");
  for(const folder of folders){
    fs.mkdirSync(path.join(source,folder));
    fs.writeFileSync(path.join(source,folder,"asset.dat"),"fixture");
  }
  fs.writeFileSync(path.join(source,"CMakeCache.txt"),"private build intermediary");
  fs.writeFileSync(path.join(source,"CONQUER.MIX"),"unapproved external game data");
  assert.throws(()=>packageAlpha(source,source),/outside/);
  assert.throws(()=>packageAlpha(source,path.join(source,"nested")),/outside/);
  const result=packageAlpha(source,target,"f00dbabe");
  assert.equal(result.folders,4);
  assert.equal(fs.readFileSync(path.join(target,"index.html"),"utf8"),"original-content-fixture");
  assert.equal(fs.readFileSync(path.join(target,"vanillatd.wasm"),"utf8"),"original-content-fixture");
  assert.equal(fs.readFileSync(path.join(target,"missions","asset.dat"),"utf8"),"fixture");
  assert.equal(JSON.parse(fs.readFileSync(path.join(target,"release.json"))).revision,"f00dbabe");
  assert(fs.existsSync(path.join(target,".nojekyll")));
  assert(!fs.existsSync(path.join(target,"CMakeCache.txt")));
  assert(!fs.existsSync(path.join(target,"CONQUER.MIX")));
  assert.throws(()=>packageAlpha(source,target),/nonempty/);
  fs.unlinkSync(path.join(source,"vanillatd.wasm"));
  assert.throws(()=>packageAlpha(source,path.join(sandbox,"broken")),/ENOENT/);
  console.log("PASS: deployment package, clean index, original assets, revision and overwrite guards");
}finally{fs.rmSync(sandbox,{recursive:true,force:true});}
