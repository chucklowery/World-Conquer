"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const hd = require("./cargo-hd");

const dir = path.resolve(__dirname,"../../game/content/wireframes/hd/WF-0002");
const manifest = hd.verifyManifest(JSON.parse(fs.readFileSync(path.join(dir,"manifest.json"))));
const fetcher = async url => {
  const filename = url.split("/").pop();
  const file = path.join(dir,filename);
  if (!fs.existsSync(file)) return {ok:false};
  const bytes = fs.readFileSync(file);
  return {ok:true,json:async()=>JSON.parse(bytes.toString()),
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const digest = async bytes => crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");

(async()=>{
  const pack = await hd.load("cargo-hd",fetcher,digest);
  assert.equal(pack.frames.length,36);
  assert.deepEqual(pack.manifest.sha256,manifest.sha256);
  assert.throws(()=>hd.verifyManifest({...manifest,frame_count:35}),/contract/);
  const corrupted = async url => {
    const response=await fetcher(url);
    if(url.endsWith("0007.png")) return {...response,arrayBuffer:async()=>Buffer.from([1,2,3])};
    return response;
  };
  await assert.rejects(hd.load("cargo-hd",corrupted,digest),/checksum mismatch/);
  const drawing=[];
  hd.draw({canvas:{width:512,height:512},clearRect:()=>drawing.push("clear"),drawImage:()=>drawing.push("draw")},
    Array(36).fill({}),35);
  assert.deepEqual(drawing,["clear","draw"]);
  assert.throws(()=>hd.draw({},[],36),/Invalid cargo frame/);
  console.log("PASS: 36 verified HD sprites, corruption rejection and canvas dispatch");
})().catch(e=>{console.error(e);process.exitCode=1;});
