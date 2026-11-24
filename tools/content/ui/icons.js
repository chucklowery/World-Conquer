"use strict";
// UI-C: build-strip art. Cameos (every *ICNH.SHP / *ICNH.TEM the engine
// requests), the build clock (HCLOCK.SHP) and the READY / HOLD and cargo
// pips (HPIPS.SHP). Contracts: docs/browser/UI_SPEC.md.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {Raster,drawText,textWidth}=require("./raster.js");
const UI=require("./ui-colors.js");
const {decodeTacticalShape}=require("../encode-shape.js");
const REQ=require("../../../game/content/pack/requirements.json");

const W=64,H=48;                       // sidebar.h:216-217 (x2 for 640x400)
const BOX={x:4,y:4,w:56,h:35};         // silhouette area above the floor line
const FLOOR=40;

// Pick the frame that shows the most of the object: buildings use frame 0
// (healthy); vehicles and infantry use the facing with the largest
// silhouette among the first 32 frames, which is a three-quarter view.
function bounds(f){
  let x0=f.width,y0=f.height,x1=-1,y1=-1;
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)if(f.pixels[y*f.width+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  return x1<0?null:{x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};
}
function bestFrame(frames,building){
  if(building)return frames[0];
  let best=frames[0],score=-1;
  for(const f of frames.slice(0,32)){const b=bounds(f);const s=b?b.w*b.h:0;if(s>score){score=s;best=f;}}
  return best;
}
function backdrop(){
  const r=new Raster(W,H,UI.coal);
  // Two-step dithered fall-off toward the floor; no glow, no texture noise.
  for(let y=1;y<FLOOR;y++)for(let x=1;x<W-1;x++)if(y<14&&(x+y)%2===0)r.set(x,y,UI.plate);
  r.rect(1,FLOOR,W-2,H-FLOOR-1,UI.plate);
  r.hline(2,W-3,FLOOR,UI.subtle);
  r.plate(0,0,W,H,{fill:null,edge:UI.bevel,cut:3});
  r.hline(3,14,1,UI.edge);
  return r;
}
// Scale a sprite into the silhouette box, bottom-aligned on the floor line,
// with a 1-pixel dark outline so the shape reads on any backdrop.
function placeSprite(r,f){
  const b=bounds(f);if(!b)return r;
  const k=Math.min(BOX.w/b.w,BOX.h/b.h);
  const scale=k>=1?Math.floor(k):k;
  const w=Math.max(1,Math.round(b.w*scale)),h=Math.max(1,Math.round(b.h*scale));
  const ox=BOX.x+Math.floor((BOX.w-w)/2),oy=FLOOR-h;
  const sil=new Raster(w,h,0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=b.x0+Math.min(b.w-1,Math.floor(x/scale)),sy=b.y0+Math.min(b.h-1,Math.floor(y/scale));
    sil.set(x,y,f.pixels[sy*f.width+sx]);
  }
  for(let y=-1;y<=h;y++)for(let x=-1;x<=w;x++){
    if(sil.get(x,y))continue;
    const n=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>sil.get(x+dx,y+dy));
    if(n)r.set(ox+x,oy+y,UI.shadow);
  }
  r.blit(sil,ox,oy);
  return r;
}
// Special-weapon cameos have no object sprite: original pictograms.
function special(kind){
  const r=backdrop(),cx=32,cy=22;
  if(kind==="ION"){r.poly([[cx+2,6],[cx-8,24],[cx-1,24],[cx-4,38],[cx+9,18],[cx+2,18],[cx+6,6]],UI.ice);}
  else if(kind==="ATOM"){
    for(let a=0;a<3;a++){const t=a*Math.PI*2/3;r.poly([[cx,cy],[cx+16*Math.cos(t-0.45),cy+16*Math.sin(t-0.45)],[cx+16*Math.cos(t+0.45),cy+16*Math.sin(t+0.45)]],UI.amber);}
    r.rect(cx-3,cy-3,7,7,UI.shadow).rect(cx-2,cy-2,5,5,UI.amber);
  }else{
    r.frame(cx-12,cy-12,25,25,UI.red);r.hline(cx-17,cx+17,cy,UI.red).vline(cx,cy-17,cy+17,UI.red);
    r.rect(cx-2,cy-2,5,5,UI.button);
  }
  return r;
}
function wireframeStage(){
  // Stand-alone use (previews): build the wireframe sprites the pack uses.
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wc-ui-icons-")),wf=path.join(dir,"wf");
  require("../wireframes.js").build(wf,undefined,true);
  const {translateShape,wireframeTranslation}=require("../pack.js");
  const t=wireframeTranslation(),files=path.join(wf,"files"),out=path.join(dir,"stage");
  fs.mkdirSync(out);
  const assets=JSON.parse(fs.readFileSync(path.join(wf,"manifest.json"),"utf8")).assets;
  const names=new Set();
  for(const a of assets)if(a.engineFilename&&a.target&&fs.existsSync(path.join(files,a.target))){
    const n=a.engineFilename.toUpperCase();
    if(n==="WIREFRAME.PAL"||n==="MOUSE.SHP"||n==="CONQUER.ENG")continue;
    fs.writeFileSync(path.join(out,n),translateShape(fs.readFileSync(path.join(files,a.target)),t));names.add(n);
  }
  // Same inputs as pack.js: placeholders fill every sprite the wireframes lack.
  require("../placeholders.js").build(out,names);
  return {dir:out,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
const BUILDING=new Set(REQ.files.filter(e=>/MAKE\.SHP$/.test(e.name)).map(e=>e.name.replace(/MAKE\.SHP$/,"")));
function cameo(name,stage){
  const base=name.replace(/ICNH\.(SHP|TEM)$/,"");
  if(["ION","ATOM","BOMB"].includes(base))return special(base);
  const r=backdrop();
  // The engine builds the cameo name from the first four letters of the
  // object's INI name (e.g. DELPHI -> DELPICNH), so resolve the sprite the
  // same way: exact name first, then the unique 5-8 letter INI name with
  // that prefix.
  let file=path.join(stage,base+".SHP");
  if(!fs.existsSync(file)&&base.length===4){
    const hits=fs.readdirSync(stage).filter(n=>n.startsWith(base)&&/^[A-Z0-9]{5,8}\.SHP$/.test(n)&&!/(MAKE|ICNH)\.SHP$/.test(n));
    if(hits.length===1)file=path.join(stage,hits[0]);
  }
  if(fs.existsSync(file)){
    try{placeSprite(r,bestFrame(decodeTacticalShape(fs.readFileSync(file)).frames,BUILDING.has(base)));}
    catch(e){/* undecodable source: keep the bare backdrop, recorded by the test */}
  }
  return r;
}

// ------------------------------------------------------------- build clock
// Frame 0: unavailable (sidebar.cpp:1986-1995). Frames 1..108: production
// stage 0..107 (factory.h:117). The engine draws these SHAPE_GHOST; only the
// ghost ink GREEN (3) would be translucent, and it blends toward LTGREY,
// which would *lighten* the cameo. So the remaining-time sector is an opaque
// 50% dither of the darkest UI shade instead: the silhouette stays visible
// through the open checker cells.
const STEPS=108;
function clockFrame(i){
  const r=new Raster(W,H,0),cx=W/2-0.5,cy=H/2-0.5;
  if(i===0){
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if((x+y)%2===0)r.set(x,y,UI.shadow);
    // Diagonal "locked" hatch on the open checker cells (k odd keeps x+t odd).
    for(let k=1-H;k<W;k+=6)for(let t=0;t<H;t++){const x=k+t;if(x>=0&&x<W&&(x+t)%2)r.set(x,t,UI.subtle);}
    return r;
  }
  const done=(i-1)/STEPS;                       // fraction completed
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    // Angle clockwise from 12 o'clock, 0..1.
    const a=((Math.atan2(x-cx,-(y-cy))/(2*Math.PI))+1)%1;
    if(a>=done&&(x+y)%2===0)r.set(x,y,UI.shadow);
  }
  // Sweep hand from the centre to the edge, in the focus colour.
  const t=done*2*Math.PI;
  for(let s=0;s<40;s++){
    const x=Math.round(cx+Math.sin(t)*s),y=Math.round(cy-Math.cos(t)*s);
    if(x<0||y<0||x>=W||y>=H)break;
    r.set(x,y,UI.ice);
  }
  r.rect(Math.round(cx)-1,Math.round(cy)-1,3,3,UI.ice);
  return r;
}

// -------------------------------------------------------------------- pips
// defines.h:1748-1758: 0 empty, 1 full, 2 primary, 3 ready, 4 holding,
// 5 engineer, 6 civilian, 7 commando. One frame size per file, so every frame
// is 42x9; cargo pips are 2x2 squares at the centre (3 px spacing,
// techno.cpp:4464); PIP_PRIMARY is drawn top-left aligned (techno.cpp:4489).
const PW=42,PH=9;
function pip(kind){
  const r=new Raster(PW,PH,0),cx=20,cy=4;
  const square=(c,edge)=>{r.rect(cx,cy,2,2,c);if(edge!=null)r.frame(cx-1,cy-1,4,4,edge);};
  switch(kind){
    case 0:r.frame(cx-1,cy-1,4,4,UI.subtle);break;                 // empty: hollow
    case 1:square(UI.normal,UI.shadow);break;                       // full
    case 2:r.poly([[0,3],[3,0],[6,3],[3,6]],UI.red).set(3,3,UI.button);break; // primary diamond
    case 5:square(UI.amber,UI.shadow);break;                        // engineer
    case 6:square(UI.white,UI.shadow);break;                        // civilian
    case 7:square(UI.red,UI.shadow);break;                          // commando
    default:{
      // READY (lime, check mark) and HOLD (amber, pause bars) tags.
      const ready=kind===3,ink=ready?UI.normal:UI.amber,label=ready?"READY":"HOLD";
      r.plate(0,0,PW,PH,{fill:UI.shadow,edge:ink,cut:2});
      if(ready){r.line(3,4,4,6,ink).line(5,5,7,2,ink);}else{r.vline(3,2,6,ink).vline(5,2,6,ink);}
      drawText(r,label,10+Math.floor((PW-12-textWidth(label))/2),1,ink);
    }
  }
  return r;
}

function generate(stage){
  let tmp=null;
  if(!stage){tmp=wireframeStage();stage=tmp.dir;}
  try{
    const out={};
    for(const e of REQ.files)if(/ICNH\.(SHP|TEM)$/.test(e.name))out[e.name]=[cameo(e.name,stage)];
    out["HCLOCK.SHP"]=Array.from({length:STEPS+1},(_,i)=>clockFrame(i));
    out["HPIPS.SHP"]=Array.from({length:8},(_,i)=>pip(i));
    return out;
  }finally{if(tmp)tmp.cleanup();}
}
module.exports={generate,cameo,clockFrame,pip,bestFrame,bounds,STEPS,W,H,PW,PH};
