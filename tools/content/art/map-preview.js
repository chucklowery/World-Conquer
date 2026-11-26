#!/usr/bin/env node
"use strict";
// Renders a map (game/content/scenarios/*.json) with the M5 terrain art to a
// PNG, for reviewing map layouts: node tools/content/art/map-preview.js
// <scenario.json> <out.png>
const fs=require("node:fs");
const {generate}=require("../scenario.js");
const terrain=require("./terrain.js");
const {gamePalette}=require("./palette.js");
const {encodeIndexedPNG}=require("./png.js");
function preview(source){
  const input=JSON.parse(fs.readFileSync(source,"utf8"));
  const {ini,bin}=generate(input);
  const art=terrain.templates();
  const byId=new Map(terrain.TEMPLATES.filter(t=>t.temperate).map(t=>[t.id,art[t.name+".TEM"]]));
  const sections={};let cur=null;
  for(const line of ini.split("\n")){const h=line.match(/^\[(\w+)\]$/);if(h){cur=sections[h[1]]=[];continue;}
    if(cur&&line.includes("="))cur.push(line.split("="));}
  const sec=n=>sections[n]||[];
  const map=Object.fromEntries(sec("Map"));
  const X=+map.X,Y=+map.Y,W=+map.Width,H=+map.Height;
  const px=new Array(W*24*H*24).fill(0);
  const put=(cx,cy,frame,fw,fh,ox=0,oy=0)=>{for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){const v=frame[y*fw+x];if(!v)continue;
    const X2=(cx-X)*24+x+ox,Y2=(cy-Y)*24+y+oy;if(X2<0||Y2<0||X2>=W*24||Y2>=H*24)continue;
    px[Y2*W*24+X2]=v===4?px[Y2*W*24+X2]:v;}};
  for(let cy=Y;cy<Y+H;cy++)for(let cx=X;cx<X+W;cx++){
    const i=cy*64+cx,tid=bin[i*2],icon=bin[i*2+1];
    let ic;
    if(tid===0||tid===255)ic=art["CLEAR1.TEM"].icons[(cx&3)|((cy&3)<<2)];
    else{const t=byId.get(tid);ic=t?t.icons[icon]:null;}
    if(ic)put(cx,cy,ic,24,24);
  }
  const crystals=terrain.crystalFrames(1),tree=terrain.treeFrames()[0];
  for(const [cell,type] of sec("Overlay")){const c=+cell;put(c%64,Math.floor(c/64),crystals[6].pixels,24,24);}
  for(const [cell] of sec("Terrain")){const c=+cell;put(c%64,Math.floor(c/64),tree.pixels,32,32,-4,-8);}
  for(const [,cell] of sec("Waypoints")){const c=+cell,cx=c%64,cy=Math.floor(c/64);
    for(let y=4;y<20;y++)for(let x=4;x<20;x++)if(x===4||y===4||x===19||y===19)put(cx,cy,[15],1,1,x,y);}
  return encodeIndexedPNG(W*24,H*24,px,gamePalette(),{background:[0,0,0]});
}
module.exports={preview};
if(require.main===module)fs.writeFileSync(process.argv[3],preview(process.argv[2]));
