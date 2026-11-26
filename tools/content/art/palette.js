"use strict";
// M5 game palette (TEMPERAT.PAL). Original, generated values (CC0).
//
// The engine gives some indices a fixed meaning, so those keep the values
// boot-colors.js chose for the M1-M4 text and dialogs:
//   0-15     engine colour names (common/wwstd.h ColorType; 0 transparent,
//            12 BLACK is the shroud, 13 GREY, 14 LTGREY, 15 WHITE)
//   16, 25, 202, 209, 233-237  text shades (boot-colors.js)
//   139-141, 159, 167          title and dialog fills
//   32-38    colour cycling (defines.h:1936-1937): used for water shimmer
//   176-191  house remap band. Art paints house colour here: 176-183 is one
//            bright-to-dark ramp, 184-191 a second one.
// Each house's remap table (tiberiandawn/const.cpp:274-406) sends the band
// to other indices. Those targets get that house's colour ramp, in the same
// bright-to-dark order, so a remapped unit shows its owner's colour instead of
// whatever the palette happened to hold there.
//
// Everything else is laid out as named ramps (RAMPS below) that the art
// generator (tools/content/art/) and the theater generator draw with.
const {basePalette}=require("../boot-colors.js");

const lerp=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
// n colours from bright to dark through the given stops.
function ramp(stops,n){
  const out=[];
  for(let i=0;i<n;i++){
    const t=n===1?0:i/(n-1)*(stops.length-1);
    const k=Math.min(stops.length-2,Math.floor(t));
    out.push(lerp(stops[k],stops[k+1],t-k));
  }
  return out;
}

// Named ramps: first index and colours, brightest first.
const RAMPS={
  steel:  {start:48, colors:ramp([[236,240,244],[168,178,188],[98,108,120],[44,50,60],[16,18,24]],16)},
  olive:  {start:64, colors:ramp([[226,222,170],[164,160,104],[104,104,64],[56,58,36],[22,24,14]],16)},
  earth:  {start:80, colors:ramp([[228,200,150],[178,140,92],[124,92,56],[76,54,32],[34,24,14]],16)},
  grass:  {start:96, colors:ramp([[170,206,110],[112,160,64],[72,120,42],[44,84,28],[20,44,14]],16)},
  water:  {start:128,colors:ramp([[120,176,220],[60,116,180],[30,70,130],[14,36,74]],7)},
  shimmer:{start:32, colors:ramp([[96,150,206],[54,104,168],[40,86,150],[54,104,168],[86,140,198]],7)},
  fire:   {start:144,colors:ramp([[255,252,220],[255,224,96],[250,150,40],[214,70,20],[120,24,10],[40,10,6]],13)},
  crystal:{start:168,colors:ramp([[214,255,250],[96,232,214],[30,170,170],[14,96,110],[6,40,52]],8)},
  sand:   {start:192,colors:ramp([[244,232,200],[210,192,150],[160,140,104],[110,94,68]],6)},
  rock:   {start:210,colors:ramp([[214,206,192],[160,152,140],[110,104,96],[66,62,58],[30,28,26]],16)},
  glass:  {start:226,colors:ramp([[200,236,255],[90,150,200],[30,60,96],[12,22,40]],6)},
  dark:   {start:238,colors:ramp([[90,84,76],[50,46,42],[24,22,20],[8,8,8]],18)},
};
// House colour ramps for the remap band (8 shades, bright to dark).
const HOUSE={
  gold:  ramp([[255,240,150],[236,196,64],[176,128,24],[96,64,10],[40,26,4]],8),
  red:   ramp([[255,170,150],[224,60,44],[156,26,20],[84,12,10],[36,6,4]],8),
  blue:  ramp([[170,200,255],[64,110,230],[30,58,160],[14,28,90],[6,12,40]],8),
  orange:ramp([[255,210,150],[248,140,40],[184,84,14],[100,42,6],[40,16,2]],8),
  green: ramp([[190,250,170],[80,200,70],[34,130,36],[16,70,20],[6,30,8]],8),
  ltblue:ramp([[200,250,255],[90,210,240],[30,140,190],[12,74,110],[4,30,46]],8),
};
// Remap targets for band entries 176..191, from tiberiandawn/const.cpp.
const REMAP={
  red:   [127,126,125,124,122,46,120,47,125,124,123,122,42,121,120,120],
  blue:  [2,119,118,135,136,138,112,12,118,135,136,137,138,139,114,112],
  orange:[24,25,26,27,29,31,46,47,26,27,28,29,30,31,43,47],
  green: [5,165,166,167,159,142,140,199,166,167,157,3,159,143,142,141],
  ltblue:[161,200,201,202,204,205,206,12,201,202,203,204,205,115,198,114],
};
// Indices with a fixed meaning elsewhere: never repainted.
const FIXED=new Set([...Array(16).keys(),16,25,139,140,141,159,167,202,209,233,234,235,236,237]);
// Band position -> shade: 176-183 and 184-191 are two 8-step ramps.
const shadeOf=k=>k%8;

function gamePalette(){
  const colors=basePalette().map(c=>c.slice());
  for(const {start,colors:list} of Object.values(RAMPS))list.forEach((c,i)=>colors[start+i]=c);
  for(let k=0;k<16;k++)colors[176+k]=HOUSE.gold[shadeOf(k)];
  const claimed=new Map();
  for(const [house,targets] of Object.entries(REMAP))targets.forEach((idx,k)=>{
    if(FIXED.has(idx)||claimed.has(idx))return;
    claimed.set(idx,house);colors[idx]=HOUSE[house][shadeOf(k)];
  });
  return colors;
}
// Ramp index helpers: shade 0 is the brightest entry of the ramp.
function rampIndex(name,shade){
  const r=RAMPS[name];
  if(!r)throw Error("Unknown ramp "+name);
  return r.start+Math.max(0,Math.min(r.colors.length-1,Math.round(shade)));
}
const rampLength=name=>RAMPS[name].colors.length;
// Every ramp must sit on indices no fixed meaning or remap target uses.
function check(){
  const used=new Set();
  const remapTargets=new Set(Object.values(REMAP).flat());
  for(const [name,{start,colors}] of Object.entries(RAMPS))for(let i=0;i<colors.length;i++){
    const idx=start+i;
    if(name!=="shimmer"&&idx>=32&&idx<=38)throw Error(name+" overlaps colour cycling at "+idx);
    if(FIXED.has(idx)||remapTargets.has(idx)||(idx>=176&&idx<=191)||used.has(idx))
      throw Error("Ramp "+name+" collides at index "+idx);
    used.add(idx);
  }
  return true;
}
module.exports={RAMPS,HOUSE,REMAP,FIXED,gamePalette,rampIndex,rampLength,check,REMAP_BAND:[176,191]};
