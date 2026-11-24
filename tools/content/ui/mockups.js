"use strict";
// Original geometric mockups; no runtime renderer or external assets.
const fs=require("node:fs");
const path=require("node:path");
const t=require("./design-tokens.json");
const p=require("./palette.json");
const colors={shadow:t.background.app,plate:t.background.surface2,steel:t.background.surface3,bevel:t.border.default,edge:t.border.strong,highlight:t.text.secondary,teal:t.accent.cyan,amber:t.statusColors.warning,normal:p.colors.normal.rgb,white:t.text.primary,red:t.accent.hover,deep:t.accent.deep,ice:t.accent.ice};
const c=k=>colors[k];
// Art origins (not hit targets): sidebar.cpp:214–220,1155,1251–1261.
const layout=Object.freeze({sidebarX:480,powerY:176,powerWidth:16,iconX:[500,570],iconY:182,iconWidth:64,iconHeight:48,scrollY:373});
const rect=(x,y,w,h,fill,stroke="none")=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
const line=(x,y,X,Y,stroke)=>`<path d="M${x} ${y}L${X} ${Y}" stroke="${stroke}" fill="none"/>`;
const text=(x,y,s,fill=c("white"),size=10)=>`<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}">${s}</text>`;
function plate(x,y,w,h){
  const n=Math.min(4,Math.floor(h/4));
  return `<path d="M${x} ${y+n}l${n} -${n}H${x+w-n}l${n} ${n}V${y+h-n}l-${n} ${n}H${x+n}l-${n} -${n}z" fill="${c("plate")}" stroke="${c("bevel")}"/>`+line(x+n,y+2,x+Math.min(w-5,18),y+2,c("edge"))+line(x+w-18,y+h-2,x+w-n,y+h-2,c("edge"));
}
function svg(body,scale){
  if(![1,2].includes(scale))throw Error("scale must be 1 or 2");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${640*scale}" height="${400*scale}" viewBox="0 0 640 400" shape-rendering="crispEdges">${body}</svg>\n`;
}
function match(faction,scale=1,power="normal"){
  if(!Object.hasOwn(p.states,power))throw Error("unknown power state");
  const state=p.states[power], ink=p.colors[state.color].rgb;
  if(!["aster","forge"].includes(faction))throw Error("unknown faction");
  const glow=c(faction==="aster"?"teal":"red");
  let s=rect(0,0,640,400,"#263b31")+rect(0,0,640,16,c("shadow"))+plate(0,0,160,16)+text(12,12,"OPTIONS")+plate(480,0,160,16)+text(535,12,"01250",c(faction==="aster"?"ice":"white"))+plate(480,15,160,140)+rect(496,22,128,128,c("shadow"),glow);
  for(let i=0;i<128;i+=8)s+=line(497,23+i,622,23+i,c("plate"));
  s+=line(560,25,560,147,glow)+line(499,86,621,86,glow)+plate(480,155,160,245);
  for(const [x,icon] of [[484,"repair"],[537,"sell"],[590,"map"]]){
    s+=plate(x,160,46,18);
    if(icon==="repair")s+=line(x+5,176,x+40,176,c("red"));
    if(icon==="repair")s+=line(x+16,173,x+29,164,c("white"))+line(x+26,164,x+30,168,c("white"));
    if(icon==="sell")s+=text(x+19,173,"$",c("white"),13);
    if(icon==="map")s+=rect(x+17,164,12,10,"none",c("white"))+line(x+23,164,x+23,174,c("white"))+line(x+17,169,x+29,169,c("white"));
  }
  s+=rect(layout.sidebarX,layout.powerY,layout.powerWidth,400-layout.powerY,c("shadow"),c("bevel"));
  for(let y=390;y>=250;y-=8){
    s+=rect(484,y,8,5,ink);
    if(state.pattern!=="solid")s+=line(484,y+4,488,y,c("shadow"))+line(488,y+4,492,y,c("shadow"));
    if(state.pattern==="cross")s+=line(484,y,488,y+4,c("white"))+line(488,y,492,y+4,c("white"));
  }
  s+=`<path d="M481 268l8 4-8 4z" fill="${c("white")}"/>`;
  for(const x of layout.iconX){
    for(let i=0;i<4;i++){
      const y=layout.iconY+i*layout.iconHeight;
      s+=plate(x,y,layout.iconWidth,layout.iconHeight)+rect(x+5,y+5,54,38,c("shadow"));
      if(i<3)s+=`<path d="M${x+12} ${y+30}l10 -15 24 0 8 15z" fill="${c("steel")}" stroke="${c("edge")}"/>`;
    }
    for(const [dx,sign] of [[0,1],[32,-1]]){
      s+=plate(x+dx,layout.scrollY,32,24)+`<path d="M${x+dx+8} ${385+sign*4}l8 ${-sign*8} 8 ${sign*8}" fill="none" stroke="${c("white")}" stroke-width="2"/>`;
    }
  }
  s+=text(10,31,"COMMS: Construction complete.",c("white"));
  return svg(s,scale);
}
function menu(scale=1){
  let s=rect(0,0,640,400,c("shadow"))+plate(32,26,576,348)+text(137,104,"WORLD-CONQUER",c("white"),30)+line(88,118,552,118,c("teal"));
  for(const [i,label] of ["NEW GAME","LOAD GAME","OPTIONS","EXIT"].entries()){
    const y=145+i*45;
    s+=plate(216,y,208,32);
    if(i===0)s+=rect(220,y+4,200,24,c("deep"))+line(220,y+28,420,y+28,c("red"));
    s+=text(244,y+20,label,c("white"),13);
  }
  return svg(s,scale);
}
function generate(dir){
  fs.mkdirSync(dir,{recursive:true});
  for(const scale of [1,2])for(const name of ["aster","forge","menu"])
    fs.writeFileSync(path.join(dir,`${name}-${scale}x.svg`),name==="menu"?menu(scale):match(name,scale));
}
if(require.main===module)generate(process.argv[2]||path.resolve("build/ui-mockups"));
module.exports={layout,plate,match,menu,generate};
