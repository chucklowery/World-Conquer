"use strict";
// Command-interface pack stage. Every generator returns
// { ENGINE_NAME: [Raster|frame, ...] } (or a ready Buffer for non-shape
// formats); this module encodes the shapes and writes them into the pack's
// content stage, ahead of the generic placeholders.
const fs=require("node:fs"),path=require("node:path");
const {encodeTacticalShape}=require("../encode-shape.js");
const GENERATORS=["chrome"];
function collect(stage){
  const all={};
  for(const name of GENERATORS){
    const out=require("./"+name+".js").generate(stage);
    for(const [file,value] of Object.entries(out)){
      if(all[file])throw Error("Two UI generators own "+file);
      all[file]={generator:"tools/content/ui/"+name+".js",value};
    }
  }
  return all;
}
function encode(value){
  if(Buffer.isBuffer(value))return value;
  return encodeTacticalShape({frames:value.map(f=>f.toFrame?f.toFrame():f)});
}
function build(stage){
  const made={};
  for(const [file,{generator,value}] of Object.entries(collect(stage))){
    fs.writeFileSync(path.join(stage,file.toUpperCase()),encode(value));
    made[file.toUpperCase()]=generator;
  }
  return made;
}
module.exports={build,collect,encode,GENERATORS};
