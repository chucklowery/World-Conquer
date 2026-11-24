"use strict";
// UI-D: MOUSE.SHP (every frame of the engine's cursor table), SELECT.SHP
// (selection brackets and the repair wrench overlay) and TRANS.ICN (the
// placement grid). Thin, bright vector strokes with a dark outline.
const fs=require("node:fs"),path=require("node:path");
const {Raster}=require("./raster.js");
const UI=require("./ui-colors.js");
const {encodeShape}=require("../encode-shape.js");
const {encodeIconset}=require("../encode-iconset.js");

// The cursor table, parsed from the engine source so the art can never
// drift from it (mouse.cpp MouseClass::MouseControl).
function cursorTable(){
  const src=fs.readFileSync(path.join(__dirname,"../../../tiberiandawn/mouse.cpp"),"latin1");
  const body=src.slice(src.indexOf("MouseClass::MouseControl[MOUSE_COUNT]"));
  const rows=[...body.matchAll(/\{\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\s*\},\s*\/\/\s*(MOUSE_\w+)/g)];
  if(rows.length!==34)throw Error("Cursor table parse: "+rows.length+" rows");
  return rows.map(m=>({name:m[7],start:+m[1],count:+m[2],rate:+m[3],small:+m[4],x:+m[5],y:+m[6]}));
}
const CW=30,CH=24;            // largest hotspot is (29,23): mouse.cpp:306-339

// Stroke helper: draw with a dark 1 px outline under bright ink.
function ink(r,draw,color,outline=UI.shadow){
  const tmp=new Raster(r.width,r.height,0);draw(tmp,1);
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)if(tmp.get(x,y))
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])if(!tmp.get(x+dx,y+dy))r.set(x+dx,y+dy,outline);
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)if(tmp.get(x,y))r.set(x,y,color);
  return r;
}
const canvas=()=>new Raster(CW,CH,0);
function arrow(color=UI.button,scale=1){
  const r=canvas();
  // Thin select arrow with its tip exactly on the (0,0) hotspot.
  return ink(r,t=>t.poly([[0,0],[0,15*scale],[4*scale,11*scale],[7*scale,17*scale],[9*scale,16*scale],[6*scale,10*scale],[11*scale,10*scale]].map(([x,y])=>[x,y]),1),color);
}
// Edge-scroll chevrons: tip on the hotspot, pointing off-screen.
const DIRS={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
function chevron(dir,hx,hy,color,blocked){
  const r=canvas(),[dx,dy]=DIRS[dir],n=Math.hypot(dx,dy),ux=dx/n,uy=dy/n,px=-uy,py=ux;
  // Pull the tip one pixel inside the canvas so the outline fits.
  const tx=Math.min(CW-1,Math.max(0,hx)),ty=Math.min(CH-1,Math.max(0,hy));
  return ink(r,t=>{
    for(const back of [0,5]){
      const bx=tx-ux*back,by=ty-uy*back;
      t.line(bx,by,bx-ux*6+px*6,by-uy*6+py*6,1).line(bx,by,bx-ux*6-px*6,by-uy*6-py*6,1);
    }
    if(blocked){const cx=tx-ux*10,cy=ty-uy*10;t.line(cx+px*6,cy+py*6,cx-px*6,cy-py*6,1);}
  },color);
}
const C=[15,12];
function reticle(size,color,{gap=2,dot=true,ticks=true}={}){
  const r=canvas(),[cx,cy]=C;
  return ink(r,t=>{
    if(ticks)for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=cx+sx*size,y=cy+sy*size;t.line(x,y,x-sx*3,y,1).line(x,y,x,y-sy*3,1);
    }
    if(dot)t.set(cx,cy,1);
    if(gap!=null&&!ticks){t.line(cx-size,cy,cx-gap,cy,1).line(cx+gap,cy,cx+size,cy,1).line(cx,cy-size,cx,cy-gap,1).line(cx,cy+gap,cx,cy+size,1);}
  },color);
}
function cross(size,color){
  const r=canvas(),[cx,cy]=C;
  return ink(r,t=>{t.line(cx-size,cy-size,cx+size,cy+size,1).line(cx-size,cy+size,cx+size,cy-size,1);},color);
}
function ring(radius,color,{cross:withCross=false,dash=0}={}){
  const r=canvas(),[cx,cy]=C;
  return ink(r,t=>{
    for(let a=0;a<64;a++){
      if(dash&&Math.floor(a/dash)%2)continue;
      const th=a/64*2*Math.PI;t.set(Math.round(cx+Math.cos(th)*radius),Math.round(cy+Math.sin(th)*radius),1);
    }
    if(withCross){t.line(cx-radius-3,cy,cx-2,cy,1).line(cx+2,cy,cx+radius+3,cy,1).line(cx,cy-radius-3,cx,cy-2,1).line(cx,cy+2,cx,cy+radius+3,1);}
  },color);
}
function glyph(kind,color,phase=0){
  const r=canvas(),[cx,cy]=C;
  return ink(r,t=>{
    if(kind==="wrench"){
      const a=Math.sin(phase*2*Math.PI)*0.35,c=Math.cos(a-0.8),s=Math.sin(a-0.8);
      const p=(u,v)=>[cx+u*c-v*s,cy+u*s+v*c];
      t.line(...p(-7,0),...p(4,0),1).line(...p(-7,1),...p(4,1),1);
      t.line(...p(4,-3),...p(8,-3),1).line(...p(4,4),...p(8,4),1).line(...p(4,-3),...p(4,4),1);
    }else if(kind==="sell"){
      t.rect(cx-3,cy-6,7,1,1).rect(cx-4,cy-5,1,4,1).rect(cx-3,cy-1,6,1,1).rect(cx+3,cy,1,4,1).rect(cx-4,cy+4,7,1,1).line(cx,cy-8,cx,cy+6,1);
      const rr=7+Math.round(Math.sin(phase*2*Math.PI)*1.5);
      for(let k=0;k<4;k++){const th=phase*2*Math.PI+k*Math.PI/2;t.set(Math.round(cx+Math.cos(th)*rr*1.3),Math.round(cy+Math.sin(th)*rr),1);}
    }else if(kind==="deploy"){
      const d=3+Math.round(phase*4);
      for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=cx+sx*(10-d),y=cy+sy*(9-d);t.line(x,y,x+sx*4,y+sy*4,1).line(x,y,x+sx*3,y,1).line(x,y,x,y+sy*3,1);}
    }else if(kind==="enter"){
      // Door frame right of the hotspot, arrow entering from the left.
      t.frame(cx+1,cy-5,9,11,1);const o=Math.round(phase*3);t.line(cx-9+o,cy,cx-1+o,cy,1).line(cx-4+o,cy-3,cx-1+o,cy,1).line(cx-4+o,cy+3,cx-1+o,cy,1);
    }else if(kind==="bomb"){
      t.poly([[cx-5,cy-1],[cx-3,cy-4],[cx+3,cy-4],[cx+5,cy-1],[cx+5,cy+3],[cx+3,cy+5],[cx-3,cy+5],[cx-5,cy+3]],1);
      if(phase<0.5)t.line(cx+4,cy-5,cx+7,cy-8,1);
    }else if(kind==="guard"){
      t.outline([[cx,cy-7],[cx+6,cy-4],[cx+6,cy+2],[cx,cy+7],[cx-6,cy+2],[cx-6,cy-4]],1);t.set(cx,cy,1);
    }
  },color);
}
function strike(kind,phase){
  // Support-power targets: a reticle plus a motif that rotates or pulses.
  const base=ring(8,kind==="ion"?UI.ice:kind==="nuke"?UI.amber:UI.red,{dash:4});
  const [cx,cy]=C,th=phase*2*Math.PI;
  const r=base;
  const tips=kind==="air"?2:3;
  for(let k=0;k<tips;k++){const a=th+k*2*Math.PI/tips;const x=Math.round(cx+Math.cos(a)*11),y=Math.round(cy+Math.sin(a)*10);
    if(x>=0&&x<CW&&y>=0&&y<CH){r.set(x,y,UI.button);}}
  r.set(cx,cy,UI.button);
  return r;
}
function small(frame){
  // Small variants (radar map): the same art at half size around the hotspot.
  const f=frame.toFrame?frame:frame,r=canvas(),[cx,cy]=C;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    const sx=cx+(x-cx)*2,sy=cy+(y-cy)*2;const p=f.get(sx,sy)||f.get(sx+1,sy)||f.get(sx,sy+1);
    if(p)r.set(x,y,f.get(sx,sy)||p);
  }
  return r;
}
// Build every frame index used by the table, then fill unused indices with
// the normal arrow so an out-of-table index can never draw garbage.
function mouseFrames(){
  const table=cursorTable(),by=Object.fromEntries(table.map(t=>[t.name,t]));
  const total=Math.max(...table.map(t=>t.start+t.count),...table.filter(t=>t.small>=0).map(t=>t.small+t.count));
  const frames=new Array(total).fill(null);
  const put=(i,r)=>{frames[i]=r;};
  const seq=(name,fn)=>{const t=by[name];for(let k=0;k<t.count;k++)put(t.start+k,fn(k/t.count,k));};
  const seqSmall=(name,fn)=>{const t=by[name];if(t.small<0)return;for(let k=0;k<t.count;k++)put(t.small+k,small(fn(k/t.count,k)));};
  seq("MOUSE_NORMAL",()=>arrow());
  put(by.MOUSE_NORMAL.small,arrow(UI.button,0.6));
  for(const d of Object.keys(DIRS)){
    seq("MOUSE_"+d,()=>chevron(d,by["MOUSE_"+d].x,by["MOUSE_"+d].y,UI.ice,false));
    seq("MOUSE_NO_"+d,()=>chevron(d,by["MOUSE_NO_"+d].x,by["MOUSE_NO_"+d].y,UI.red,true));
  }
  const move=()=>reticle(6,UI.button),noMove=()=>cross(5,UI.red);
  seq("MOUSE_CAN_MOVE",move);seqSmall("MOUSE_CAN_MOVE",move);
  seq("MOUSE_NO_MOVE",noMove);seqSmall("MOUSE_NO_MOVE",noMove);
  seq("MOUSE_CAN_SELECT",p=>reticle(9-Math.round(Math.sin(p*Math.PI)*2),UI.button,{dot:false}));
  const attack=p=>ring(6+Math.round(Math.sin(p*2*Math.PI)*2),UI.red,{cross:true});
  seq("MOUSE_CAN_ATTACK",attack);seqSmall("MOUSE_CAN_ATTACK",attack);
  const enter=p=>glyph("enter",UI.normal,p);seq("MOUSE_ENTER",enter);seqSmall("MOUSE_ENTER",enter);
  seq("MOUSE_DEPLOY",p=>glyph("deploy",UI.normal,p));
  seq("MOUSE_SELL_BACK",p=>glyph("sell",UI.normal,p));
  seq("MOUSE_SELL_UNIT",p=>glyph("sell",UI.amber,p));
  seq("MOUSE_REPAIR",p=>glyph("wrench",UI.normal,p));
  seq("MOUSE_NO_REPAIR",()=>{const r=glyph("wrench",UI.grey,0);return ink(r,t=>t.line(5,2,25,22,1),UI.red);});
  seq("MOUSE_NO_SELL_BACK",()=>{const r=glyph("sell",UI.grey,0);return ink(r,t=>t.line(5,2,25,22,1),UI.red);});
  seq("MOUSE_RADAR_CURSOR",()=>arrow(UI.ice));put(by.MOUSE_RADAR_CURSOR.small,arrow(UI.ice,0.6));
  seq("MOUSE_ION_CANNON",p=>strike("ion",p));
  seq("MOUSE_NUCLEAR_BOMB",p=>strike("nuke",p));
  seq("MOUSE_AIR_STRIKE",p=>strike("air",p));
  const demo=p=>glyph("bomb",UI.amber,p);seq("MOUSE_DEMOLITIONS",demo);seqSmall("MOUSE_DEMOLITIONS",demo);
  const guard=()=>glyph("guard",UI.ice);seq("MOUSE_AREA_GUARD",guard);put(by.MOUSE_AREA_GUARD.small,small(guard()));
  const unused=[];
  for(let i=0;i<frames.length;i++)if(!frames[i]){frames[i]=arrow();unused.push(i);}
  return {frames,table,unused};
}

// SELECT.SHP (defines.h:1733-1740): 0 infantry box, 1 unit/building box, 2
// repair wrench overlay drawn SHAPE_CENTER over a repairing building
// (building.cpp:689). One size per file: 24x24.
function selectFrames(){
  const S=24,brackets=(m,c)=>{const r=new Raster(S,S,0);return ink(r,t=>{for(const [x,y,sx,sy] of [[m,m,1,1],[S-1-m,m,-1,1],[m,S-1-m,1,-1],[S-1-m,S-1-m,-1,-1]])t.line(x,y,x+sx*4,y,1).line(x,y,x,y+sy*4,1);},c);};
  const w=new Raster(S,S,0);
  ink(w,t=>{t.line(5,18,14,9,1).line(6,18,15,9,1);t.poly([[13,5],[18,3],[21,6],[19,11],[15,11],[13,9]],1);t.rect(16,6,2,2,0);},UI.normal);
  return [brackets(5,UI.button),brackets(1,UI.button),w];
}

// TRANS.ICN (cell.cpp:1120-1122): icon 0 allowed, icon 2 blocked; index 0 is
// transparent so the ground stays visible. Allowed and blocked differ in
// geometry (single-direction hatch vs cross-hatch with a full border) as
// well as hue.
function transIcons(){
  const tile=fn=>{const r=new Raster(24,24,0);fn(r);return r.pixels;};
  const allowed=tile(r=>{
    for(let k=-24;k<24;k+=6)for(let t=0;t<24;t++){const x=k+t;if(x>=0&&x<24&&(t%2===0))r.set(x,23-t,UI.normal);}
    for(const [x,y,sx,sy] of [[0,0,1,1],[23,0,-1,1],[0,23,1,-1],[23,23,-1,-1]])r.line(x,y,x+sx*4,y,UI.normal).line(x,y,x,y+sy*4,UI.normal);
  });
  const blocked=tile(r=>{
    for(let k=-24;k<24;k+=6)for(let t=0;t<24;t++){
      const a=k+t,b=k+23-t;
      if(a>=0&&a<24)r.set(a,t,UI.red);
      if(b>=0&&b<24)r.set(b,t,UI.red);
    }
    r.frame(0,0,24,24,UI.critical);
  });
  const unused=tile(()=>{});
  return [allowed,unused,blocked];
}

function generate(){
  return {
    "SELECT.SHP":selectFrames(),
    "TRANS.ICN":encodeIconset({icons:transIcons()})
  };
}
// MOUSE.SHP lives in the boot archives (boot-pack.js; init.cpp:268 loads it
// before CONQUER.MIX), so it is built here and written by boot-pack.
function mouseShape(){
  const {frames}=mouseFrames();
  return encodeShape({frames:frames.map(f=>f.toFrame())});
}
module.exports={generate,mouseShape,mouseFrames,cursorTable,selectFrames,transIcons,CW,CH};
