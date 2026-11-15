#!/usr/bin/env node
"use strict";
// Read-only content gate for every distributable map, including legacy Courier.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const maps=require("./mission-pack");

function validate(directory=path.resolve(__dirname,"../../game/content/missions")){
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,"manifest.json"),"utf8"));
  if(!maps.manifestValid(manifest))throw Error("Invalid versioned map manifest");
  const entries=manifest.maps||[manifest];
  const expected=new Set(entries.map(entry=>entry.file));
  const files=fs.readdirSync(directory).filter(file=>file.endsWith(".map"));
  if(files.length!==expected.size||files.some(file=>!expected.has(file)))
    throw Error("Unlisted or missing map files");
  for(const entry of entries){
    const file=path.join(directory,entry.file),stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.size===0||stat.size>65536)throw Error("Invalid map file size/type: "+entry.file);
    const bytes=fs.readFileSync(file);
    const digest=crypto.createHash("sha256").update(bytes).digest("hex");
    if(digest!==entry.sha256)throw Error("Checksum mismatch: "+entry.file);
    const source=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    const parsed=maps.validate(source);
    if(parsed.id!==entry.id||parsed.width!==entry.width||parsed.height!==entry.height||
       (parsed.version===1?"legacy-v1":"wc-map-v2")!==entry.format)
      throw Error("Invalid map metadata: "+entry.file);
    console.log(`PASS: ${entry.id} (${entry.width}x${entry.height}; SHA-256 ${digest})`);
  }
  return entries.length;
}
if(require.main===module){
  try{console.log(`Validated ${validate()} immutable original-content maps.`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={validate};
