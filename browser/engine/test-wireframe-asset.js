#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {load} = require("./wireframe-asset");
const {representativeRoster} = require("../../tools/content/wireframes");
const {buildContracts} = require("../../tools/content/representative-contracts");
const {decodeTacticalShape} = require("../../tools/content/encode-shape");

const roster = {schemaVersion:1, assets:representativeRoster()};
const contracts = buildContracts();
const digest = async buffer => crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function fixture() {
  const blobs = new Map();
  const assets = [];
  const palette = Buffer.alloc(768, 3);
  blobs.set("WIREFRAME.PAL", palette);
  assets.push({id:"palette.wireframe",target:"WIREFRAME.PAL",bytes:palette.length,sha256:hash(palette)});
  for (const [i, a] of roster.assets.entries()) {
    const bytes = Buffer.from([82, 84, 83, i, 7, 10]);
    const target = `${a.category}/${a.id}.SHP`;
    blobs.set(target, bytes);
    assets.push({id:a.id,engineEnum:a.engineEnum,engineFilename:a.engineFilename,target,
      sharedFilenameWith:[],mountReady:true,frames:contracts.assets.find(c=>c.id===a.id).placeholderFrames,width:32,height:32,
      bytes:bytes.length,sha256:hash(bytes)});
  }
  const buildup=Buffer.from([82,84,83,70,65,67,84,77,65,75,69]);
  blobs.set("building/FACTMAKE.SHP",buildup);
  assets.push({id:"supplemental.fact-buildup",supportingFor:"WF-0013",engineFilename:"FACTMAKE.SHP",
    target:"building/FACTMAKE.SHP",sharedFilenameWith:[],mountReady:true,
    frames:24,width:48,height:48,bytes:buildup.length,sha256:hash(buildup)});
  return {manifest:{schemaVersion:1,gameId:"world-conquer-wireframes",assets},blobs,contracts};
}
function memoryFs(existing = []) {
  const files = new Map(existing.map(n=>[n,Buffer.from([1])]));
  let directory = false;
  return {files,analyzePath:p=>({exists:p==="/game"?directory:files.has(p)}),
    mkdir:p=>{assert.equal(p,"/game");directory=true;},
    writeFile:(p,b)=>files.set(p,Buffer.from(b))};
}
function fixtureFetcher(data, customRoster=roster) {
  return async url => {
    if (url === "wireframes/manifest.json") return {ok:true,json:async()=>data.manifest};
    if (url === "wireframes/roster.json") return {ok:true,json:async()=>customRoster};
    if (url === "wireframes/contracts.json") return {ok:true,json:async()=>data.contracts};
    const target=url.slice("wireframes/files/".length);
    const bytes=data.blobs.get(target);
    return bytes?{ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer}:{ok:false,status:404};
  };
}
async function main() {
  const data=fixture(), vfs=memoryFs();
  const result=await load(vfs,"wireframes/manifest.json",fixtureFetcher(data),digest);
  assert.deepEqual({count:result.count,shapes:result.shapes},{count:8,shapes:7});
  assert.deepEqual(vfs.files.get("/game/WIREFRAME.PAL"),data.blobs.get("WIREFRAME.PAL"));
  for(const entry of roster.assets){
    assert.deepEqual(vfs.files.get("/game/"+entry.engineFilename),data.blobs.get(`${entry.category}/${entry.id}.SHP`));
  }
  assert.deepEqual(vfs.files.get("/game/FACTMAKE.SHP"),data.blobs.get("building/FACTMAKE.SHP"));
  await assert.rejects(load(vfs,"wireframes/manifest.json",fixtureFetcher(data),digest),/already staged/);
  await assert.rejects(load(memoryFs(),"/outside/manifest.json",fixtureFetcher(data),digest),/Invalid wireframe manifest URL/);

  // A single checksum failure must not stage any of the earlier, valid files.
  const altered=fixture(), clean=memoryFs();
  altered.manifest.assets[3].sha256="0".repeat(64);
  await assert.rejects(load(clean,"wireframes/manifest.json",fixtureFetcher(altered),digest),/integrity/);
  assert.equal(clean.files.size,0);

  const colliding=fixture(), clean2=memoryFs();
  colliding.manifest.assets[2].mountReady=false;
  await assert.rejects(load(clean2,"wireframes/manifest.json",fixtureFetcher(colliding),digest),/Unverified or colliding/);
  assert.equal(clean2.files.size,0);

  const incomplete=fixture(), clean3=memoryFs();
  incomplete.contracts=JSON.parse(JSON.stringify(incomplete.contracts));
  incomplete.contracts.assets[0].probes=[9999];
  await assert.rejects(load(clean3,"wireframes/manifest.json",fixtureFetcher(incomplete),digest),/Invalid frame contract/);
  assert.equal(clean3.files.size,0);

  const absent=fixture(), clean4=memoryFs();
  absent.manifest.assets=absent.manifest.assets.filter(a=>a.id!=="supplemental.fact-buildup");
  await assert.rejects(load(clean4,"wireframes/manifest.json",fixtureFetcher(absent),digest),/Incomplete roster/);
  assert.equal(clean4.files.size,0);
  const badBuild=fixture(), clean5=memoryFs();
  badBuild.manifest.assets.find(a=>a.id==="supplemental.fact-buildup").frames=1;
  await assert.rejects(load(clean5,"wireframes/manifest.json",fixtureFetcher(badBuild),digest),/Invalid FACTMAKE/);
  assert.equal(clean5.files.size,0);

  const duplicate={schemaVersion:1,assets:roster.assets.map(a=>({...a}))};
  duplicate.assets[2].engineFilename=duplicate.assets[0].engineFilename;
  await assert.rejects(load(memoryFs(),"wireframes/manifest.json",fixtureFetcher(fixture(),duplicate),digest),/duplicate wireframe roster/);
  const missing=fixture();missing.blobs.delete("infantry/WF-0185.SHP");
  await assert.rejects(load(memoryFs(),"wireframes/manifest.json",fixtureFetcher(missing),digest),/file HTTP 404/);
  const occupied=memoryFs(["/game/E1.SHP"]);
  await assert.rejects(load(occupied,"wireframes/manifest.json",fixtureFetcher(fixture()),digest),/already staged: \/game\/E1.SHP/);
  assert.deepEqual(occupied.files.get("/game/E1.SHP"),Buffer.from([1]));

  if(process.argv[2]){
    const base=path.resolve(process.argv[2]);
    const manifest=JSON.parse(fs.readFileSync(path.join(base,"manifest.json"),"utf8"));
    const packRoster=JSON.parse(fs.readFileSync(path.join(base,"roster.json"),"utf8"));
    const packContracts=JSON.parse(fs.readFileSync(path.join(base,"contracts.json"),"utf8"));
    const realBlobs=new Map(manifest.assets.map(a=>[a.target,fs.readFileSync(path.join(base,"files",a.target))]));
    const realFs=memoryFs();
    const real=await load(realFs,"wireframes/manifest.json",fixtureFetcher({manifest,blobs:realBlobs,contracts:packContracts},packRoster),digest);
    assert.equal(real.count,8);
    for(const expected of packRoster.assets){
      const bytes=realFs.files.get("/game/"+expected.engineFilename);
      assert(bytes.length>22);
      const decoded=decodeTacticalShape(bytes);
      const metadata=manifest.assets.find(a=>a.id===expected.id);
      assert.equal(decoded.frames.length,metadata.frames);
      assert.equal(decoded.frames[0].width,metadata.width);
      assert.equal(decoded.frames[0].height,metadata.height);
      assert(decoded.frames[0].pixels.some(pixel=>pixel>1));
      const contract=packContracts.assets.find(a=>a.id===expected.id);
      for(const frame of contract.probes)assert(decoded.frames[frame].pixels.some(pixel=>pixel>1));
    }
    const buildup=decodeTacticalShape(realFs.files.get("/game/FACTMAKE.SHP"));
    assert.equal(buildup.frames.length,24);
    assert.equal(buildup.frames[0].width,48);
    assert.notDeepEqual(buildup.frames[0].pixels,buildup.frames[12].pixels);
    assert.notDeepEqual(buildup.frames[12].pixels,buildup.frames[23].pixels);
  }
  console.log("PASS: six-class roster, manifest integrity, MEMFS staging, collisions, duplicates and atomic failure");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
