"use strict";
// M5 roster art: renders every engine file of the minimum roster from the
// models in models.js (original, CC0) and writes them as tactical shapes.
// pack.js calls build() after the wireframe placeholders, so these files
// replace them; PROVENANCE.json records them as tools/content/art.
//
// Frame layouts follow the engine's draw code (cited per object below).
const fs=require("node:fs");
const path=require("node:path");
const {encodeTacticalShape}=require("../encode-shape.js");
const {render:renderRaw,frameHeading}=require("./render.js");
// Many frames repeat a pose (infantry guard frames, single-frame buildings
// drawn at 1x and HD, cameos); render each distinct model and view once.
const renderCache=new Map();
function render(parts,opts){
  const key=JSON.stringify([parts,opts]);
  let px=renderCache.get(key);
  if(!px){px=renderRaw(parts,opts);renderCache.set(key,px);}
  return px.slice();
}
const m=require("./models.js");

// ---------- helpers ----------
const frame=(width,height,pixels)=>({width,height,pixels});
// Body (and optional turret) at a 32-step heading, centred (SHAPE_CENTER).
// scale > 1 renders the HD version (hd.js): same view, scale times the pixels.
function unitFrame(parts,size,k,opts={},scale=1){
  const S=size*scale;
  return frame(S,S,render(parts,{width:S,height:S,origin:[S/2,S/2],heading:frameHeading(k),scale,...opts}));
}
function overlay(under,over){return under.map((v,i)=>over[i]&&over[i]!==4?over[i]:(v||over[i]));}
// Deterministic hash for damage variation.
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return (n>>>0)/4294967296;}
// Damaged version of a structure. Small models with few parts must still
// read as hurt, so this always: burns at least half of the parts that are
// not house colour (two at the least), lays scorch marks and a hole on the
// two largest roofs, and sets two or three fires (flicker by frame). The pad
// (first part) stays.
function damaged(parts,seed,flicker=0){
  const M=m.M;
  const candidates=[];
  for(let i=1;i<parts.length;i++){const p=parts[i];if(!p.detail&&p.mat!==M.house&&p.mat!==M.houseDk&&!p.mat.glow)candidates.push(i);}
  // Detail parts (HD only) burn about half the time.
  for(let i=1;i<parts.length;i++)if(parts[i].detail&&hash(seed*41+i)<0.5)candidates.push(-i);
  const main=candidates.filter(i=>i>0);
  const ranked=main.slice().sort((a,b)=>hash(seed*31+a)-hash(seed*31+b));
  const burn=new Set([...ranked.slice(0,Math.max(2,Math.ceil(main.length/2))),...candidates.filter(i=>i<0).map(i=>-i)]);
  const out=parts.map((p,i)=>burn.has(i)?{...p,mat:M.burnt}:p);
  // Largest roofs: box parts by top area.
  const roofs=[];
  for(let i=1;i<parts.length;i++){const p=parts[i];if(!p.detail&&p.shape==="box"&&!p.mat.glow&&p.max[2]>1.5)roofs.push(p);}
  roofs.sort((a,b)=>(b.max[0]-b.min[0])*(b.max[1]-b.min[1])-(a.max[0]-a.min[0])*(a.max[1]-a.min[1]));
  const decals=[],fires=[];
  roofs.slice(0,2).forEach((p,r)=>{
    const w=p.max[0]-p.min[0],h=p.max[1]-p.min[1],z=p.max[2];
    const at=(k,f)=>[p.min[0]+w*(0.15+0.7*hash(seed*13+r*5+k)),p.min[1]+h*(0.15+0.7*hash(seed*17+r*5+k))];
    // Scorch: a dark patch about half the roof; hole: a small black pit.
    const [sx,sy]=at(1),sw=Math.max(1.5,w*0.3),sh=Math.max(1.5,h*0.3);
    decals.push(m.box([Math.max(p.min[0],sx-sw),Math.max(p.min[1],sy-sh),z],[Math.min(p.max[0],sx+sw),Math.min(p.max[1],sy+sh),z+0.25],M.burnt));
    const [hx,hy]=at(2),hw=Math.max(1,w*0.12),hh=Math.max(1,h*0.12);
    decals.push(m.box([Math.max(p.min[0],hx-hw),Math.max(p.min[1],hy-hh),z],[Math.min(p.max[0],hx+hw),Math.min(p.max[1],hy+hh),z+0.35],{ramp:"dark",lo:15,hi:17}));
    for(let k=0;k<(r===0?2:1);k++){
      const [fx,fy]=at(3+k);
      fires.push(m.sphere([fx,fy,z+1],1.1+((flicker+k+r)%3)*0.45,M.fire,{noShadow:true}));
    }
  });
  return out.concat(decals,fires);
}
// Clip a model to z <= h (build-up animation). Every part the cut goes
// through is marked so its cut face renders as an open interior crossed by
// girders (render.js cap) instead of a finished roof.
function clip(parts,h){
  const out=[];
  const cap={z:h};
  for(const p of parts){
    if(p.shape==="box"){
      if(p.min[2]>=h)continue;
      if(p.max[2]<=h)out.push(p);
      else out.push({...p,max:[p.max[0],p.max[1],h],_planes:undefined,cap});
    }else if(p.shape==="cyl"){
      if((p.axis||"z")==="z"){if(p.lo>=h)continue;out.push(p.hi<=h?p:{...p,hi:h,cap});}
      else if(p.c[2]-p.r<h)out.push(p);
    }else if(p.shape==="sphere"){if(p.c[2]+p.r<=h)out.push(p);}
    else if(p.shape==="poly"){out.push({...p,planes:[...p.planes,{n:[0,0,1],d:h}],cap});}
  }
  return out;
}
// Scaffolding while a structure builds up: steel poles at the corners of the
// rising mass and a house-coloured walkway round it at the cut.
function scaffold(parts,z){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of parts.slice(1))if(p.shape==="box"&&!p.detail){x0=Math.min(x0,p.min[0]);y0=Math.min(y0,p.min[1]);x1=Math.max(x1,p.max[0]);y1=Math.max(y1,p.max[1]);}
  if(!isFinite(x0))return [];
  const out=[];
  const top=z+1.2;
  for(const [x,y] of [[x0-1,y0-1],[x1+1,y0-1],[x0-1,y1+1],[x1+1,y1+1]])out.push(m.box([x-0.5,y-0.5,0],[x+0.5,y+0.5,top],m.M.steel));
  out.push(m.box([x0-1.5,y1+0.5,z],[x1+1.5,y1+1.5,z+0.5],m.M.house));
  out.push(m.box([x1+0.5,y0-1.5,z],[x1+1.5,y1+1.5,z+0.5],m.M.house));
  return out;
}

// How many pixels a model reaches past the edges of a w x h frame: it is
// rendered on a padded canvas, and any model pixel outside the frame counts.
// The engine stores only the frame, so anything past it is cut off.
function overflow(parts,w,h,{heading=0,origin=[w/2,h/2],scale=1}={}){
  const P=24,W=w+2*P,H=h+2*P;
  const px=render(parts,{width:W,height:H,origin:[origin[0]+P,origin[1]+P],heading,scale,groundShadow:false,shadow:false});
  let worst=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const v=px[y*W+x];if(!v||v===4)continue;
    worst=Math.max(worst,P-y,y-(P+h-1),P-x,x-(P+w-1));
  }
  return worst;
}
const INFANTRY={size:24,origin:[12,15],scale:1.3};

// ---------- objects ----------
// Vehicles with a turret: 32 body frames, then 32 turret frames
// (unit.cpp:2143 body, unit.cpp:2229 turret = BodyShape + 32).
function turretVehicle(body,turret,size=32,scale=1){
  const frames=[];
  for(let k=0;k<32;k++)frames.push(unitFrame(body,size,k,{},scale));
  for(let k=0;k<32;k++)frames.push(unitFrame(turret,size,k,{groundShadow:false},scale));
  return frames;
}
// Harvester: 32 body frames, then harvesting frames
// 32 + ((BodyShape+2)/4)*4 + stage(0-3) (unit.cpp:2138-2141): nine
// directions (the ninth repeats north) of four scoop stages.
function harvesterFrames(scale=1){
  const frames=[];
  for(let k=0;k<32;k++)frames.push(unitFrame(m.harvester(0),32,k,{},scale));
  for(let d=0;d<9;d++)for(let st=0;st<4;st++)frames.push(unitFrame(m.harvester(st),32,(d*4)%32,{},scale));
  return frames;
}
// Rifle infantry: the MiniGunnerDos table (idata.cpp:63-98); frame =
// Frame + facing*Jump + stage, facing from HumanShape (infantry.cpp:84):
// 0 north, then counter-clockwise in 45-degree steps.
function infantryFrames(scale=1){
  const N=532,frames=new Array(N).fill(null),S=INFANTRY.size*scale;
  const put=(i,pose,face=4)=>{if(i<N)frames[i]=frame(S,S,render(m.rifleman(pose),{width:S,height:S,
    origin:INFANTRY.origin.map(v=>v*scale),heading:face*Math.PI/4,scale:INFANTRY.scale*scale}));};
  const seq=(start,count,jump,poseOf)=>{
    if(jump)for(let f=0;f<8;f++)for(let s=0;s<count;s++)put(start+f*jump+s,poseOf(s,count),f);
    else for(let s=0;s<count;s++)put(start+s,poseOf(s,count),4);
  };
  seq(0,1,1,()=>({}));                                   // stand ready
  seq(8,1,1,()=>({}));                                   // stand guard
  seq(16,6,6,(s,c)=>({walk:s/c}));                       // walk
  seq(64,8,8,s=>({aim:true,flash:s<2}));                 // fire
  seq(128,2,2,s=>s===0?{kneel:true}:{prone:true});       // lie down
  seq(144,4,4,(s,c)=>({prone:true,crawl:s/c}));          // crawl
  seq(176,2,2,s=>s===0?{prone:true}:{kneel:true});       // get up
  seq(192,8,8,s=>({prone:true,flash:s<2}));              // prone / fire prone
  seq(256,16,0,(s,c)=>({walk:0,wave:s>4&&s<12?0.5:0}));  // idle 1
  seq(272,16,0,(s,c)=>({kneel:s>3&&s<12}));              // idle 2
  seq(288,13,0,()=>({aim:true}));                        // on guard
  seq(301,29,0,()=>({aim:true}));                        // unused hand-to-hand slots
  seq(330,5,0,s=>({aim:s>1}));                           // ready weapon
  seq(382,8,0,(s,c)=>({fall:(s+1)/c}));                  // gun death
  seq(398,8,0,(s,c)=>({fall:(s+1)/c}));                  // explosion death
  seq(406,12,0,(s,c)=>({fall:(s+1)/c}));                 // grenade death
  seq(418,18,0,(s,c)=>({fall:(s+1)/c}));                 // fire death
  seq(436,3,3,s=>({wave:(s+1)/3}));                      // gesture 1
  seq(460,3,3,s=>({wave:1}));                            // salute 1
  seq(484,3,3,s=>({wave:(3-s)/3}));                      // gesture 2
  seq(508,3,3,s=>({wave:1}));                            // salute 2
  const blank=frame(S,S,new Array(S*S).fill(0));
  return frames.map(f=>f||blank);
}
// Structures, centred on the footprint (building.cpp:645, SHAPE_CENTER).
function structureFrames(w,h,normal,count,scale=1){
  const frames=[],W=w*scale,H=h*scale,opts={width:W,height:H,origin:[W/2,H/2],scale};
  for(let i=0;i<count;i++)frames.push(frame(W,H,render(normal(i),opts)));
  // Damaged frames follow the normal ones (building.cpp:612-626).
  for(let i=0;i<count;i++)frames.push(frame(W,H,render(damaged(normal(i),w+h,i),opts)));
  return frames;
}
// Build-up: the first frames lay the pad and stake out the footprint, the
// middle ones raise the walls as open shells under scaffolding, the last is
// the finished building (the engine then switches to the normal frames).
function buildup(w,h,model,count=16,scale=1){
  const frames=[],W=w*scale,H=h*scale;
  const top=Math.max(...model.filter(p=>!p.detail).map(p=>p.shape==="box"?p.max[2]:p.shape==="cyl"?((p.axis||"z")==="z"?p.hi:p.c[2]+p.r):p.shape==="sphere"?p.c[2]+p.r:20));
  const pad=model[0];
  const ground=2,rise=count-1-ground;
  for(let f=0;f<count;f++){
    let parts;
    if(f===count-1)parts=model;
    else if(f<ground){
      // Pad only, with stakes and tape marking where the walls will go.
      parts=[pad,...scaffold(model,0.3).slice(0,4).map(p=>({...p,max:[p.max[0],p.max[1],2]}))];
      if(f===1)parts=parts.concat(clip(model.slice(1),1.2));
    }else{
      const z=Math.max(1.2,top*(f-ground+1)/(rise+1));
      parts=[pad,...clip(model.slice(1),z),...scaffold(model,z)];
    }
    frames.push(frame(W,H,render(parts,{width:W,height:H,origin:[W/2,H/2],scale})));
  }
  return frames;
}
// Sidebar cameo (64x48, sidebar.h:216-217; frame 0 only): the object on a
// dark plate with a bevel, sized to fill the picture area at one viewing
// angle, over a name strip. The engine draws READY / HOLD 8 px above the
// bottom edge "now that icons have names on them" (sidebar.cpp:2009-2037),
// so the bottom rows are the name strip.
const CAMEO_W=64,CAMEO_H=48,STRIP=9;
function cameo(parts,label,{k=28,maxScale=3.2}={}){
  const {rampIndex}=require("./palette.js");
  const ui=require("./ui.js");
  const W=CAMEO_W,H=CAMEO_H;
  // Probe at scale 1 to find the object's screen extent.
  const P=160,probe=render(parts,{width:P,height:P,origin:[P/2,P/2],heading:frameHeading(k),groundShadow:false,shadow:false});
  let x0=P,y0=P,x1=-1,y1=-1;
  for(let y=0;y<P;y++)for(let x=0;x<P;x++)if(probe[y*P+x]&&probe[y*P+x]!==4){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const areaW=W-6,areaH=H-STRIP-5;
  const scale=Math.min(maxScale,areaW/(x1-x0+1),areaH/(y1-y0+1));
  const cx=(x0+x1+1)/2-P/2,cy=(y0+y1+1)/2-P/2;
  const origin=[W/2-cx*scale,2+areaH/2+1-cy*scale];
  const art=render(parts,{width:W,height:H,origin,heading:frameHeading(k),scale,groundShadow:false,samples:3});
  const px=new Array(W*H);
  const stripTop=H-STRIP-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;
    let bg=rampIndex("steel",13-Math.round(y/H*2));
    if(y>=stripTop)bg=rampIndex("steel",15);
    if(y===stripTop)bg=rampIndex("steel",10);
    if(x===0||y===0)bg=rampIndex("steel",6);
    else if(x===W-1||y===H-1)bg=rampIndex("steel",15);
    px[i]=y<stripTop&&art[i]&&art[i]!==4?art[i]:bg;
  }
  const f=frame(W,H,px);
  if(label){
    const tw=ui.textWidth(label);
    if(tw>W-4)throw Error("Cameo label too wide: "+label);
    ui.text(f,label,Math.floor((W-tw)/2),stripTop+2,rampIndex("steel",1));
  }
  return [f];
}

// ---------- the roster ----------
// Every map sprite of the roster at a scale: 1 for the SHP files, HD_SCALE
// for the HD sheets (hd.js), which must match them frame for frame.
function rosterFrames(scale=1){
  const out={};
  out["MTNK.SHP"]=turretVehicle(m.tankBody(),m.tankTurret(),32,scale);
  out["JEEP.SHP"]=turretVehicle(m.jeepBody(),m.jeepTurret(),32,scale);
  out["HARV.SHP"]=harvesterFrames(scale);
  out["MCV.SHP"]=Array.from({length:32},(_,k)=>unitFrame(m.mcv(),32,k,{},scale));
  out["E1.SHP"]=infantryFrames(scale);
  // Construction yard: idle 0-3, active 4-23 (bdata.cpp:3792-3793).
  out["FACT.SHP"]=structureFrames(72,48,i=>i<4?m.constructionYard({blink:i%2}):m.constructionYard({busy:(i-4)/20,blink:i%2}),24,scale);
  // Power plant: idle 0-3 (bdata.cpp:3798).
  out["NUKE.SHP"]=structureFrames(48,48,i=>m.powerPlant({phase:i}),4,scale);
  // Refinery: idle 0-5, full 6-11, docking 12-18, siphon 19-23, undock
  // 24-29 (bdata.cpp:3801-3805).
  out["PROC.SHP"]=structureFrames(72,72,i=>{
    if(i<6)return m.refinery({lights:i});
    if(i<12)return m.refinery({lights:i,full:true});
    if(i<19)return m.refinery({lights:i,dump:(i-12)/6});
    if(i<24)return m.refinery({lights:i,dump:1-((i-19)%2)*0.15});
    return m.refinery({lights:i,dump:1-(i-24)/5});
  },30,scale);
  // Barracks: idle/active 0-9 (bdata.cpp:3790-3791).
  out["PYLE.SHP"]=structureFrames(48,48,i=>m.barracks({wave:i}),10,scale);
  // Vehicle factory: 0 normal, 1 damaged (building.cpp:584-589).
  out["WEAP.SHP"]=structureFrames(72,72,()=>m.factory({doorOnly:false,open:1}),1,scale);
  // Door overlay WEAP2 (72x48, drawn centred on the factory, building.cpp:
  // 674-683): Door_Stage 0..9, +10 when damaged.
  const door=[],DW=72*scale,DH=48*scale,dopts={width:DW,height:DH,origin:[DW/2,DH/2],scale};
  for(let d=0;d<10;d++)door.push(frame(DW,DH,render(m.factory({open:d/9,doorOnly:true}),dopts)));
  for(let d=0;d<10;d++)door.push(frame(DW,DH,render(damaged([m.box([0,0,0],[0,0,0],m.M.concDk),...m.factory({open:d/9,doorOnly:true})],5,d),dopts)));
  out["WEAP2.SHP"]=door;
  // Guard tower: 0 normal, 1 damaged.
  out["GTWR.SHP"]=structureFrames(24,24,()=>m.guardTower(),1,scale);
  // Build-up animations: any length (bdata.cpp:3839-3849).
  out["FACTMAKE.SHP"]=buildup(72,48,m.constructionYard(),16,scale);
  out["NUKEMAKE.SHP"]=buildup(48,48,m.powerPlant(),16,scale);
  out["PROCMAKE.SHP"]=buildup(72,72,m.refinery(),16,scale);
  out["PYLEMAKE.SHP"]=buildup(48,48,m.barracks(),16,scale);
  out["WEAPMAKE.SHP"]=buildup(72,72,m.factory({open:0}),16,scale);
  out["GTWRMAKE.SHP"]=buildup(24,24,m.guardTower(),12,scale);
  return out;
}
function files(){
  const out=rosterFrames(1);
  const tankB=m.tankBody(),tankT=m.tankTurret();
  // Cameos for everything the roster can build (sidebar.cpp:1283-1303 picks
  // the .TEM or .SHP variant; both are written).
  // Labels are the authored names (shell.html roster guide), shortened only
  // where the strip is too narrow.
  const cameos={
    NUKE:cameo(m.powerPlant({phase:1}),"POWER PLANT"),
    PROC:cameo(m.refinery(),"REFINERY"),
    PYLE:cameo(m.barracks({wave:2}),"BARRACKS"),
    WEAP:cameo(m.factory({open:0}),"VEHICLE FACTORY"),
    GTWR:cameo(m.guardTower(),"GUARD TOWER"),
    FACT:cameo(m.constructionYard(),"CONST YARD"),
    HARV:cameo(m.harvester(0),"HARVESTER"),
    JEEP:cameo(m.jeepBody().concat(m.jeepTurret()),"SCOUT CAR"),
    MTNK:cameo(tankB.concat(tankT),"BATTLE TANK"),
    MCV:cameo(m.mcv(),"MOBILE BASE"),
    E1:cameo(m.rifleman({aim:true}),"RIFLE SQUAD"),
  };

  for(const [name,f] of Object.entries(cameos)){out[name+"ICNH.SHP"]=f;out[name+"ICNH.TEM"]=f;}
  // Explosions, hits, flashes, fire, smoke and projectiles (effects.js).
  Object.assign(out,require("./effects.js").files());
  // Command interface (ui.js).
  Object.assign(out,require("./ui.js").files());
  return out;
}

// HD sheets (hd.js) for the engine's HD layer: name -> {scale, width,
// height, frames}. The frames match NAME.SHP one for one.
const HD_SCALE=2;
// Every file that gets an HD sheet, built at a scale: the roster's map
// sprites, every effect and projectile (effects.js), and the terrain objects
// drawn as shapes (crystal, trees, aprons, craters and scorch marks;
// terrain.js). Terrain templates are drawn as icons, not shapes, so the HD
// layer does not see them.
function hdSources(scale){
  const terrain=require("./terrain.js");
  const out={...rosterFrames(scale),...require("./effects.js").files(scale)};
  for(let n=1;n<=12;n++)out["TI"+n+".TEM"]=terrain.crystalFrames(n,scale);
  out["T01.TEM"]=terrain.treeFrames(scale);
  Object.assign(out,terrain.smudges(scale));
  return out;
}
const hdName=name=>name.replace(/\.(SHP|TEM)$/,".HD2");
function hdFiles(scale=HD_SCALE){
  const out={};
  const base=hdSources(1);
  for(const [name,frames] of Object.entries(hdSources(scale))){
    const b=base[name].find(f=>f)||base[name][0];
    out[hdName(name)]={scale,width:b.width,height:b.height,frames,source:name,base:base[name]};
  }
  return out;
}

// Write every roster file into dir; returns the file names written.
function build(dir){
  const made=[];
  const {encodeHD}=require("./hd.js");
  for(const [name,sheet] of Object.entries(hdFiles())){
    fs.writeFileSync(path.join(dir,name),encodeHD(sheet.frames,sheet.scale,sheet.width,sheet.height));
    made.push(name);
  }
  for(const [name,frames] of Object.entries(files())){
    fs.writeFileSync(path.join(dir,name),encodeTacticalShape({frames}));
    made.push(name);
  }
  // The placement grid is an icon set, not a shape (cell.cpp:1120).
  fs.writeFileSync(path.join(dir,"TRANS.ICN"),require("./ui.js").placementGrid());
  made.push("TRANS.ICN");
  return made;
}
build.sources=["tools/content/art/build.js","tools/content/art/hd.js","tools/content/art/terrain.js","tools/content/art/models.js","tools/content/art/effects.js","tools/content/art/ui.js","tools/content/art/render.js","tools/content/art/palette.js"];
module.exports={build,files,hdFiles,hdSources,HD_SCALE,cameo,damaged,clip,overflow,INFANTRY};
if(require.main===module){
  const out=process.argv[2];
  if(!out){console.error("Usage: node tools/content/art/build.js <outDir>");process.exit(1);}
  fs.mkdirSync(out,{recursive:true});
  const t=Date.now();const names=build(out);
  console.log("Rendered",names.length,"files in",Date.now()-t,"ms");
}
