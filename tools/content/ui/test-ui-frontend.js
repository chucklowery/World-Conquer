"use strict";
// UI-E: title key art, dialog texture, option filigree and drop-list arrows.
const assert=require("node:assert/strict");
const f=require("./frontend.js");
const UI=require("./ui-colors.js");
const {verifyPCX}=require("../encode-pcx.js");
const {decodeTacticalShape}=require("../encode-shape.js");
const {encode}=require("./build.js");
const {rgbPalette}=require("../boot-colors.js");

const boot=f.bootAssets();
// HTITLE.PCX: 640x400, valid RLE, carries the shipped palette, decodes to the
// generated pixels, and shows the wordmark below the menu dialog area.
const pcx=boot["HTITLE.PCX"];verifyPCX(pcx);
assert.equal(pcx.readUInt16LE(8)+1,640);assert.equal(pcx.readUInt16LE(10)+1,400);
const pal=pcx.subarray(pcx.length-768);
rgbPalette().forEach((c,i)=>c.forEach((v,k)=>assert.equal(pal[i*3+k],v,"PCX palette "+i)));
const t=f.title();
{let pos=128,out=[];while(out.length<640*400){const n=pcx[pos++];if((n&0xC0)===0xC0){const v=pcx[pos++];for(let k=0;k<(n&63);k++)out.push(v);}else out.push(n);}
 assert.deepEqual(out,t.pixels,"PCX decodes to the title raster");}
let word=0;for(let y=300;y<336;y++)for(let x=0;x<640;x++)if(t.get(x,y)===UI.white)word++;
assert(word>800,"wordmark below the menu");
let underMenu=0;for(let y=0;y<272;y++)for(let x=180;x<460;x++)if(t.get(x,y)===UI.white)underMenu++;
assert.equal(underMenu,0,"nothing bright under the menu dialog");
// Area balance: deep neutrals dominate (design-tokens chromeAreaTargets).
const share=set=>t.pixels.filter(p=>set.includes(p)).length/t.pixels.length;
assert(share([UI.shadow,UI.coal,UI.plate])>0.7,"deep neutral share");
assert(share([UI.primary,UI.red,UI.deep])<0.05,"crimson stays selective");

// BTEXTURE: keyframe shape (Build_Frame / Get_Build_Frame_Width, conquer.cpp:
// 2526-2535), two frames, fully opaque (Texture_Fill_Rect has no transparency).
const tex=decodeTacticalShape(boot["BTEXTURE.SHP"]);
assert.equal(tex.frames.length,2);
for(const fr of tex.frames){assert(!fr.pixels.includes(0));assert(fr.pixels.filter(p=>p===UI.plate).length>0.9*fr.pixels.length,"matte plate");}

// OPTIONS.SHP: 32 frames (OPTION_COUNT, defines.h:2897-2919); left/right
// filigree pairs mirror each other.
const g=f.generate();
assert.equal(g["OPTIONS.SHP"].length,32);
const o=g["OPTIONS.SHP"].map(x=>x.toFrame());
for(let i=0;i<18;i+=2){
  const L=o[i],R=o[i+1];
  for(let y=0;y<24;y++)for(let x=0;x<24;x++)assert.equal(!!L.pixels[y*24+x],!!R.pixels[y*24+23-x],"filigree "+i+" mirror");
}
assert.notDeepEqual(o[28].pixels,o[30].pixels,"Aster and Forge choices differ");
// Drop-list arrows: up shape points up, down shape points down; three states.
for(const n of ["HBTN-UP.SHP","HBTN-UP2.SHP","HBTN-DN.SHP","HBTN-DN2.SHP"]){
  const fr=g[n].map(x=>x.toFrame());assert.equal(fr.length,4);
  const d=decodeTacticalShape(encode(g[n]));d.frames.forEach((x,i)=>assert.deepEqual(x.pixels,fr[i].pixels));
  const ink=fr[0],rows=[];for(let y=0;y<18;y++)rows.push(ink.pixels.slice(y*32+11,y*32+22).filter(p=>p===UI.white).length);
  const top=rows.findIndex(n=>n>0),bottom=17-[...rows].reverse().findIndex(n=>n>0);
  const up=rows[top]<rows[bottom];
  assert.equal(up,n.includes("UP"),n+" direction");
  assert.notDeepEqual(fr[0].pixels,fr[1].pixels);assert.notDeepEqual(fr[0].pixels,fr[2].pixels);
}
console.log("UI front-end checks passed");
