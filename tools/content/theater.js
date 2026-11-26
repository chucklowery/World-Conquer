#!/usr/bin/env node
"use strict";
// Original geometry-only temperate stage; no externally sourced media.
// Format references: tiberiandawn/tile.h:55-69 and common/stamp.cpp:84-102.
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {encodeIconset}=require("./encode-iconset.js");
const {encodeTacticalShape}=require("./encode-shape.js");
const {nativeMixer}=require("./boot-pack.js");
function tile(color,edge=18){
  return Array.from({length:576},(_,i)=>{
    const x=i%24,y=Math.floor(i/24);
    return x===0||y===0||x===23||y===23?edge:((x*7+y*11)%31===0?edge:color);
  });
}
function archive(game,stage,name,files){
  const result=cp.spawnSync(nativeMixer(),["--create","--directory",stage,
    ...files.flatMap(x=>["--file",x]),path.join(game,name)],{encoding:"utf8"});
  if(result.error||result.status!==0)throw Error("Theater MIX "+name+": "+(result.error||result.stderr||result.stdout));
  const lower=path.join(game,name.toLowerCase()),upper=path.join(game,name);
  if(fs.existsSync(lower)&&lower!==upper)fs.renameSync(lower,upper);
  if(!fs.existsSync(upper))throw Error("Theater MIX missing: "+name);
}
function build(game,extra={dir:null,files:[]}){
  const stage=path.join(path.dirname(game),"_m2_theater");
  fs.mkdirSync(stage,{recursive:true});
  // M5 terrain art (tools/content/art/terrain.js): every temperate template
  // painted from the engine's own land mask, the crystal overlay and trees.
  const terrain=require("./art/terrain.js");
  const files=[];
  const artFiles=[];
  for(const [name,{t,icons}] of Object.entries(terrain.templates())){
    fs.writeFileSync(path.join(stage,name),encodeIconset({icons,map:icons.map((_,i)=>i)}));
    files.push(name);artFiles.push(name);
  }
  // odata.cpp:162-353 declares 12 harvestable overlay types; odata.cpp:
  // 828-839 draws OverlayData (growth stage 0..11) as the frame.
  for(let n=1;n<=12;n++){
    const name="TI"+n+".TEM";
    fs.writeFileSync(path.join(stage,name),encodeTacticalShape({frames:terrain.crystalFrames(n)}));
    files.push(name);artFiles.push(name);
  }
  // Theater-specific tree source: tdata.cpp:77, terrain.cpp:357.
  fs.writeFileSync(path.join(stage,"T01.TEM"),encodeTacticalShape({frames:terrain.treeFrames()}));
  files.push("T01.TEM");artFiles.push("T01.TEM");
  // Building aprons, craters and scorch marks (sdata.cpp).
  for(const [name,frames] of Object.entries(terrain.smudges())){
    fs.writeFileSync(path.join(stage,name),encodeTacticalShape({frames}));
    files.push(name);artFiles.push(name);
  }
  build.artFiles=artFiles;

  // Theater data (palette, templates, terrain objects, smudges) is fetched
  // with MFCD::Retrieve, which only searches registered MIX archives.
  // Placeholders cover the rest; generated terrain art wins on a name clash.
  for(const name of extra.files){
    if(files.includes(name))continue;
    fs.copyFileSync(path.join(extra.dir,name),path.join(stage,name));files.push(name);
  }
  // display.cpp:129 and sidebar.cpp:84 define _RETRIEVE: the engine reads its
  // palette fading/translucency tables from data. Build them from our palette.
  const paletteFile=path.join(stage,"TEMPERAT.PAL");
  if(fs.existsSync(paletteFile)){
    for(const [name,data] of Object.entries(require("./fading.js").tables(fs.readFileSync(paletteFile),"T"))){
      fs.writeFileSync(path.join(stage,name),data);files.push(name);
    }
  }
  try{
    archive(game,stage,"TEMPERAT.MIX",files);
    archive(game,stage,"TEMPICNH.MIX",files);
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
  // The engine computes and writes its own fading tables (display.cpp).
  return ["TEMPERAT.MIX","TEMPICNH.MIX"];
}
module.exports={build};
