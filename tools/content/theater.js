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
  // Flat green clear ground and flat blue water are intentional schematic art
  // (TEMPERAT.PAL terrain entries from boot-colors.js TERRAIN).
  const {TERRAIN}=require("./boot-colors.js");
  const files=["CLEAR1.TEM","W1.TEM"];
  fs.writeFileSync(path.join(stage,files[0]),encodeIconset({icons:[tile(TERRAIN.grass,TERRAIN.grassEdge)],map:Array(16).fill(0)}));
  fs.writeFileSync(path.join(stage,files[1]),encodeIconset({icons:[tile(TERRAIN.water,TERRAIN.waterEdge)]}));
  // odata.cpp:162-353 declares 12 separate harvestable overlay types;
  // odata.cpp:828-839 indexes OverlayData directly as a tactical frame.
  // Supply 16 non-copyrighted growth/adjacency frames for each type.
  const schematic=(seed,frame,width=24,height=24)=>{
    const pixels=Array.from({length:width*height},(_,i)=>{
      const x=i%width,y=Math.floor(i/width);
      const center=Math.abs(x-width/2)+Math.abs(y-height/2);
      if(center>width*0.65)return 0;
      return ((x*7+y*11+frame*5+seed*13)%19)<(4+(frame%12)) ? 74+(seed%12) : 0;
    });
    return {width,height,pixels};
  };
  for(let n=1;n<=12;n++){
    const name="TI"+n+".TEM";
    const frames=Array.from({length:16},(_,i)=>schematic(n,i));
    fs.writeFileSync(path.join(stage,name),encodeTacticalShape({frames}));
    files.push(name);
  }
  // Theater-specific tree source: tdata.cpp:77, terrain.cpp:357.
  const treeName="T01.TEM";
  fs.writeFileSync(path.join(stage,treeName),
    encodeTacticalShape({frames:Array.from({length:16},(_,i)=>schematic(20,i,32,32))}));
  files.push(treeName);

  // Theater data (palette, templates, terrain objects, smudges) is fetched
  // with MFCD::Retrieve, which only searches registered MIX archives.
  for(const name of extra.files){fs.copyFileSync(path.join(extra.dir,name),path.join(stage,name));files.push(name);}
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
