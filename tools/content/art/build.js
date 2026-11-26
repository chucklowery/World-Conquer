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
const {render,frameHeading}=require("./render.js");
const m=require("./models.js");

// ---------- helpers ----------
const frame=(width,height,pixels)=>({width,height,pixels});
// Body (and optional turret) at a 32-step heading, centred (SHAPE_CENTER).
function unitFrame(parts,size,k,opts={}){
  return frame(size,size,render(parts,{width:size,height:size,origin:[size/2,size/2],heading:frameHeading(k),...opts}));
}
function overlay(under,over){return under.map((v,i)=>over[i]&&over[i]!==4?over[i]:(v||over[i]));}
// Deterministic hash for damage variation.
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return (n>>>0)/4294967296;}
// Damaged version of a structure: some parts burnt, small fires (flicker by
// frame). The pad (first part) stays.
function damaged(parts,seed,flicker=0){
  const out=parts.map((p,i)=>i>0&&hash(seed*31+i)<0.4&&p.mat!==m.M.house?{...p,mat:m.M.burnt}:p);
  const fires=[];
  for(let i=1;i<parts.length&&fires.length<3;i++){
    const p=parts[i];if(p.shape!=="box")continue;
    if(hash(seed*7+i)<0.5){
      const c=[(p.min[0]+p.max[0])/2,(p.min[1]+p.max[1])/2,p.max[2]+1];
      fires.push(m.sphere(c,1.2+((flicker+i)%3)*0.5,m.M.fire,{noShadow:true}));
    }
  }
  return out.concat(fires);
}
// Clip a model to z <= h (build-up animation).
function clip(parts,h){
  const out=[];
  for(const p of parts){
    if(p.shape==="box"){if(p.min[2]>=h)continue;out.push({...p,max:[p.max[0],p.max[1],Math.min(p.max[2],h)],_planes:undefined});}
    else if(p.shape==="cyl"){
      if((p.axis||"z")==="z"){if(p.lo>=h)continue;out.push({...p,hi:Math.min(p.hi,h)});}
      else if(p.c[2]-p.r<h)out.push(p);}
    else if(p.shape==="sphere"){if(p.c[2]-p.r<h)out.push(p);}
    else if(p.shape==="poly"){out.push({...p,planes:[...p.planes,{n:[0,0,1],d:h}]});}
  }
  return out;
}
// Scaffolding drawn at the cut while a structure builds up.
function scaffold(w,h,z){
  return [m.box([-w/2+2,-h/2+2,Math.max(0,z-0.6)],[w/2-2,-h/2+3,z],m.M.house),
    m.box([-w/2+2,h/2-3,Math.max(0,z-0.6)],[w/2-2,h/2-2,z],m.M.house)];
}

// ---------- objects ----------
// Vehicles with a turret: 32 body frames, then 32 turret frames
// (unit.cpp:2143 body, unit.cpp:2229 turret = BodyShape + 32).
function turretVehicle(body,turret,size=32){
  const frames=[];
  for(let k=0;k<32;k++)frames.push(unitFrame(body,size,k));
  for(let k=0;k<32;k++)frames.push(unitFrame(turret,size,k,{groundShadow:false}));
  return frames;
}
// Harvester: 32 body frames, then harvesting frames
// 32 + ((BodyShape+2)/4)*4 + stage(0-3) (unit.cpp:2138-2141): nine
// directions (the ninth repeats north) of four scoop stages.
function harvesterFrames(){
  const frames=[];
  for(let k=0;k<32;k++)frames.push(unitFrame(m.harvester(0),32,k));
  for(let d=0;d<9;d++)for(let st=0;st<4;st++)frames.push(unitFrame(m.harvester(st),32,(d*4)%32));
  return frames;
}
// Rifle infantry: the MiniGunnerDos table (idata.cpp:63-98); frame =
// Frame + facing*Jump + stage, facing from HumanShape (infantry.cpp:84):
// 0 north, then counter-clockwise in 45-degree steps.
function infantryFrames(){
  const N=532,frames=new Array(N).fill(null);
  const put=(i,pose,face=4)=>{if(i<N)frames[i]=frame(24,24,render(m.rifleman(pose),{width:24,height:24,origin:[12,13],heading:face*Math.PI/4,scale:1.15}));};
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
  const blank=frame(24,24,new Array(576).fill(0));
  return frames.map(f=>f||blank);
}
// Structures, centred on the footprint (building.cpp:645, SHAPE_CENTER).
function structureFrames(w,h,normal,count){
  const frames=[];
  for(let i=0;i<count;i++)frames.push(frame(w,h,render(normal(i),{width:w,height:h,origin:[w/2,h/2]})));
  // Damaged frames follow the normal ones (building.cpp:612-626).
  for(let i=0;i<count;i++)frames.push(frame(w,h,render(damaged(normal(i),w+h,i),{width:w,height:h,origin:[w/2,h/2]})));
  return frames;
}
function buildup(w,h,model,count=16){
  const frames=[];
  const top=Math.max(...model.map(p=>p.shape==="box"?p.max[2]:p.shape==="cyl"?((p.axis||"z")==="z"?p.hi:p.c[2]+p.r):p.shape==="sphere"?p.c[2]+p.r:20));
  for(let f=0;f<count;f++){
    const z=Math.max(0.6,top*(f+1)/count);
    const parts=f===count-1?model:clip(model,z).concat(scaffold(w,h,z));
    frames.push(frame(w,h,render(parts,{width:w,height:h,origin:[w/2,h/2]})));
  }
  return frames;
}
// Sidebar cameo (64x48): the object on a dark plate with a bevel
// (sidebar.h:216-217; frame 0 only).
function cameo(parts,{scale=1.6,k=28,dy=6}={}){
  const W=64,H=48;
  const art=render(parts,{width:W,height:H,origin:[W/2,H/2+dy],heading:frameHeading(k),scale,groundShadow:false});
  const {rampIndex}=require("./palette.js");
  const px=new Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;
    let bg=rampIndex("steel",13-Math.round(y/H*2));
    if(x===0||y===0)bg=rampIndex("steel",6);
    else if(x===W-1||y===H-1)bg=rampIndex("steel",15);
    px[i]=art[i]&&art[i]!==4?art[i]:bg;
  }
  return [frame(W,H,px)];
}

// ---------- the roster ----------
function files(){
  const out={};
  const tankB=m.tankBody(),tankT=m.tankTurret(),jeepB=m.jeepBody(),jeepT=m.jeepTurret();
  out["MTNK.SHP"]=turretVehicle(tankB,tankT);
  out["JEEP.SHP"]=turretVehicle(jeepB,jeepT);
  out["HARV.SHP"]=harvesterFrames();
  out["MCV.SHP"]=Array.from({length:32},(_,k)=>unitFrame(m.mcv(),32,k));
  out["E1.SHP"]=infantryFrames();
  // Construction yard: idle 0-3, active 4-23 (bdata.cpp:3792-3793).
  out["FACT.SHP"]=structureFrames(72,48,i=>i<4?m.constructionYard({blink:i%2}):m.constructionYard({busy:(i-4)/20,blink:i%2}),24);
  // Power plant: idle 0-3 (bdata.cpp:3798).
  out["NUKE.SHP"]=structureFrames(48,48,i=>m.powerPlant({phase:i}),4);
  // Refinery: idle 0-5, full 6-11, docking 12-18, siphon 19-23, undock
  // 24-29 (bdata.cpp:3801-3805).
  out["PROC.SHP"]=structureFrames(72,72,i=>{
    if(i<6)return m.refinery({lights:i});
    if(i<12)return m.refinery({lights:i,full:true});
    if(i<19)return m.refinery({lights:i,dump:(i-12)/6});
    if(i<24)return m.refinery({lights:i,dump:1-((i-19)%2)*0.15});
    return m.refinery({lights:i,dump:1-(i-24)/5});
  },30);
  // Barracks: idle/active 0-9 (bdata.cpp:3790-3791).
  out["PYLE.SHP"]=structureFrames(48,48,i=>m.barracks({wave:i}),10);
  // Vehicle factory: 0 normal, 1 damaged (building.cpp:584-589).
  out["WEAP.SHP"]=structureFrames(72,72,()=>m.factory({doorOnly:false,open:1}),1);
  // Door overlay WEAP2 (72x48, drawn centred on the factory, building.cpp:
  // 674-683): Door_Stage 0..9, +10 when damaged.
  const door=[];
  for(let d=0;d<10;d++)door.push(frame(72,48,render(m.factory({open:d/9,doorOnly:true}),{width:72,height:48,origin:[36,24]})));
  for(let d=0;d<10;d++)door.push(frame(72,48,render(damaged([m.box([0,0,0],[0,0,0],m.M.concDk),...m.factory({open:d/9,doorOnly:true})],5,d),{width:72,height:48,origin:[36,24]})));
  out["WEAP2.SHP"]=door;
  // Guard tower: 0 normal, 1 damaged.
  out["GTWR.SHP"]=structureFrames(24,24,()=>m.guardTower(),1);
  // Build-up animations: any length (bdata.cpp:3839-3849).
  out["FACTMAKE.SHP"]=buildup(72,48,m.constructionYard());
  out["NUKEMAKE.SHP"]=buildup(48,48,m.powerPlant());
  out["PROCMAKE.SHP"]=buildup(72,72,m.refinery());
  out["PYLEMAKE.SHP"]=buildup(48,48,m.barracks());
  out["WEAPMAKE.SHP"]=buildup(72,72,m.factory({open:0}));
  out["GTWRMAKE.SHP"]=buildup(24,24,m.guardTower(),12);
  // Cameos for everything the roster can build (sidebar.cpp:1283-1303 picks
  // the .TEM or .SHP variant; both are written).
  const cameos={
    NUKE:cameo(m.powerPlant({phase:1}),{scale:1.0,dy:6}),
    PROC:cameo(m.refinery(),{scale:0.72,dy:4}),
    PYLE:cameo(m.barracks({wave:2}),{scale:1.0,dy:4}),
    WEAP:cameo(m.factory({open:0}),{scale:0.72,dy:4}),
    GTWR:cameo(m.guardTower(),{scale:2.1,dy:12}),
    FACT:cameo(m.constructionYard(),{scale:0.8,dy:4}),
    HARV:cameo(m.harvester(0),{scale:1.7,dy:8}),
    JEEP:cameo(m.jeepBody().concat(m.jeepTurret()),{scale:2.1,dy:6}),
    MTNK:cameo(tankB.concat(tankT),{scale:1.8,dy:6}),
    MCV:cameo(m.mcv(),{scale:1.5,dy:8}),
    E1:cameo(m.rifleman({aim:true}),{scale:3.0,dy:16}),
  };
  for(const [name,f] of Object.entries(cameos)){out[name+"ICNH.SHP"]=f;out[name+"ICNH.TEM"]=f;}
  // Explosions, hits, flashes, fire, smoke and projectiles (effects.js).
  Object.assign(out,require("./effects.js").files());
  // Command interface (ui.js).
  Object.assign(out,require("./ui.js").files());
  return out;
}

// Write every roster file into dir; returns the file names written.
function build(dir){
  const made=[];
  for(const [name,frames] of Object.entries(files())){
    fs.writeFileSync(path.join(dir,name),encodeTacticalShape({frames}));
    made.push(name);
  }
  // The placement grid is an icon set, not a shape (cell.cpp:1120).
  fs.writeFileSync(path.join(dir,"TRANS.ICN"),require("./ui.js").placementGrid());
  made.push("TRANS.ICN");
  return made;
}
build.sources=["tools/content/art/build.js","tools/content/art/models.js","tools/content/art/effects.js","tools/content/art/ui.js","tools/content/art/render.js","tools/content/art/palette.js"];
module.exports={build,files,cameo,damaged,clip};
if(require.main===module){
  const out=process.argv[2];
  if(!out){console.error("Usage: node tools/content/art/build.js <outDir>");process.exit(1);}
  fs.mkdirSync(out,{recursive:true});
  const t=Date.now();const names=build(out);
  console.log("Rendered",names.length,"files in",Date.now()-t,"ms");
}
