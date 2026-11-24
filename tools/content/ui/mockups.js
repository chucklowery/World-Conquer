"use strict";
// Original geometric mockups; no runtime renderer or external assets.
const fs=require("node:fs");
const path=require("node:path");
const {colors}=require("./palette.json");
const c=k=>colors[k].rgb;
const rect=(x,y,w,h,fill,stroke="none")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
const line=(x,y,X,Y,stroke)=>`<path d="M${x} ${y}L${X} ${Y}" stroke="${stroke}" fill="none"/>`;
const text=(x,y,s,fill=c("white"),size=10)=>`<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}">${s}</text>`;
function plate(x,y,w,h){
  return rect(x,y,w,h,c("plate"),c("shadow"))+line(x+1,y+h-2,x+1,y+1,c("edge"))+line(x+1,y+1,x+w-2,y+1,c("edge"))+line(x+w-2,y+1,x+w-2,y+h-2,c("shadow"))+line(x+1,y+h-2,x+w-2,y+h-2,c("shadow"))+[[x+4,y+4],[x+w-4,y+4],[x+4,y+h-4],[x+w-4,y+h-4]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="1.5" fill="${c("bevel")}"/>`).join("");
}
function svg(body,scale){
  if(![1,2].includes(scale))throw Error("scale must be 1 or 2");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${640*scale}" height="${400*scale}" viewBox="0 0 640 400" shape-rendering="crispEdges">${body}</svg>\n`;
}
function match(faction,scale=1){
  if(!["aster","forge"].includes(faction))throw Error("unknown faction");
  const glow=c(faction==="aster"?"teal":"amber");
  let s=rect(0,0,640,400,"#263b31")+rect(0,0,640,16,c("shadow"))+plate(0,0,160,16)+text(12,12,"OPTIONS")+plate(480,0,160,16)+text(535,12,"01250",glow)+plate(480,15,160,140)+rect(496,22,128,128,c("shadow"),glow);
  for(let i=0;i<128;i+=8)s+=line(497,23+i,622,23+i,c("plate"));
  s+=line(560,25,560,147,glow)+line(499,86,621,86,glow)+plate(480,155,160,245);
  for(const [x,icon] of [[484,"repair"],[537,"sell"],[590,"map"]]){
    s+=plate(x,160,46,18);
    if(icon==="repair")s+=line(x+16,173,x+29,164,c("white"))+line(x+26,164,x+30,168,c("white"));
    if(icon==="sell")s+=text(x+19,173,"$",c("white"),13);
    if(icon==="map")s+=rect(x+17,164,12,10,"none",c("white"))+line(x+23,164,x+23,174,c("white"))+line(x+17,169,x+29,169,c("white"));
  }
  s+=rect(481,176,14,223,c("shadow"),c("bevel"));
  for(let y=390;y>=250;y-=8)s+=rect(484,y,8,5,c("normal"));
  s+=`<path d="M481 268l8 4-8 4z" fill="${c("white")}"/>`;
  for(const x of [497,567]){
    for(let i=0;i<4;i++){
      const y=182+i*48;
      s+=plate(x,y,64,48)+rect(x+5,y+5,54,38,c("shadow"));
      if(i<3)s+=`<path d="M${x+12} ${y+30}l10 -15 24 0 8 15z" fill="${c("steel")}" stroke="${c("edge")}"/>`;
    }
    for(const [dx,sign] of [[0,1],[32,-1]]){
      s+=plate(x+dx,373,32,24)+`<path d="M${x+dx+8} ${385+sign*4}l8 ${-sign*8} 8 ${sign*8}" fill="none" stroke="${c("white")}" stroke-width="2"/>`;
    }
  }
  s+=text(10,31,"COMMS: Construction complete.",c("white"));
  return svg(s,scale);
}
function menu(scale=1){
  let s=rect(0,0,640,400,c("shadow"))+plate(32,26,576,348)+text(137,104,"WORLD-CONQUER",c("white"),30)+line(88,118,552,118,c("teal"));
  for(const [i,label] of ["NEW GAME","LOAD GAME","OPTIONS","EXIT"].entries()){
    s+=plate(216,145+i*45,208,32)+text(244,165+i*45,label,c("white"),13);
  }
  return svg(s,scale);
}
function generate(dir){
  fs.mkdirSync(dir,{recursive:true});
  for(const scale of [1,2])for(const name of ["aster","forge","menu"])
    fs.writeFileSync(path.join(dir,`${name}-${scale}x.svg`),name==="menu"?menu(scale):match(name,scale));
}
if(require.main===module)generate(process.argv[2]||path.resolve("build/ui-mockups"));
module.exports={plate,match,menu,generate};
