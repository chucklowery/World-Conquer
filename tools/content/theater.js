#!/usr/bin/env node
"use strict";
// Original geometry-only temperate stage; no externally sourced media.
// Format references: tiberiandawn/tile.h:55-69 and common/stamp.cpp:84-102.
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
const {encodeIconset}=require("./encode-iconset.js");
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
function build(game){
  const stage=path.join(path.dirname(game),"_m2_theater");
  fs.mkdirSync(stage,{recursive:true});
  // Flat green clear ground and flat blue water are intentional schematic art.
  const files=["CLEAR1.TEM","W1.TEM"];
  fs.writeFileSync(path.join(stage,files[0]),encodeIconset({icons:[tile(63,45)]}));
  fs.writeFileSync(path.join(stage,files[1]),encodeIconset({icons:[tile(120,124)]}));
  try{
    archive(game,stage,"TEMPERAT.MIX",files);
    archive(game,stage,"TEMPICNH.MIX",files);
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
  // Stock display.cpp:415-490 reads these byte tables directly. Identity
  // lookups are neutral original placeholders, not recolored game media.
  const tables={GREEN:256,YELLOW:256,RED:256,MOUSE:5*256,
    TRANS:13*256,WHITE:2*256,SHADOW:5*256,UNITS:2*256,SHADE:256,LIGHT:256};
  const remaps=[];
  for(const [name,size] of Object.entries(tables)){
    const filename="T"+name+".MRF",data=Buffer.alloc(size);
    for(let i=0;i<size;i++)data[i]=i%256;
    fs.writeFileSync(path.join(game,filename),data);
    remaps.push(filename);
  }
  return ["TEMPERAT.MIX","TEMPICNH.MIX",...remaps];
}
module.exports={build};
