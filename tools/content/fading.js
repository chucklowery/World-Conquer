#!/usr/bin/env node
"use strict";
// Palette fading and translucency tables (*.MRF) for a theater palette.
// tiberiandawn/display.cpp:129 and sidebar.cpp:84 define _RETRIEVE, so the
// stock engine *reads* these tables from game data instead of building them.
// This is a byte-exact port of the engine's own builders, run on our original
// palette: common/fading.cpp (Build_Fading_Table, Conquer_Build_Fading_Table)
// and tiberiandawn/jshell.cpp (Build_Translucent_Table,
// Conquer_Build_Translucent_Table). Parameters come from display.cpp:335-490
// and sidebar.cpp:1306-1323.

// common/wwstd.h ColorType
const C={TBLACK:0,PURPLE:1,CYAN:2,GREEN:3,LTGREEN:4,YELLOW:5,PINK:6,BROWN:7,RED:8,
  LTCYAN:9,LTBLUE:10,BLUE:11,BLACK:12,GREY:13,LTGREY:14,WHITE:15};
const DKGREY=C.GREY,LTGRAY=C.LTGREY,DKGRAY=C.GREY; // tiberiandawn/compat.h:68-70
const CYCLE_COLOR_START=32,CYCLE_COLOR_COUNT=7;    // defines.h:1936-1937

const s8=v=>((v&0xFF)^0x80)-0x80, u8=v=>v&0xFF, s16=v=>((v&0xFFFF)^0x8000)-0x8000;

function idealColor(original,target,fraction){
  const tmp=s16(((original-target)*fraction)<<1);
  return u8(original-(tmp>>8));
}
// common/fading.cpp Build_Fading_Table: search the whole palette except i.
function buildFading(pal,color,frac){
  if(frac>=256)frac=255;
  const fraction=frac>>1,dst=Buffer.alloc(256);
  const tr=pal[color*3],tg=pal[color*3+1],tb=pal[color*3+2];
  dst[0]=0;
  for(let i=1;i<256;i++){
    const ir=idealColor(pal[i*3],tr,fraction),ig=idealColor(pal[i*3+1],tg,fraction),
      ib=idealColor(pal[i*3+2],tb,fraction);
    let matchcolor=color,matchvalue=0xFFFFFFFF;
    for(let j=1;j<256;j++){
      if(i===j)continue;
      let d=s8(pal[j*3]-ir),value=d*d;
      d=s8(pal[j*3+1]-ig);value+=d*d;
      d=s8(pal[j*3+2]-ib);value+=d*d;
      if(value<=matchvalue){matchvalue=value;matchcolor=j;}
      if(value===0)break;
    }
    dst[i]=matchcolor;
  }
  return dst;
}
// common/fading.cpp Conquer_Build_Fading_Table: entries 1..239 map into the
// last 16 colours; entries 240..255 map to themselves.
function conquerFading(pal,color,frac){
  const ALLOWED_COUNT=16,ALLOWED_START=256-ALLOWED_COUNT;
  if(frac>=256)frac=255;
  const fraction=frac>>1,dst=Buffer.alloc(256);
  const tr=pal[color*3],tg=pal[color*3+1],tb=pal[color*3+2];
  dst[0]=0;
  for(let i=1;i<ALLOWED_START;i++){
    const ir=idealColor(s8(pal[i*3]),tr,fraction),ig=idealColor(s8(pal[i*3+1]),tg,fraction),
      ib=idealColor(s8(pal[i*3+2]),tb,fraction);
    let matchcolor=color,matchvalue=0xFFFFFFFF,matchindex=ALLOWED_START;
    for(let j=0;j<ALLOWED_COUNT;j++){
      const k=(ALLOWED_START+j)*3;
      let d=s8(pal[k]-ir),value=d*d;
      d=s8(pal[k+1]-ig);value+=d*d;
      d=s8(pal[k+2]-ib);value+=d*d;
      if(value<matchvalue){matchvalue=value;matchcolor=matchindex;}
      if(value===0)break;
      matchindex++;
    }
    dst[i]=matchcolor;
  }
  for(let i=ALLOWED_START;i<256;i++)dst[i]=i;
  return dst;
}
// jshell.cpp Build_Translucent_Table / Conquer_Build_Translucent_Table:
// a 256-byte lookup (0xFF = opaque) followed by one fading row per colour.
function translucent(pal,control,fade){
  const lookup=Buffer.alloc(256,0xFF),rows=[];
  control.forEach(([source,dest,fading],index)=>{
    lookup[source]=index;
    rows.push(fade(pal,dest,fading));
  });
  return Buffer.concat([lookup,...rows]);
}

// Build every *.MRF table for a theater from its 768-byte, 6-bit palette.
function tables(palette,prefix){
  if(!Buffer.isBuffer(palette)||palette.length!==768)throw Error("Palette must be 768 bytes");
  // display.cpp:405-412 and sidebar.cpp:1312-1314: cycling colours are
  // excluded from remapping by setting them to full white first.
  const pal=Buffer.from(palette);
  pal.fill(0x3F,CYCLE_COLOR_START*3,(CYCLE_COLOR_START+CYCLE_COLOR_COUNT)*3);
  const magic=[];
  for(let c=32;c<40;c++)magic.push([c,c,110]);
  magic.push([C.BLACK,C.BLACK,200],[C.WHITE,C.BLACK,40],[C.LTGREY,C.BLACK,80],[DKGREY,C.BLACK,140]);
  const out={
    GREEN:buildFading(pal,C.GREEN,110),
    YELLOW:buildFading(pal,C.YELLOW,140),
    RED:buildFading(pal,C.RED,140),
    MOUSE:translucent(pal,[[C.BLACK,C.BLACK,110],[C.WHITE,C.WHITE,110],[C.LTGREY,C.LTGREY,110],[DKGREY,DKGREY,110]],buildFading),
    TRANS:translucent(pal,magic,buildFading),
    WHITE:translucent(pal,[[1,C.WHITE,80]],buildFading),
    SHADOW:translucent(pal,[[C.WHITE+1,C.BLACK,130],[C.WHITE,C.BLACK,170],[LTGRAY,C.BLACK,250],[DKGRAY,C.BLACK,250]],buildFading),
    UNITS:translucent(pal,[[C.LTGREEN,C.BLACK,130]],conquerFading),
    SHADE:conquerFading(pal,C.BLACK,150),
    LIGHT:conquerFading(pal,C.WHITE,85),
    CLOCK:translucent(pal,[[C.GREEN,C.LTGREY,180]],buildFading)
  };
  // conquer.cpp Fading_Table_Name: first letter of the theater root + base.
  return Object.fromEntries(Object.entries(out).map(([base,data])=>[prefix+base+".MRF",data]));
}
// Expected sizes: display.h:109-119,324; sidebar ClockTranslucentTable.
const SIZES={GREEN:256,YELLOW:256,RED:256,MOUSE:5*256,TRANS:13*256,WHITE:2*256,
  SHADOW:5*256,UNITS:2*256,SHADE:256,LIGHT:256,CLOCK:2*256};
module.exports={tables,buildFading,conquerFading,translucent,SIZES};
