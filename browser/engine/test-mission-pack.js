"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const pack=require("./mission-pack");
const game=require("./vertical-slice");
const dir=path.resolve(__dirname,"../../game/content/missions");
const manifest=JSON.parse(fs.readFileSync(path.join(dir,"manifest.json")));
assert(pack.manifestValid(manifest));
for(const entry of manifest.maps){
  const bytes=fs.readFileSync(path.join(dir,entry.file));
  const digest=crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest,entry.sha256);
  assert.equal(pack.validate(bytes.toString("utf8")).width,entry.width);
}
const fetcher=async url=>{
  const name=url.split("/").pop(),file=path.join(dir,name);
  if(!fs.existsSync(file))return {ok:false};
  const b=fs.readFileSync(file);
  return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
};
const hash=async input=>crypto.createHash("sha256").update(Buffer.from(input)).digest("hex");
(async()=>{
  const collection=await pack.list("missions",fetcher);
  assert.equal(collection.maps.length,3);
  const result=await pack.load("missions",fetcher,hash);
  const state=game.start(result.map);
  assert.equal(state.units[0].x,1);
  assert.equal(state.units[2].x,10);
  assert.equal(state.crates[1].y,4);
  assert.equal(state.walls.size,14);
  assert.deepEqual(game.parseMap(result.map).markers.X,{x:16,y:9});
  assert.throws(()=>pack.validate(result.map.replace(".S...#",".S...S")),/marker/);
  assert.throws(()=>game.parseMap(result.map.replace(".S...#",".S...S")),/Duplicate/);
  const bad=async url=>url.endsWith(".map")?{ok:true,arrayBuffer:async()=>new Uint8Array([1,2]).buffer}:fetcher(url);
  await assert.rejects(pack.load("missions",bad,hash),/checksum mismatch/);
  for(const [id,width,height] of [["ridge-pass",16,10],["marsh-border",24,14]]){
    const loaded=await pack.load("missions",fetcher,hash,id);
    assert.equal(loaded.parsed.width,width);
    assert.equal(loaded.parsed.height,height);
    assert.equal(loaded.parsed.version,2);
    assert.equal(loaded.parsed.id,id);
    assert.equal(loaded.parsed.resources.length,2);
    assert(loaded.parsed.costs.includes(2));
    assert(loaded.parsed.costs.includes(3));
    assert(loaded.parsed.costs.includes(0));
  }
  await assert.rejects(pack.load("missions",fetcher,hash,"../../etc/passwd"),/Unknown mission map/);
  assert(!pack.manifestValid({...manifest,maps:[...manifest.maps,manifest.maps[0]]}));
  assert(!pack.manifestValid({...manifest,maps:[{...manifest.maps[0],file:"../../evil.map"}]}));
  const map=fs.readFileSync(path.join(dir,"ridge-pass.map"),"utf8");
  for(const invalid of [map+"\ninjected",map.replace("size 16 10","size 99999 10"),
    map.replace("unit S 1 2","unit S 20 2"),map.replace("base 1 0 1","base 1 10 1"),
    map.replace("resource 7 3 450","resource 7 3 0"),map.replace("endmap","<script>"),
    map.replace("title Ridge Pass","title \";alert(1)"),"X".repeat(65537)])
    assert.throws(()=>pack.validate(invalid));
  const forged=async url=>{
    if(url.endsWith("ridge-pass.map")){
      const bytes=Buffer.from(map.replace("unit S 1 2","unit S 2 2"));
      return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
    }
    return fetcher(url);
  };
  await assert.rejects(pack.load("missions",forged,hash,"ridge-pass"),/checksum mismatch/);
  console.log("PASS: three pinned maps, legacy Courier, map selection, malicious input and corruption guards");
})().catch(e=>{console.error(e);process.exitCode=1;});
