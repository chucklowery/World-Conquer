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
module.exports={run,probeChrome,PROBES};
