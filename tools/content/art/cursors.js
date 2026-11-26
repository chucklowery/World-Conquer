"use strict";
// M5 cursors (UI-D, original, CC0): MOUSE.SHP frame for frame against the
// engine's cursor table, tiberiandawn/mouse.cpp:304-341
// (MouseControl: start frame, count, rate, small frame, hotspot x, y).
// Thin bright vector cursors with a dark outline; every frame is 30x24 so
// the table's hotspots (up to 29,23) fall inside it.
const {encodeShape}=require("../encode-shape.js");
const {rampIndex}=require("./palette.js");

const W=30,H=24,WHITE=15,BLACK=12;
const GREEN=rampIndex("crystal",1),RED=rampIndex("fire",8),AMBER=rampIndex("fire",2),STEEL=rampIndex("steel",4);
// [start, count, small, hotX, hotY] from mouse.cpp, by name.
const TABLE={
  NORMAL:[0,1,86,0,0],N:[1,1,-1,15,0],NE:[2,1,-1,29,0],E:[3,1,-1,29,12],SE:[4,1,-1,29,23],
  S:[5,1,-1,15,23],SW:[6,1,-1,0,23],W:[7,1,-1,0,13],NW:[8,1,-1,0,0],
  NO_N:[130,1,-1,15,0],NO_NE:[131,1,-1,29,0],NO_E:[132,1,-1,29,12],NO_SE:[133,1,-1,29,23],
  NO_S:[134,1,-1,15,23],NO_SW:[135,1,-1,0,23],NO_W:[136,1,-1,0,13],NO_NW:[137,1,-1,0,0],
  NO_MOVE:[11,1,27,15,12],CAN_MOVE:[10,1,26,15,12],ENTER:[119,3,148,15,12],DEPLOY:[53,9,-1,15,12],
  CAN_SELECT:[12,6,-1,15,12],CAN_ATTACK:[18,8,140,15,12],SELL_BACK:[62,24,-1,15,12],
  SELL_UNIT:[154,24,-1,15,12],REPAIR:[29,24,-1,15,12],NO_REPAIR:[126,1,-1,15,12],
  NO_SELL_BACK:[125,1,-1,15,12],RADAR_CURSOR:[87,1,151,0,0],ION_CANNON:[103,16,-1,15,12],
  NUCLEAR_BOMB:[96,7,-1,15,12],AIR_STRIKE:[88,8,-1,15,12],DEMOLITIONS:[122,3,127,15,12],
  AREA_GUARD:[153,1,152,15,12],
};
const COUNT=178;

function canvas(){return new Array(W*H).fill(0);}
function set(p,x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H)p[y*W+x]=c;}
function line(p,x0,y0,x1,y1,c){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)set(p,x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,c);}
// Add a one-pixel dark outline around every lit pixel.
function outline(p){
  const out=p.slice();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(p[y*W+x])continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;
      if(X>=0&&Y>=0&&X<W&&Y<H&&p[Y*W+X]&&p[Y*W+X]!==BLACK){out[y*W+x]=BLACK;break;}}
  }
  return out;
}
function circle(p,cx,cy,r,c){for(let a=0;a<64;a++){const t=a/64*Math.PI*2;set(p,cx+Math.cos(t)*r,cy+Math.sin(t)*r*0.85,c);}}

// ---- designs (hotspot hx,hy is the point that counts) ----
function arrow(small){
  const p=canvas(),s=small?0.6:1;
  for(let y=0;y<Math.round(14*s);y++)for(let x=0;x<=Math.round(y*0.6);x++)set(p,1+x,1+y,x===0||x===Math.round(y*0.6)||y===Math.round(14*s)-1?WHITE:STEEL);
  line(p,1+5*s,1+12*s,1+9*s,1+19*s,WHITE);
  return outline(p);
}
function chevron(dir,blocked){
  const p=canvas();const [hx,hy]=TABLE[dir.replace("NO_","")].slice(3);
  const v={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]}[dir.replace("NO_","")];
  const c=blocked?RED:WHITE;
  // Two nested chevrons pointing toward the screen edge, tip at the hotspot.
  for(const back of [0,4]){
    const tx=hx-v[0]*(1+back),ty=hy-v[1]*(1+back);
    const px=-v[1],py=v[0],l=Math.hypot(...v);
    const ax=(-v[0]/l+px*0.9)*6,ay=(-v[1]/l+py*0.9)*6,bx=(-v[0]/l-px*0.9)*6,by=(-v[1]/l-py*0.9)*6;
    line(p,tx,ty,tx+ax,ty+ay,c);line(p,tx,ty,tx+bx,ty+by,c);
  }
  if(blocked){line(p,hx-v[0]*12-3,hy-v[1]*9-3,hx-v[0]*12+3,hy-v[1]*9+3,RED);}
  return outline(p);
}
function reticle(c,stage=0,small=false){
  const p=canvas(),cx=15,cy=12,r=(small?4:7)+((stage%2)?1:0);
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
    line(p,cx+sx*r,cy+sy*r,cx+sx*(r-3),cy+sy*r,c);line(p,cx+sx*r,cy+sy*r,cx+sx*r,cy+sy*(r-3),c);
  }
  set(p,cx,cy,c);
  return outline(p);
}
function noMove(small){const p=canvas(),r=small?4:7;circle(p,15,12,r,RED);line(p,15-r*0.7,12+r*0.6,15+r*0.7,12-r*0.6,RED);return outline(p);}
function crosshair(stage,small){
  const p=canvas(),r=(small?4:7)-(stage%4)*0.6;
  circle(p,15,12,r,RED);
  line(p,15,12-r-3,15,12-r+2,RED);line(p,15,12+r-2,15,12+r+3,RED);
  line(p,15-r-3,12,15-r+2,12,RED);line(p,15+r-2,12,15+r+3,12,RED);
  set(p,15,12,WHITE);
  return outline(p);
}
function enter(stage,small){
  const p=canvas();const s=small?0.6:1;
  for(let i=0;i<8*s;i++){line(p,15-7*s+i,12-6*s,15-7*s+i,12+6*s,0);}
  line(p,15-6*s,12+5*s,15+6*s,12+5*s,GREEN);line(p,15-6*s,12-5*s,15-6*s,12+5*s,GREEN);line(p,15+6*s,12-5*s,15+6*s,12+5*s,GREEN);
  const y=12-5*s+stage*2*s;line(p,15,y-5*s,15,y+1,WHITE);line(p,15-2,y-1,15,y+1,WHITE);line(p,15+2,y-1,15,y+1,WHITE);
  return outline(p);
}
function deploy(stage){
  const p=canvas(),r=2+stage*0.7;
  line(p,15-r,12-r,15+r,12-r,AMBER);line(p,15-r,12+r,15+r,12+r,AMBER);line(p,15-r,12-r,15-r,12+r,AMBER);line(p,15+r,12-r,15+r,12+r,AMBER);
  line(p,15,12-r-2,15,12+r+2,WHITE);line(p,15-r-2,12,15+r+2,12,WHITE);
  return outline(p);
}
function coin(stage,blocked){
  const p=canvas(),w=Math.max(1,Math.abs(Math.cos(stage/24*Math.PI*2))*6);
  for(let a=0;a<48;a++){const t=a/48*Math.PI*2;set(p,15+Math.cos(t)*w,12+Math.sin(t)*6,AMBER);}
  line(p,15,8,15,16,blocked?RED:WHITE);
  if(blocked){line(p,9,6,21,18,RED);}
  return outline(p);
}
function wrench(stage,blocked){
  const p=canvas(),a=-Math.PI/4+Math.sin(stage/24*Math.PI*2)*0.5;
  const dx=Math.cos(a),dy=Math.sin(a);
  line(p,15-dx*7,12-dy*7,15+dx*5,12+dy*5,blocked?RED:WHITE);
  line(p,15+dx*5-dy*3,12+dy*5+dx*3,15+dx*8-dy*3,12+dy*8+dx*3,blocked?RED:WHITE);
  line(p,15+dx*5+dy*3,12+dy*5-dx*3,15+dx*8+dy*3,12+dy*8-dx*3,blocked?RED:WHITE);
  if(blocked){line(p,9,6,21,18,RED);}
  return outline(p);
}
function radarBox(small){const p=canvas(),w=small?6:10,h=small?5:8;line(p,0,0,w,0,WHITE);line(p,0,h,w,h,WHITE);line(p,0,0,0,h,WHITE);line(p,w,0,w,h,WHITE);return outline(p);}
function target(stage,c){const p=canvas();circle(p,15,12,3+stage%4,c);line(p,15,4,15,20,c);line(p,6,12,24,12,c);return outline(p);}
function guard(small){const p=canvas(),r=small?4:7;circle(p,15,12,r,GREEN);circle(p,15,12,r-2,GREEN);return outline(p);}

// Every frame the cursor table can reach (0..177); unused slots are arrows.
function frames(){
  const out=new Array(COUNT).fill(null);
  const put=(i,p)=>{if(i>=0&&i<COUNT)out[i]=p;};
  put(0,arrow(false));put(86,arrow(true));
  for(const d of ["N","NE","E","SE","S","SW","W","NW"]){put(TABLE[d][0],chevron(d,false));put(TABLE["NO_"+d][0],chevron("NO_"+d,true));}
  put(10,reticle(GREEN));put(26,reticle(GREEN,0,true));put(11,noMove(false));put(27,noMove(true));
  for(let s=0;s<3;s++){put(119+s,enter(s,false));put(148+s,enter(s,true));}
  for(let s=0;s<9;s++)put(53+s,deploy(s));
  for(let s=0;s<6;s++)put(12+s,reticle(WHITE,s));
  for(let s=0;s<8;s++){put(18+s,crosshair(s,false));put(140+s,crosshair(s,true));}
  for(let s=0;s<24;s++){put(62+s,coin(s,false));put(154+s,coin(s,false));put(29+s,wrench(s,false));}
  put(126,wrench(0,true));put(125,coin(0,true));
  put(87,radarBox(false));put(151,radarBox(true));
  for(let s=0;s<16;s++)put(103+s,target(s,rampIndex("crystal",0)));
  for(let s=0;s<7;s++)put(96+s,target(s,AMBER));
  for(let s=0;s<8;s++)put(88+s,target(s,RED));
  for(let s=0;s<3;s++){put(122+s,target(s,RED));put(127+s,target(s,RED));}
  put(153,guard(false));put(152,guard(true));
  const fallback=arrow(false);
  return out.map(p=>({width:W,height:H,pixels:p||fallback}));
}
function encode(){return encodeShape({frames:frames()});}
module.exports={frames,encode,TABLE,COUNT};
