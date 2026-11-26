"use strict";
// Original M5 roster models (CC0). Units are pixels; model space faces north
// (-y), x east, z up, origin on the ground at the object's centre.
// Materials name palette ramps (art/palette.js); "house" is the remap band.

const M={
  olive:   {ramp:"olive",lo:2,hi:14},
  oliveDk: {ramp:"olive",lo:7,hi:15},
  steel:   {ramp:"steel",lo:2,hi:14,spec:0.25},
  steelDk: {ramp:"steel",lo:8,hi:15},
  track:   {ramp:"dark",lo:4,hi:15},
  house:   {ramp:"house",lo:0,hi:7},
  houseDk: {ramp:"house",lo:2,hi:7},
  glass:   {ramp:"glass",lo:0,hi:5,spec:0.6},
  concrete:{ramp:"rock",lo:1,hi:12},
  concDk:  {ramp:"rock",lo:6,hi:15},
  sand:    {ramp:"sand",lo:0,hi:5},
  earth:   {ramp:"earth",lo:3,hi:14},
  skin:    {ramp:"earth",lo:1,hi:8},
  light:   {ramp:"fire",lo:1,hi:2,glow:true},
  lightOff:{ramp:"fire",lo:9,hi:10,glow:true},
  greenLt: {ramp:"crystal",lo:1,hi:2,glow:true},
  crystal: {ramp:"crystal",lo:0,hi:7,spec:0.8},
  fire:    {ramp:"fire",lo:0,hi:6,glow:true},
  burnt:   {ramp:"dark",lo:6,hi:16},
};

const box=(min,max,mat,extra={})=>({shape:"box",min,max,mat,...extra});
const cyl=(c,r,lo,hi,mat,axis="z",extra={})=>({shape:"cyl",c,r,lo,hi,mat,axis,...extra});
const sphere=(c,r,mat,extra={})=>({shape:"sphere",c,r,mat,...extra});
// Box with a sloped front: the top falls from ztop at y=yBack to zFront at
// y=yFront (yFront < yBack, i.e. the slope faces north).
function slope(min,max,zFront,mat){
  const [x0,y0,z0]=min,[x1,y1,z1]=max;
  // Plane through (y0,zFront) and (y1,z1): normal (0, -(z1-zFront), (y1-y0)) normalised.
  const ny=-(z1-zFront),nz=(y1-y0),l=Math.hypot(ny,nz);
  const n=[0,ny/l,nz/l];
  return {shape:"poly",mat,planes:[
    {n:[-1,0,0],d:-x0},{n:[1,0,0],d:x1},{n:[0,-1,0],d:-y0},{n:[0,1,0],d:y1},{n:[0,0,-1],d:-z0},
    {n,d:n[1]*y0+n[2]*zFront}]};
}

// ----- vehicles -----
// Medium tank (MTNK): wide tracked hull with a round turret and long gun.
function tankBody(){
  return [
    box([-7,-9,0],[-4,9,3],M.track),box([4,-9,0],[7,9,3],M.track),
    slope([-5.5,-8.5,1.5],[5.5,8,5],3,M.olive),
    box([-5.5,5,4.5],[5.5,8,5.5],M.oliveDk),
    box([-6.5,-2,3],[-5.5,6,4],M.house),box([5.5,-2,3],[6.5,6,4],M.house),
  ];
}
function tankTurret(){
  return [
    cyl([0,1,0],4.4,5,8,M.olive),
    box([-2.6,-1,8],[2.6,3.5,8.8],M.house),
    cyl([0,-6,6.6],0.9,-13,-3,M.steel,"y"),
    box([-1.2,3,7.5],[1.2,5,9],M.oliveDk),
  ];
}
// Light vehicle (JEEP): fast four-wheeler with an open cab and a pintle gun.
function jeepBody(){
  return [
    cyl([-4.2,-4.5,1.7],1.7,-5.6,-2.8,M.track,"x"),cyl([-4.2,4.5,1.7],1.7,-5.6,-2.8,M.track,"x"),
    cyl([4.2,-4.5,1.7],1.7,2.8,5.6,M.track,"x"),cyl([4.2,4.5,1.7],1.7,2.8,5.6,M.track,"x"),
    slope([-3.8,-7,1.5],[3.8,7,4],2.6,M.olive),
    box([-3.8,-1,4],[3.8,0,6],M.steelDk),
    box([-3,-2.5,4],[3,-1,5.5],M.glass),
    box([-3.8,3,4],[3.8,6.5,4.8],M.house),
  ];
}
function jeepTurret(){
  return [
    cyl([0,2,4],1.6,4,6.6,M.steel),
    cyl([0,-1.5,6],0.6,-5.5,1,M.steelDk,"y"),
    box([-1.4,1.2,6],[1.4,2.8,7.6],M.house),
  ];
}
// Harvester (HARV): tracked hopper truck with a front collector drum.
function harvester(stage=0){
  const drum=Math.sin(stage*Math.PI/2)*0.6;
  return [
    box([-7,-8,0],[-4.5,9,3],M.track),box([4.5,-8,0],[7,9,3],M.track),
    box([-5,-6,2],[5,9,6],M.olive),
    box([-5.5,-1,6],[5.5,9,10],M.house),
    box([-4.2,0,9.5],[4.2,8,10.5],M.houseDk),
    slope([-4,-9,2],[4,-3,8],5,M.steel),
    box([-3,-8.5,6],[3,-5,8],M.glass),
    cyl([0,-11+drum,2],2,-6,6,M.steelDk,"x"),
  ];
}
// Mobile base vehicle (MCV): long truck carrying a folded construction yard.
function mcv(){
  return [
    box([-7.5,-11,0],[-4.5,11,3],M.track),box([4.5,-11,0],[7.5,11,3],M.track),
    box([-6,-12,2],[6,11,5],M.oliveDk),
    slope([-5,-13,4],[5,-6,9],6,M.olive),
    box([-3.5,-12,6.5],[3.5,-9,8.5],M.glass),
    box([-6,-5,5],[6,10,10],M.concrete),
    box([-6.5,-4,9.5],[6.5,9,11],M.house),
    cyl([3,6,11],1.5,11,15,M.steel),box([-3,5,14],[4,7,15],M.steel),
  ];
}


// ----- structures -----
// Concrete pad helper: a low slab covering the footprint.
const pad=(w,h,mat=M.concDk)=>box([-w/2+1,-h/2+1,0],[w/2-1,h/2-1,1],mat);
// Construction yard (FACT, 3x2): low hall, control cabin, and a crane whose
// arm swings while building (t = 0..1 over the active animation).
function constructionYard({busy=0,blink=0}={}){
  const a=busy*Math.PI*2;
  const armX=Math.cos(a)*9,armY=Math.sin(a)*4;
  return [
    pad(72,48),
    box([-33,-8,1],[8,20,9],M.concrete),
    box([-33,-8,9],[8,-5,10],M.house),
    slope([-31,-12,1],[6,-8,9],1,M.concDk),
    box([-28,0,9],[2,16,11],M.steelDk),
    box([12,-4,1],[32,20,12],M.olive),
    box([14,-2,12],[30,10,15],M.glass),
    box([12,17,1],[32,20,12],M.house),
    cyl([22,10,12],1.6,12,20,M.steel),
    box([22-1,10-1,19],[22+armX+1,10+armY+1,20.5],M.steel),
    box([22+armX-1.5,10+armY-1.5,15],[22+armX+1.5,10+armY+1.5,19],M.steelDk),
    sphere([-30,-4,11],1.3,blink?M.light:M.lightOff),
  ];
}
// Power plant (NUKE, 2x2): two cooling stacks with glowing vents.
function powerPlant({phase=0}={}){
  const glow=[M.light,M.lightOff][phase%2];
  return [
    pad(48,48),
    box([-21,-4,1],[21,20,7],M.concrete),
    box([-21,17,1],[21,20,7],M.house),
    cyl([-9,-2,0],8,1,15,M.steel),cyl([-9,-2,0],6,15,15.5,M.steelDk),
    cyl([10,-2,0],8,1,15,M.steel),cyl([10,-2,0],6,15,15.5,M.steelDk),
    box([-20,8,7],[-4,14,9],M.house),
    box([-2,6,7],[20,16,10],M.olive),
    sphere([-9,-2,15.2],2.4+0.6*(phase%2),glow),sphere([10,-2,15.2],2.4+0.6*((phase+1)%2),glow),
  ];
}
// Refinery (PROC, 3x3): silo bank, processing hall and an unloading pad on
// the south side where the harvester docks. dump = 0..1 tips the hopper.
function refinery({lights=0,full=false,dump=0}={}){
  const lit=full?(lights%2?M.light:M.lightOff):(lights%3===0?M.greenLt:M.lightOff);
  const tilt=dump*4;
  return [
    pad(72,72),
    cyl([-22,-18,0],9,1,18,M.steel),cyl([-22,-18,0],7,18,19,M.steelDk),
    cyl([-2,-18,0],9,1,18,M.steel),cyl([-2,-18,0],7,18,19,M.steelDk),
    box([-32,-6,1],[18,14,12],M.concrete),
    box([-32,11,1],[18,14,12],M.house),
    box([18,-20,1],[34,14,16],M.olive),
    box([20,-18,16],[32,-4,18],M.house),
    box([-12,14,1],[16,34,2],M.concDk),
    box([-10,16,2],[14,32,3+tilt],M.steelDk),
    box([-4,-4,12],[10,4,14],M.glass),
    sphere([-30,12,13],1.6,lit),sphere([16,12,13],1.6,lit),sphere([33,-6,17],1.6,lit),
  ];
}
// Barracks (PYLE, 2x2): long quarters with a mast and a flag that waves.
function barracks({wave=0}={}){
  const w=Math.sin(wave/10*Math.PI*2);
  return [
    pad(48,48),
    box([-21,-10,1],[13,14,8],M.olive),
    slope([-21,-16,1],[13,-10,8],2,M.oliveDk),
    box([-21,11,1],[13,14,8],M.house),
    box([-14,0,8],[6,8,10],M.oliveDk),
    box([-18,14,1],[-14,20,4],M.concrete),box([2,14,1],[6,20,4],M.concrete),
    cyl([16,10,0],0.9,1,16,M.steel),
    box([16,10+w*0.6,12],[22,10.6+w*1.2,16],M.house),
  ];
}
// Vehicle factory (WEAP, 3x3): tall assembly hall with a big south door.
// The door is drawn by the separate WEAP2 overlay (doorOnly) so the engine
// can animate it; open = 0..1.
function factory({open=0,doorOnly=false}={}){
  const door=[];
  const h=12*(1-open);
  if(h>0.4)door.push(box([-14,24,2+12-h],[14,26,14],M.steelDk));
  if(doorOnly)return door;
  return [
    pad(72,72),
    box([-32,-28,1],[32,24,14],M.concrete),
    box([-32,-28,14],[32,-24,16],M.house),
    box([-30,-22,14],[30,22,15],M.steelDk),
    box([-28,-18,15],[-8,0,17],M.glass),box([8,-18,15],[28,0,17],M.glass),
    box([-16,24,1],[-14,30,15],M.olive),box([14,24,1],[16,30,15],M.olive),
    box([-16,28,15],[16,30,17],M.house),
    box([-14,25,1],[14,26,2],M.track),
    box([-12,26,0.2],[12,34,1],M.concDk),
  ];
}
// Guard tower (GTWR, 1x1): sandbagged base, post and an armoured gun cab.
function guardTower(){
  return [
    cyl([0,2,0],8,0,2,M.sand),
    cyl([0,2,0],3,2,10,M.concrete),
    box([-5,-3,10],[5,6,14],M.olive),
    box([-5,-3,14],[5,6,15],M.house),
    box([-3.5,-3.5,11],[3.5,-2.5,12.5],M.glass),
    cyl([0,-6,12],0.6,-9,-3,M.steelDk,"y"),
  ];
}

// ----- infantry -----
// Rifle infantry (E1). pose: {walk (0..1 phase), aim (bool), prone (bool),
// crawl phase, fall (0..1 death), kneel}. Faces north in model space.
function rifleman(p={}){
  const s=1;
  if(p.fall!==undefined){
    // Toppling backward: lean the soldier toward +y and lower him.
    const f=Math.min(1,p.fall);
    const lean=f*7;
    return [
      box([-1.6,-1+lean*0.4,0],[1.6,2+lean,Math.max(1.2,5.5-f*4.5)],M.olive),
      sphere([0,lean+1,Math.max(1.4,7.6-f*6)],1.5,M.skin),
      sphere([0,lean+1.2,Math.max(1.8,8.2-f*6)],1.4,M.house),
      ...(f>0.5?[box([-3,lean-1,0],[3,lean+4,0.4],M.burnt)]:[]),
    ];
  }
  if(p.prone){
    const c=Math.sin((p.crawl||0)*Math.PI*2)*0.8;
    return [
      box([-1.6,-2,0],[1.6,5,1.8],M.olive),
      box([-1.4+c*0.3,5,0],[-0.2+c*0.3,8,1.2],M.oliveDk),box([0.2-c*0.3,5,0],[1.4-c*0.3,8,1.2],M.oliveDk),
      sphere([0,-3.4,1.6],1.5,M.skin),sphere([0,-3.2,2.2],1.4,M.house),
      cyl([0.9,-6,1.2],0.4,-9.5,-2,M.steelDk,"y"),
    ];
  }
  const ph=(p.walk||0)*Math.PI*2,st=Math.sin(ph)*1.4;
  const kneel=p.kneel?1.5:0;
  const parts=[
    box([-1.5,-0.6+st,0],[-0.2,0.8+st,3.2-kneel],M.oliveDk),
    box([0.2,-0.6-st,0],[1.5,0.8-st,3.2-kneel],M.oliveDk),
    box([-1.9,-1.1,3-kneel],[1.9,1.4,6.6-kneel],M.olive),
    box([-1.9,-0.4,5.6-kneel],[1.9,0.6,6.6-kneel],M.house),
    sphere([0,0,7.7-kneel],1.4,M.skin),
    sphere([0,0.2,8.3-kneel],1.35,M.house),
  ];
  if(p.aim){
    parts.push(cyl([1.0,-3.2,6.2-kneel],0.45,-7.2,-0.8,M.steelDk,"y"));
    parts.push(box([0.4,-2.2,5.4-kneel],[1.8,-0.6,6.4-kneel],M.olive));
    if(p.flash)parts.push(sphere([1.0,-7.8,6.2-kneel],1.4,M.fire,{noShadow:true}));
  }else{
    parts.push(cyl([1.9,0.2,4],0.4,1.2,6.8-kneel,M.steelDk,"z"));
    parts.push(box([-2.6,-0.6,3.4-kneel],[-1.9,0.6,6-kneel],M.olive));
  }
  if(p.wave){parts.push(box([-2.8,-0.6,6.4-kneel],[-1.9,0.6,6.4-kneel+2.6*p.wave],M.skin));}
  return parts;
}

module.exports={M,box,cyl,sphere,slope,tankBody,tankTurret,jeepBody,jeepTurret,harvester,mcv,
  constructionYard,powerPlant,refinery,barracks,factory,guardTower,rifleman};

