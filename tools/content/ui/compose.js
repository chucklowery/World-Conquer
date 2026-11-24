"use strict";
// Composes generated chrome at the engine's own draw coordinates and order
// (tab.cpp, sidebar.cpp, power.cpp, radar.cpp), for previews and for the
// coordinate tests. This is a design check, not a renderer the game uses.
const {Raster}=require("./raster.js");
const UI=require("./ui-colors.js");
const chrome=require("./chrome.js");
const L=chrome.layout;
const {TERRAIN}=require("../boot-colors.js");

function draw(dst,frame,x,y,clip){
  const f=frame.toFrame?frame.toFrame():frame;
  for(let j=0;j<f.height;j++)for(let i=0;i<f.width;i++){
    const p=f.pixels[j*f.width+i];if(!p)continue;
    const X=x+i,Y=y+j;
    if(clip&&(X<clip.x||Y<clip.y||X>=clip.x+clip.w||Y>=clip.y+clip.h))continue;
    dst.set(X,Y,p);
  }
}
// state: {house, radarFrame, power:"normal"|"low"|"critical", fill, drain,
// repair, sell, mapDisabled, highlightTab, cameos:[[frame|null x4],[...]]}
function screen(state={}){
  const s=Object.assign({house:"GDI",radarFrame:22,power:"normal",fill:120,drain:90,repair:false,sell:false,
    mapDisabled:false,highlightTab:false,cameos:null},state);
  const g=chrome.generate();
  const r=new Raster(640,400,TERRAIN.grass);
  // Tabs (tab.cpp:110-113): black band, tab shapes, black line on row 15.
  r.rect(0,0,640,15,UI.black);
  draw(r,g["HTABS.SHP"][s.highlightTab?1:0],0,0);
  draw(r,g["HTABS.SHP"][0],320,0);
  draw(r,g["HTABS.SHP"][0],480,0);
  r.hline(0,639,15,UI.black);
  // Sidebar halves (sidebar.cpp:804-806).
  r.hline(480,639,157,0);
  draw(r,g["HSIDE1.SHP"][0],L.sideX,L.side1Y);
  draw(r,g["HSIDE2.SHP"][0],L.sideX,L.side2Y);
  // Power gauge (power.cpp:184-277).
  const bottom=L.powerY+L.powerH-1,top=bottom-s.fill;
  const empty={x:0,y:0,w:640,h:bottom-s.fill};
  draw(r,g["HPWRBAR.SHP"][0],L.sideX,L.powerY,empty);
  draw(r,g["HPWRBAR.SHP"][1],L.sideX,L.powerY+100,empty);
  const c={normal:0,low:2,critical:4}[s.power];
  const filled={x:0,y:top-3,w:640,h:400-(top-3)};
  if(s.fill){draw(r,g["HPWRBAR.SHP"][2+c],L.sideX,L.powerY,filled);draw(r,g["HPWRBAR.SHP"][3+c],L.sideX,L.powerY+100,filled);}
  draw(r,g["HPOWER.SHP"][0],L.sideX,bottom-s.drain-4);
  // Radar housing (radar.cpp:423), drawn at RadY+1.
  draw(r,g["HRADAR."+s.house][s.radarFrame],L.sideX,L.radarY);
  // Command buttons (sidebar.cpp:343-359; shapebtn.cpp:145-160).
  draw(r,g["HREPAIR.SHP"][s.repair?1:0],L.buttons.REPAIR,L.buttonY);
  draw(r,g["HSELL.SHP"][s.sell?1:0],L.buttons.SELL,L.buttonY);
  draw(r,g["HMAP.SHP"][s.mapDisabled?2:0],L.buttons.MAP,L.buttonY);
  // Strips: logo while fewer than four buildables, then cameos and arrows.
  for(const id of [0,1]){
    const items=s.cameos?s.cameos[id]:[];
    if(items.length<4)draw(r,g["HSTRIP.SHP"][id],L.cameoX[id],L.stripY);
    items.forEach((cameo,k)=>{if(cameo)draw(r,cameo,L.cameoX[id],L.cameoY+k*L.cameoH);});
    const upX=L.cameoX[id];
    draw(r,g["HSTRIPUP.SHP"][0],upX,L.scrollY);
    draw(r,g["HSTRIPDN.SHP"][0],upX+32,L.scrollY);
  }
  return r;
}
function screens(){
  return {
    aster:screen({house:"GDI"}),
    forge:screen({house:"NOD",power:"low",fill:90,drain:130,repair:true}),
    "forge-critical":screen({house:"NOD",power:"critical",fill:50,drain:160,sell:true,radarFrame:41}),
    "radar-opening":screen({house:"GDI",radarFrame:11,mapDisabled:true})
  };
}
module.exports={screen,screens,draw};
