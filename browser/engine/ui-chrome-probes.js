"use strict";
// UI-B evidence on the real engine: pixel probes of the generated command-bar
// chrome at the spec coordinates (docs/browser/UI_SPEC.md), and REPAIR, SELL
// and MAP clicks whose effect is read back from the engine's own redraw
// (ShapeButtonClass draws frame IsOn for REPAIR/SELL; MAP toggles the radar
// well). No engine code is involved beyond the stock draw paths.
const {rgbPalette}=require("../../tools/content/boot-colors.js");
const UI=require("../../tools/content/ui/ui-colors.js");
const L=require("../../tools/content/ui/chrome.js").layout;
// 8-bit palette -> 6-bit .PAL -> SDL presents 6-bit << 2.
const shown=i=>rgbPalette()[i].map(v=>(v>>2)<<2);

async function sample(page,png,points){
  return page.evaluate(async ({data,points})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");
    g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400;
    return points.map(([x,y])=>Array.from(g.getImageData(Math.floor((x+0.5)*sx),Math.floor((y+0.5)*sy),1,1).data.slice(0,3)));
  },{data:png.toString("base64"),points});
}
async function regionHash(page,png,[x,y,w,h]){
  return page.evaluate(async ({data,r})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");
    g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400;
    const d=g.getImageData(Math.floor(r[0]*sx),Math.floor(r[1]*sy),Math.floor(r[2]*sx),Math.floor(r[3]*sy)).data;
    let hsh=2166136261;for(let i=0;i<d.length;i+=4){hsh^=d[i]*7+d[i+1]*3+d[i+2];hsh=Math.imul(hsh,16777619)>>>0;}
    return hsh;
  },{data:png.toString("base64"),r:[x,y,w,h]});
}
const near=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<=8);

// Static probes: each point is covered only by the named chrome piece once
// the sidebar is up (draw order per UI_SPEC.md).
const PROBES=[
  {name:"tab plate (OPTIONS)",at:[20,6],expect:[UI.plate]},
  {name:"tab plate (SIDEBAR)",at:[480+150,6],expect:[UI.plate]},
  {name:"radar housing outline",at:[480,85],expect:[UI.bevel]},
  {name:"column divider",at:[567,250],expect:[UI.bevel]},
  {name:"scroll deck",at:[497,395],expect:[UI.plate]},
  {name:"power gauge rail",at:[480,300],expect:[UI.bevel]},
  {name:"power gauge track",at:[488,398],expect:[UI.normal,UI.amber,UI.critical,UI.red,UI.shadow,UI.subtle,UI.white,UI.button]},
  {name:"REPAIR outline",at:[L.buttons.REPAIR,L.buttonY+9],expect:[UI.edge,UI.red]},
  {name:"MAP outline",at:[L.buttons.MAP,L.buttonY+9],expect:[UI.edge,UI.red,UI.subtle]}
];
async function probeChrome(page,canvas){
  const png=await canvas.screenshot();
  const got=await sample(page,png,PROBES.map(p=>p.at));
  return PROBES.map((p,i)=>({name:p.name,at:p.at,rgb:got[i],
    ok:p.expect.some(idx=>near(got[i],shown(idx))),expected:p.expect.map(idx=>({index:idx,rgb:shown(idx)}))}));
}
// A point of the button's fill, clear of the pictogram and marks.
const fillPoint=kind=>[L.buttons[kind]+40,L.buttonY+10];
async function buttonState(page,canvas,kind){
  const [rgb]=await sample(page,await canvas.screenshot(),[fillPoint(kind)]);
  return near(rgb,shown(UI.deep))?"on":near(rgb,shown(UI.steel))?"off":near(rgb,shown(UI.coal))?"disabled":"unknown:"+rgb.join(",");
}
async function run(page,{canvas,clickGame,screenshot,log=()=>{}}){
  const result={probes:await probeChrome(page,canvas),clicks:[]};
  const failed=result.probes.filter(p=>!p.ok);
  if(failed.length)throw Error("UI chrome probes failed: "+JSON.stringify(failed));
  await screenshot("ui-chrome");
  const center=kind=>[L.buttons[kind]+L.buttonW/2,L.buttonY+L.buttonH/2];
  for(const kind of ["REPAIR","SELL"]){
    const before=await buttonState(page,canvas,kind);
    await clickGame(...center(kind),"UI-B toggle "+kind);
    await page.waitForTimeout(400);
    const during=await buttonState(page,canvas,kind);
    if(kind==="REPAIR")await screenshot("ui-repair-on");
    await clickGame(...center(kind),"UI-B toggle "+kind+" back");
    await page.waitForTimeout(400);
    const after=await buttonState(page,canvas,kind);
    const entry={button:kind,before,during,after,ok:before==="off"&&during==="on"&&after==="off"};
    result.clicks.push(entry);log("[ui-chrome] "+kind+" "+before+"->"+during+"->"+after);
    if(!entry.ok)throw Error(kind+" did not toggle the engine mode: "+JSON.stringify(entry));
  }
  // MAP: with no radar facility, multiplayer toggles the player-name panel in
  // the radar well (sidebar.cpp Zoom_Mode_Control); with radar it zooms.
  const well=[L.sideX+L.insetX,L.radarY+L.insetY,L.insetW,L.insetH];
  const h0=await regionHash(page,await canvas.screenshot(),well);
  await clickGame(...center("MAP"),"UI-B MAP");
  await page.waitForTimeout(600);
  const h1=await regionHash(page,await canvas.screenshot(),well);
  await screenshot("ui-map-toggled");
  await clickGame(...center("MAP"),"UI-B MAP back");
  await page.waitForTimeout(600);
  const h2=await regionHash(page,await canvas.screenshot(),well);
  const map={button:"MAP",changed:h0!==h1,restored:h2===h0,ok:h0!==h1&&h2===h0};
  result.clicks.push(map);log("[ui-chrome] MAP changed="+map.changed+" restored="+map.restored);
  if(!map.ok)throw Error("MAP did not toggle the radar well: "+JSON.stringify(map));
  return result;
}
// UI-C: share of a 64x48 cameo slot drawn in one palette colour.
async function slotShare(page,png,[x,y],index){
  return page.evaluate(async ({data,x,y,rgb})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400;let n=0,t=0;
    for(let j=0;j<48;j++)for(let i=0;i<64;i++){
      const d=g.getImageData(Math.floor((x+i+0.5)*sx),Math.floor((y+j+0.5)*sy),1,1).data;t++;
      if(Math.abs(d[0]-rgb[0])<=8&&Math.abs(d[1]-rgb[1])<=8&&Math.abs(d[2]-rgb[2])<=8)n++;
    }
    return n/t;
  },{data:png.toString("base64"),x,y,rgb:shown(index)});
}
// Mid-build: the clock's remaining-time dither covers part of the cameo but
// leaves the silhouette visible (UI_SPEC.md HCLOCK).
async function midBuild(page,{canvas,screenshot,slot}){
  const png=await canvas.screenshot();
  const dark=await slotShare(page,png,slot,UI.shadow),hand=await slotShare(page,png,slot,UI.ice);
  await screenshot("ui-mid-build");
  const r={slot,clockShare:dark,handShare:hand,ok:dark>0.05&&dark<0.55&&hand>0};
  if(!r.ok)throw Error("Build clock not visible mid-build: "+JSON.stringify(r));
  return r;
}
async function ready(page,{canvas,screenshot,slot}){
  const png=await canvas.screenshot();
  const lime=await slotShare(page,png,slot,UI.normal);
  await screenshot("ui-ready");
  const r={slot,readyShare:lime,ok:lime>0.01};
  if(!r.ok)throw Error("READY tag not visible: "+JSON.stringify(r));
  return r;
}
// Tooltip: hovering a cameo makes HelpClass draw the object's name.
async function tooltip(page,{canvas,screenshot,at:[x,y]}){
  const box=await canvas.boundingBox();
  const area=[Math.max(0,x-200),Math.max(16,y-30),200,60];
  await page.mouse.move(box.x+100/640*box.width,box.y+100/400*box.height);
  await page.waitForTimeout(800);
  const before=await regionHash(page,await canvas.screenshot(),area);
  await page.mouse.move(box.x+x/640*box.width,box.y+y/400*box.height);
  let after=before;
  for(let i=0;i<10&&after===before;i++){await page.waitForTimeout(300);after=await regionHash(page,await canvas.screenshot(),area);}
  await screenshot("ui-tooltip");
  await page.mouse.move(box.x+100/640*box.width,box.y+100/400*box.height);
  const r={at:[x,y],changed:before!==after,ok:before!==after};
  if(!r.ok)throw Error("No tooltip appeared over the sidebar: "+JSON.stringify(r));
  return r;
}
// UI-D: palette-colour pixel counts in a game-coordinate box.
async function colourCounts(page,png,[x,y,w,h],indices){
  return page.evaluate(async ({data,x,y,w,h,cols})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400,out=cols.map(()=>0);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const d=g.getImageData(Math.floor((x+i+0.5)*sx),Math.floor((y+j+0.5)*sy),1,1).data;
      cols.forEach((rgb,k)=>{if(Math.abs(d[0]-rgb[0])<=8&&Math.abs(d[1]-rgb[1])<=8&&Math.abs(d[2]-rgb[2])<=8)out[k]++;});
    }
    return out;
  },{data:png.toString("base64"),x,y,w,h,cols:indices.map(shown)});
}
async function hover(page,canvas,[x,y],wait=500){
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+x/640*box.width,box.y+y/400*box.height);
  await page.waitForTimeout(wait);
}
// Placement grid: hover a candidate cell and the yard itself while the
// engine is in placement mode; allowed cells draw lime single hatch, blocked
// cells red cross-hatch (TRANS.ICN icons 0 and 2).
async function placement(page,{canvas,screenshot,candidate,blocked}){
  const box=([x,y])=>[Math.max(0,x-48),Math.max(16,y-48),96,96];
  await hover(page,canvas,candidate);
  const [okLime,okRed]=await colourCounts(page,await canvas.screenshot(),box(candidate),[UI.normal,UI.red]);
  await screenshot("ui-placement-candidate");
  await hover(page,canvas,blocked);
  const [blLime,blRed]=await colourCounts(page,await canvas.screenshot(),box(blocked),[UI.normal,UI.red]);
  await screenshot("ui-placement-blocked");
  const r={candidate:{at:candidate,lime:okLime,red:okRed},blocked:{at:blocked,lime:blLime,red:blRed},ok:blRed>20&&(okLime>20||okRed>20)};
  if(!r.ok)throw Error("Placement grid not visible: "+JSON.stringify(r));
  return r;
}
// Cursor: the engine draws the cursor into the canvas. Count cursor inks in
// the 30x24 frame placed at the hotspot.
async function cursorAt(page,{canvas,screenshot,at,hotspot=[0,0],name}){
  await hover(page,canvas,at,700);
  const [x,y]=at,[hx,hy]=hotspot;
  const counts=await colourCounts(page,await canvas.screenshot(),[x-hx,y-hy,30,24],[UI.button,UI.ice,UI.red,UI.normal,UI.shadow]);
  if(name)await screenshot("ui-cursor-"+name);
  return {at,white:counts[0],ice:counts[1],red:counts[2],lime:counts[3],outline:counts[4]};
}
module.exports={run,probeChrome,PROBES,midBuild,ready,tooltip,placement,cursorAt};
