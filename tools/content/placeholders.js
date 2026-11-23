#!/usr/bin/env node
"use strict";
// CC0-1.0 placeholders for every engine-requested file that the wireframe
// roster does not cover. Names and shapes are derived from the engine's own
// type tables and the requirements inventory, never from proprietary data.
const fs=require("node:fs"),path=require("node:path");
const {encodeTacticalShape}=require("./encode-shape.js");
const {encodeIconset}=require("./encode-iconset.js");
const ROOT=path.resolve(__dirname,"../..");
const REQUIREMENTS=path.join(ROOT,"game/content/pack/requirements.json");

// Temperate terrain templates: TemplateTypeClass(type, theaters, "NAME", txt,
// land, width, height, ...) in tiberiandawn/cdata.cpp. Templates are icon
// sets (tile.h IControl_Type), one logical icon per template cell.
function templates(){
  const source=fs.readFileSync(path.join(ROOT,"tiberiandawn/cdata.cpp"),"latin1");
  const out=new Map();
  const re=/TemplateTypeClass const\s+\w+\(\s*TEMPLATE_\w+,\s*([^,]+),\s*"([A-Z0-9]+)",\s*\w+,\s*\w+,\s*(\d+),\s*(\d+),/g;
  for(const m of source.matchAll(re)){
    if(!/THEATERF_TEMPERATE/.test(m[1]))continue;
    out.set(m[2]+".TEM",{width:Number(m[3]),height:Number(m[4])});
  }
  if(out.size<100)throw Error("Template table parse failed: "+out.size);
  return out;
}

function frames(count,width,height,draw){
  return {frames:Array.from({length:count},(_,f)=>({width,height,
    pixels:Array.from({length:width*height},(_,i)=>draw(i%width,Math.floor(i/width),f))}))};
}
// Index choices: TEMPERAT.PAL (boot-colors.js) entries; 176-191 is the house
// remap band (const.cpp RemapGold vs RemapRed differ there).
const outline=(color,fill=0)=>(x,y,w,h)=>x===0||y===0||x===w-1||y===h-1?color:fill;
function shape(count,width,height,color,fill=0){
  return encodeTacticalShape(frames(count,width,height,(x,y)=>outline(color,fill)(x,y,width,height)));
}
function tile(color,edge){
  return Array.from({length:576},(_,i)=>{
    const x=i%24,y=Math.floor(i/24);
    return x===0||y===0||x===23||y===23?edge:color;
  });
}

// Kind-specific placeholder contracts. Frame counts are safe upper bounds
// unless a requirement records an exact, code-referenced contract.
function placeholder(name,req,tmpl,stage){
  const upper=name.toUpperCase();
  if(tmpl.has(upper)){
    const {width,height}=tmpl.get(upper);
    return encodeIconset({icons:[tile(34,26)],map:Array(width*height).fill(0)});
  }
  const c=(req&&req.contract)||{};
  const w=Number.isInteger(c.width)?c.width:null,h=Number.isInteger(c.height)?c.height:null;
  const n=Number.isInteger(c.frames)?c.frames:Number.isInteger(c.framesUsedAtMost)?c.framesUsedAtMost:null;
  // TRANS.ICN: placement cursor icons 0 (clear) and 2 (blocked), cell.cpp:1120.
  if(upper==="TRANS.ICN")return encodeIconset({icons:[tile(0,15),tile(0,12),tile(0,8)]});
  // SHADOW.SHP is drawn with SHAPE_GHOST through ShadowTrans (display.cpp:
  // 2530); only colours WHITE+1 (16), WHITE, LTGREY and GREY are translucent
  // (display.cpp ShadowCols). 16 darkens at level 130, 15 at 170.
  if(upper==="SHADOW.SHP")return encodeTacticalShape(frames(n||48,24,24,(x,y)=>(x+y)%2?15:16));
  if(/ICNH\.(SHP|TEM)$/.test(upper))return shape(n||1,w||64,h||48,15,141);
  if(/MAKE\.SHP$/.test(upper)){
    // Build-up length comes from the shape header (bdata.cpp:3839); match the
    // building's own placeholder size so the animation lines up with it.
    const base=path.join(stage,upper.replace(/MAKE\.SHP$/,".SHP"));
    let bw=48,bh=48;
    if(fs.existsSync(base)){const b=fs.readFileSync(base);bw=b.readUInt16LE(6);bh=b.readUInt16LE(8);}
    return encodeTacticalShape(frames(16,bw,bh,(x,y,f)=>
      y>=bh-Math.ceil(bh*(f+1)/16)?outline(15,178)(x,y,bw,bh):0));
  }
  if(upper.endsWith(".TEM"))return shape(n||64,w||48,h||48,178);
  return shape(n||64,w||32,h||32,15);
}

function build(stage,existing){
  const req=JSON.parse(fs.readFileSync(REQUIREMENTS,"utf8"));
  const tmpl=templates();
  const made=[];
  for(const entry of req.files){
    const name=entry.name.toUpperCase();
    if(entry.requiredFor==="optional"||existing.has(name)||entry.generator!=="placeholders")continue;
    fs.writeFileSync(path.join(stage,name),placeholder(name,entry,tmpl,stage));
    made.push(name);
  }
  return made;
}
module.exports={build,templates,placeholder};
