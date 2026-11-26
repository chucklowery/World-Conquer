"use strict";
// M5 effect and projectile art (original, CC0): explosions, hits, muzzle
// flashes, fire, smoke, the move-order flash and projectiles. Every file the
// wireframe catalog lists in its "effect" and "projectile" categories gets a
// generated replacement, so no skirmish effect falls back to a wireframe.
//
// Frame counts follow the engine (tiberiandawn/adata.cpp AnimTypeClass):
// most animations play every frame in the file (stages -1); looping ones
// (fire, burning, smoke) loop over a fixed range, so the file must reach the
// loop end. Projectiles (bullet.cpp:516-530) use 32 facings, plus tumbling
// frames for bomblets (6) and grenades (8).
const {rampIndex}=require("./palette.js");

function hash(a,b,c){let h=(a*374761393+b*668265263+c*982451653)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return ((h^(h>>>16))>>>0)/4294967296;}
const fire=s=>rampIndex("fire",Math.max(0,Math.min(12,Math.round(s))));
const smoke=s=>rampIndex("rock",Math.max(5,Math.min(15,Math.round(s*0.8+3))));
const grey=s=>rampIndex("rock",Math.max(0,Math.min(15,Math.round(s))));
function blank(w,h){return {width:w,height:h,pixels:new Array(w*h).fill(0)};}
// Blob of radius r at (cx,cy) with a ragged edge; paint(dist01,x,y) -> index.
function blob(f,cx,cy,r,seed,paint){
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
    const dx=x+0.5-cx,dy=y+0.5-cy,a=Math.atan2(dy,dx);
    const rr=r*(0.8+0.35*hash(Math.round(a*5)+50,seed,1));
    const d=Math.hypot(dx,dy)/Math.max(0.5,rr);
    if(d<1){const v=paint(d,x,y);if(v)f.pixels[y*f.width+x]=v;}
  }
}
// Fireball: expands to its biggest frame, then cools to smoke.
function explosion(size,count,{seed=1,biggest=0.35,debris=0.5}={}){
  const frames=[];
  for(let i=0;i<count;i++){
    const t=i/(count-1),f=blank(size,size),c=size/2;
    const grow=t<biggest?t/biggest:1,cool=t<biggest?0:(t-biggest)/(1-biggest);
    const R=size*0.42*(0.35+0.65*grow)*(1+cool*0.15);
    // Smoke shell.
    if(cool>0.15)blob(f,c,c-cool*size*0.08,R,seed+i,(d,x,y)=>hash(x,y,seed+i)<0.12*(1-cool)?0:smoke(6+d*6+cool*6));
    // Fire core.
    const coreR=R*(1-cool*0.95);
    if(coreR>0.8)blob(f,c,c,coreR,seed+i*3,(d,x,y)=>fire(d*6+cool*5+hash(x,y,seed)*2));
    // Debris sparks.
    const n=Math.round(debris*size*0.4*(1-cool));
    for(let k=0;k<n;k++){
      const a=hash(k,seed,2)*Math.PI*2,dist=R*(0.9+hash(k,seed,3)*0.7);
      const x=Math.round(c+Math.cos(a)*dist),y=Math.round(c+Math.sin(a)*dist);
      if(x>=0&&y>=0&&x<size&&y<size)f.pixels[y*size+x]=fire(2+cool*6);
    }
    frames.push(f);
  }
  return frames;
}
// Small bullet hit: dust and a spark.
function hit(size,count,seed){
  const frames=[];
  for(let i=0;i<count;i++){
    const t=i/Math.max(1,count-1),f=blank(size,size),c=size/2;
    blob(f,c,c-t*2,size*0.18+t*size*0.22,seed+i,(d,x,y)=>hash(x,y,seed+i)<t*0.5?0:t<0.3?fire(2+d*5):grey(5+d*6+t*4));
    if(t<0.5)f.pixels[Math.round(c)*size+Math.round(c)]=fire(0);
    frames.push(f);
  }
  return frames;
}
// Muzzle flash pointing along heading k of n (0 = north, counter-clockwise).
function flash(size,k,n,stage,stages,{len=0.42}={}){
  const f=blank(size,size),c=size/2,a=-Math.PI/2-k*2*Math.PI/n;
  const dx=Math.cos(a),dy=Math.sin(a);
  const s=1-stage/stages;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x+0.5-c,py=y+0.5-c,along=px*dx+py*dy,across=Math.abs(-px*dy+py*dx);
    const L=size*len*s;
    if(along>-1&&along<L&&across<1.2+along*0.35*(1-along/L)){
      const d=along/L+across/3;f.pixels[y*size+x]=fire(d*5+(1-s)*4);
    }
  }
  return f;
}
// Looping flames: flickering tongues over a fixed base.
function flames(size,count,seed,scale=1){
  const frames=[];
  for(let i=0;i<count;i++){
    const f=blank(size,size),base=size*0.8;
    const tongues=3+Math.round(scale*2);
    for(let k=0;k<tongues;k++){
      const x0=size*(0.25+0.5*hash(k,seed,1)),h=size*0.55*scale*(0.6+0.4*Math.abs(Math.sin(i*0.9+k*1.7)));
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const up=(base-y)/h,w=size*0.13*scale*(1-up)+0.6;
        if(up>=0&&up<1&&Math.abs(x+0.5-x0-Math.sin(i*0.7+up*3+k)*1.5)<w){
          const v=fire(up*7+hash(x,y,i+seed)*2);
          if(!f.pixels[y*size+x]||v<f.pixels[y*size+x])f.pixels[y*size+x]=v;
        }
      }
    }
    frames.push(f);
  }
  return frames;
}
// Rising smoke puffs (looping).
function smokeLoop(size,count,seed){
  const frames=[];
  for(let i=0;i<count;i++){
    const f=blank(size,size);
    for(let k=0;k<4;k++){
      const t=((i/count)+k/4)%1;
      blob(f,size/2+Math.sin(t*6+k)*size*0.1,size*(0.85-t*0.7),size*(0.12+t*0.18),seed+k,(d,x,y)=>hash(x,y,i)<t*0.6?0:smoke(5+d*5+t*6));
    }
    frames.push(f);
  }
  return frames;
}
// The move-order flash: a shrinking ring.
function ring(size,count){
  const frames=[];
  for(let i=0;i<count;i++){
    const f=blank(size,size),c=size/2,r=size*0.45*(1-i/count)+1;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const d=Math.hypot(x+0.5-c,(y+0.5-c)*1.4);
      if(Math.abs(d-r)<0.9)f.pixels[y*size+x]=rampIndex("crystal",1);
    }
    frames.push(f);
  }
  return frames;
}
// Projectile: a short glowing shell along each of 32 facings.
function projectile(size,{len=4,width=1,ramp="fire",extra=0}={}){
  const frames=[];
  for(let k=0;k<32+extra;k++){
    const f=blank(size,size),c=size/2,a=-Math.PI/2-(k%32)*2*Math.PI/32;
    const dx=Math.cos(a),dy=Math.sin(a);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const px=x+0.5-c,py=y+0.5-c,along=px*dx+py*dy,across=Math.abs(-px*dy+py*dx);
      if(Math.abs(along)<len/2+0.5&&across<width*0.5+0.5){
        const tip=(along+len/2)/len;
        f.pixels[y*size+x]=ramp==="fire"?fire(1+(1-tip)*6):rampIndex("steel",3+Math.round((1-tip)*8));
      }
    }
    frames.push(f);
  }
  return frames;
}
// A frame size from the engine's redraw size (adata.cpp "size"), even, 8..64.
const fit=n=>Math.max(8,Math.min(64,Math.ceil((Number(n)||32)/2)*2));

// Every effect and projectile file, by engine name.
function files(){
  const out={};
  const put=(name,frames)=>{out[name]=frames;};
  put("FBALL1.SHP",explosion(64,18,{seed:3,biggest:0.3}));
  put("ART-EXP1.SHP",explosion(40,16,{seed:5,biggest:0.25}));
  put("FRAG1.SHP",explosion(44,14,{seed:7,biggest:0.2,debris:1}));
  put("FRAG3.SHP",explosion(40,14,{seed:9,biggest:0.2,debris:1}));
  put("VEH-HIT1.SHP",explosion(30,12,{seed:11,biggest:0.3}));
  put("VEH-HIT2.SHP",explosion(20,10,{seed:13,biggest:0.2}));
  put("VEH-HIT3.SHP",explosion(20,10,{seed:15,biggest:0.3}));
  put("NAPALM1.SHP",explosion(22,12,{seed:17}));put("NAPALM2.SHP",explosion(40,14,{seed:19}));
  put("NAPALM3.SHP",explosion(64,16,{seed:21}));put("CHEMBALL.SHP",explosion(22,12,{seed:23}));
  put("ATOMSFX.SHP",explosion(64,24,{seed:25,biggest:0.4}));put("IONSFX.SHP",explosion(48,16,{seed:27}));
  put("PIFF.SHP",hit(14,5,31));put("PIFFPIFF.SHP",hit(20,8,33));
  put("GUNFIRE.SHP",[0,1,2,3].map(s=>flash(16,0,1,s,4,{len:0.0})).map((f,i)=>{  // round flash (stages 1)
    const c=8;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x+0.5-c,y+0.5-c);if(d<4-i)f.pixels[y*16+x]=fire(d+i*2);}return f;}));
  const gun=[];for(let k=0;k<8;k++)for(let s=0;s<6;s++)gun.push(flash(18,k,8,s,6));
  put("MINIGUN.SHP",gun);
  const sam=[];for(let k=0;k<8;k++)for(let s=0;s<18;s++)sam.push(flash(56,k,8,s,18,{len:0.3}));
  put("SAMFIRE.SHP",sam);
  // Fire loops over frames 10-21 (FIRE*) and 30-62 (BURN-*).
  put("FIRE1.SHP",flames(24,30,41,1));put("FIRE2.SHP",flames(24,30,43,0.9));
  put("FIRE3.SHP",flames(24,30,45,0.7));put("FIRE4.SHP",flames(8,30,47,0.6));
  put("BURN-L.SHP",flames(24,64,51,1));put("BURN-M.SHP",flames(16,64,53,0.8));put("BURN-S.SHP",flames(12,64,55,0.6));
  put("FLMSPT.SHP",flames(42,100,57,1));
  for(const d of ["N","NE","E","SE","S","SW","W","NW"]){put("FLAME-"+d+".SHP",flames(32,10,60,1));put("CHEM-"+d+".SHP",flames(32,10,61,1));}
  // Smoke loops from frame 67 (SMOKE_M) and 72-91 (SMOKLAND).
  put("SMOKE_M.SHP",smokeLoop(28,92,71));put("SMOKLAND.SHP",smokeLoop(32,92,73));put("SMOKEY.SHP",smokeLoop(24,12,75));
  put("MOVEFLSH.SHP",ring(24,5));put("BEACON.SHP",ring(24,5));
  // Projectiles.
  put("120MM.SHP",projectile(16,{len:4}));put("50CAL.SHP",projectile(16,{len:3}));
  put("MISSILE.SHP",projectile(16,{len:6,ramp:"steel"}));put("DRAGON.SHP",projectile(16,{len:5,ramp:"steel"}));
  put("BOMB.SHP",projectile(16,{len:2,width:2,ramp:"steel",extra:8}));put("BOMBLET.SHP",projectile(16,{len:2,width:2,extra:6}));
  put("FLAME.SHP",projectile(16,{len:5,width:2}));put("LASER.SHP",projectile(16,{len:8}));
  put("ATOMICUP.SHP",projectile(16,{len:7,width:2,ramp:"steel"}));put("ATOMICDN.SHP",projectile(16,{len:7,width:2,ramp:"steel"}));
  put("GORE.SHP",projectile(16,{len:2}));put("CHEW.SHP",projectile(16,{len:2}));
  return out;
}
module.exports={files,explosion,hit,flash,flames,smokeLoop,projectile,fit};
