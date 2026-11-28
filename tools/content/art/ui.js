"use strict";
// M5 command interface art (original, CC0): the hi-res sidebar, its
// buttons, power gauge, build clock, status tags, top tabs, radar housing and
// the placement grid. Design brief: docs/milestones/UI-command-interface.md
// (riveted gunmetal plates, bevels lit from the top left, recessed slots).
// The engine draws the text on top of these (tab captions, credits).
//
// Slot contracts, from the engine's draw code (hi-res, 640x400):
//   HSIDE1/HSIDE2  160x120, frame 0, drawn at (480,158) and (480,276)
//                  (sidebar.cpp:805-806); cameo columns at x 496 and 566,
//                  rows from y 180, 64x48 each; power gauge at x 480-495.
//   HREPAIR/HSELL/HMAP  50x18 at (484|537|590,160) (sidebar.cpp:347-363);
//                  frame 0 off, 1 on, 2 disabled (shapebtn.cpp:130-142).
//   HSTRIPUP/HSTRIPDN  32x24, frames 0 up, 1 pressed, 2 disabled.
//   HSTRIP         64x48 filler behind an empty column, frame = column
//                  (sidebar.cpp:1815).
//   HCLOCK         64x48; frame stage+1, stage up to STEP_COUNT 108
//                  (sidebar.cpp:2019, factory.h:117). Index 3 (GREEN) is
//                  drawn translucent (ClockCols, sidebar.cpp:1322).
//   HPIPS          pips 0 empty, 1 full, 2 primary tag, 3 READY, 4 HOLD,
//                  5-7 coloured pips (defines.h PipEnum).
//   HPWRBAR        16x100: 0/1 empty top/bottom, then green, yellow, red
//                  top/bottom pairs (power.cpp:208-262).
//   HPOWER         drain marker, drawn at the drain level (power.cpp:277).
//   HTABS          160x16 at (0,0) and the right edge; 0 up, 1 pressed
//                  (tab.cpp:111-162).
//   HRADAR.GDI/.NOD 160x136, 42 frames: 0 closed, opening to 22 (open),
//                  closing to 41 (radar.h:135-136).
//   TRANS.ICN      placement grid icons 0 (allowed) and 2 (blocked)
//                  (cell.cpp:1120-1122).
const {rampIndex}=require("./palette.js");
const {encodeIconset}=require("../encode-iconset.js");

const S=i=>rampIndex("steel",i);
const frame=(w,h,fill=0)=>({width:w,height:h,pixels:new Array(w*h).fill(fill)});
function rect(f,x0,y0,w,h,c){for(let y=Math.max(0,y0);y<Math.min(f.height,y0+h);y++)for(let x=Math.max(0,x0);x<Math.min(f.width,x0+w);x++)f.pixels[y*f.width+x]=typeof c==="function"?c(x,y):c;}
// Raised (or sunken) bevelled plate.
function plate(f,x,y,w,h,{face=9,sunk=false,edge=2}={}){
  rect(f,x,y,w,h,S(face));
  const hi=S(Math.max(2,face-5)),lo=S(Math.min(15,face+5));
  for(let i=0;i<edge;i++){
    rect(f,x+i,y+i,w-2*i,1,sunk?lo:hi);rect(f,x+i,y+i,1,h-2*i,sunk?lo:hi);
    rect(f,x+i,y+h-1-i,w-2*i,1,sunk?hi:lo);rect(f,x+w-1-i,y+i,1,h-2*i,sunk?hi:lo);
  }
}
function rivet(f,x,y){rect(f,x,y,2,2,S(4));rect(f,x+1,y+1,1,1,S(14));}
// Faint brushed texture on a plate face.
function brush(f,x0,y0,w,h,face){
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(((x*7+y*13)%23)===0)f.pixels[y*f.width+x]=S(face+1);
}
// 3x5 pixel font for the few status words.
const GLYPHS={A:"010101111101101",D:"110101101101110",E:"111100110100111",H:"101101111101101",
  I:"111010010010111",L:"100100100100111",O:"111101101101111",P:"110101110100100",R:"110101110101101",
  Y:"101101010010010",N:"10011101101110011001",M:"1000111011101011000110001",S:"111100111001111",C:"111100100100111",G:"111100101101111",
  B:"110101110101110",F:"111100110100100",K:"101101110101101",T:"111010010010010",U:"101101101101111",V:"101101101101010",
  W:"1000110001101011101110001",Q:"010101101110011"};
// Width in pixels of a word set in the 3x5 font (4 px advance).
const textWidth=str=>[...str].reduce((w,ch)=>w+(GLYPHS[ch]?glyphWidth(GLYPHS[ch]):3)+1,0)-1;
// Glyphs are 3 wide except where the string says otherwise (N, M, W are
// 4-5 wide: a 3-wide N or M reads as a block).
const glyphWidth=g=>g.length/5;
function text(f,str,x,y,c,shadow){
  for(const ch of str){const g=GLYPHS[ch];const w=g?glyphWidth(g):3;if(g){for(let i=0;i<g.length;i++)if(g[i]==="1"){
    const px=x+i%w,py=y+Math.floor(i/w);
    if(shadow!==undefined)rect(f,px+1,py+1,1,1,shadow);
    rect(f,px,py,1,1,c);}}x+=w+1;}
}
const accent=i=>rampIndex("crystal",i);   // teal trim (the brief's glow accent)

// Hi-res power gauge: PowY = RadY + RadHeight + 26 - 4 = 176, to the bottom
// of the screen (power.cpp:132-140, radar.cpp:128-131).
const GAUGE_TOP=176,GAUGE_HEIGHT=224;
function sidebarPanel(top){
  const f=frame(160,120);
  plate(f,0,0,160,120,{face:10,edge:1});
  brush(f,1,1,158,118,10);
  // Power gauge channel on the left (x 0-15).
  plate(f,0,0,16,120,{face:13,sunk:true,edge:1});
  // Recessed cameo columns.
  const y0=top?22:0,y1=top?120:96;
  for(const x of [16,86])plate(f,x-1,y0-1,66,y1-y0+(top?1:2),{face:14,sunk:true,edge:1});
  if(top)rect(f,16,20,144,1,accent(2));
  if(!top){plate(f,16,98,144,22,{face:11,edge:1});rect(f,16,97,144,1,accent(2));}
  for(const [x,y] of [[2,2],[156,2],[2,116],[156,116],[81,top?24:2],[81,top?116:94]])rivet(f,x,y);
  // Leave the power gauge (x 480-495, y 176-399; power.cpp:132-140) see-
  // through: the sidebar redraws these panels without redrawing the gauge
  // (sidebar.cpp:767-806), so opaque pixels here erased it.
  rect(f,0,top?GAUGE_TOP-158:0,16,top?120-(GAUGE_TOP-158):120,0);
  return [f];
}
function button(icon,{w=50,h=18}={}){
  const frames=[];
  for(const state of ["up","down","off"]){
    const f=frame(w,h);
    plate(f,0,0,w,h,{face:state==="down"?11:8,sunk:state==="down"});
    const c=state==="off"?S(12):state==="down"?accent(1):S(1);
    icon(f,state==="down"?1:0,c);
    frames.push(f);
  }
  return frames;
}
const wrench=(f,o,c)=>{for(let i=0;i<9;i++)rect(f,18+i+o,13-i+o,2,2,c);rect(f,27+o,2+o,5,2,c);rect(f,27+o,6+o,5,2,c);rect(f,30+o,2+o,2,6,c);};
const coin=(f,o,c)=>{for(let y=0;y<12;y++)for(let x=0;x<12;x++){const d=Math.hypot(x-5.5,y-5.5);if(d<6&&d>4.2)rect(f,19+x+o,3+y+o,1,1,c);}rect(f,24+o,5+o,2,8,c);};
const grid=(f,o,c)=>{for(let i=0;i<4;i++){rect(f,17+o,3+i*4+o,16,1,c);rect(f,17+i*5+o,3+o,1,13,c);}};
function arrow(up,W=32,H=24){
  const frames=[];
  for(const state of ["up","down","off"]){
    const f=frame(W,H);
    plate(f,0,0,W,H,{face:state==="down"?11:8,sunk:state==="down"});
    const c=state==="off"?S(12):state==="down"?accent(1):S(1),o=state==="down"?1:0;
    const n=Math.min(6,Math.floor(H/3)),top=Math.floor((H-n)/2);
    for(let i=0;i<n;i++){const y=up?top+i:top+n-1-i;rect(f,W/2-i-1+o,y+o,2*i+2,1,c);}
    frames.push(f);
  }
  return frames;
}
function stripFiller(){
  return [0,1].map(()=>{const f=frame(64,48);plate(f,0,0,64,48,{face:12,sunk:true,edge:1});
    for(let y=4;y<44;y+=6)rect(f,4,y,56,1,S(13));rivet(f,3,3);rivet(f,59,3);rivet(f,3,43);rivet(f,59,43);return f;});
}
// Build clock: the unbuilt part is a translucent wedge (index 3) that sweeps
// clockwise from twelve o'clock as the build completes.
function clock(){
  const frames=[];
  const steps=108;
  for(let i=0;i<=steps+1;i++){
    const f=frame(64,48);
    const done=Math.max(0,Math.min(1,(i-1)/steps));
    for(let y=0;y<48;y++)for(let x=0;x<64;x++){
      let a=Math.atan2(x+0.5-32,-(y+0.5-24))/(2*Math.PI);if(a<0)a+=1;
      if(i===0||a>=done)f.pixels[y*64+x]=3;
    }
    frames.push(f);
  }
  return frames;
}
function pips(){
  const W=28,H=8,out=[];
  const pip=(fill)=>{const f=frame(W,H);rect(f,0,0,4,4,S(14));if(fill)rect(f,1,1,2,2,fill);return f;};
  out.push(pip(0),pip(accent(1)));
  const tag=(word,c)=>{const f=frame(W,H);const w=textWidth(word)+4;const x=Math.floor((W-w)/2);
    plate(f,x,0,w,7,{face:13,edge:1});text(f,word,x+2,1,c);return f;};
  out.push(tag("PRI",S(1)),tag("READY",accent(0)),tag("HOLD",rampIndex("fire",2)));
  out.push(pip(rampIndex("fire",2)),pip(rampIndex("sand",0)),pip(rampIndex("fire",8)));
  return out;
}
// The engine draws each pair at PowY and PowY+100 (power.cpp:208-262), so a
// frame must be GAUGE_HEIGHT-100 tall for the pair to reach the bottom.
function powerBar(){
  const out=[];
  const H=GAUGE_HEIGHT-100;
  const half=(fill,bottom)=>{const f=frame(16,H);plate(f,0,0,16,H,{face:13,sunk:true,edge:1});
    for(let y=bottom?2:4;y<H;y+=5)rect(f,2,y,3,1,S(11));
    if(fill!==null)for(let y=0;y<H;y++){const t=(y%5)===4;rect(f,5,y,8,1,t?fill+2:fill);}
    return f;};
  out.push(half(null,false),half(null,true));
  for(const [ramp,shade] of [["grass",2],["sand",0],["fire",8]]){
    const c=rampIndex(ramp,shade);out.push(half(c,false),half(c,true));
  }
  return out;
}
function drainMarker(){
  const f=frame(16,8);
  for(let i=0;i<4;i++)rect(f,0,3-i,4+i*3,1+i*2>8?8:1,0);
  for(let y=0;y<8;y++){const w=Math.max(0,8-Math.abs(y-3.5)*2);rect(f,0,y,Math.round(w),1,rampIndex("fire",1));}
  rect(f,8,3,8,2,S(1));
  return [f];
}
function tabs(){
  return ["up","down"].map(state=>{const f=frame(160,16);
    plate(f,0,0,160,16,{face:state==="down"?11:9,sunk:state==="down"});
    rect(f,3,13,154,1,accent(2));rivet(f,3,3);rivet(f,155,3);return f;});
}
// Radar housing: an armoured frame with shutters that open (0-22) and close
// (22-41). With no radar building in the M5 roster it normally stays shut.
function radar(){
  const frames=[];
  for(let i=0;i<=41;i++){
    const open=i<=22?i/22:(41-i)/19;
    // 143 rows: from RadY+1 (15) down to the sidebar panel at 158.
    const f=frame(160,143);
    plate(f,0,0,160,143,{face:9,edge:2});
    brush(f,2,2,156,139,9);
    plate(f,6,6,148,124,{face:14,sunk:true,edge:2});
    const gap=Math.round(open*60);
    // Two shutters slide apart from the middle.
    for(const side of [0,1]){
      const w=Math.max(0,74-gap);
      if(!w)continue;
      const x=side?154-w:6;
      plate(f,x,8,w,120,{face:10,edge:1});
      for(let y=14;y<124;y+=8)rect(f,x+3,y,w-6,1,S(12));
    }
    if(open>=1)rect(f,8,8,144,120,0);   // fully open: the engine draws the map here
    for(const [x,y] of [[3,3],[155,3],[3,139],[155,139]])rivet(f,x,y);
    frames.push(f);
  }
  return frames;
}
// Placement grid: hatched cells, light for allowed and red for blocked.
function placementGrid(){
  const icon=(c)=>Array.from({length:576},(_,k)=>{const x=k%24,y=Math.floor(k/24);
    return (x===0||y===0||x===23||y===23||((x+y)%6===0))?c:0;});
  return encodeIconset({icons:[icon(rampIndex("crystal",1)),icon(S(8)),icon(rampIndex("fire",8))]});
}

// Dialog decorations (OPTIONS.SHP, goptions.cpp:570, defines.h
// OptionControlType): pairs of left/right corner emblems, slider thumbs and
// arrows, 32 frames.
function options(){
  const out=[];
  for(let i=0;i<32;i++){
    const f=frame(24,24);
    if(i===18||i===19){plate(f,6,4,12,16,{face:7});rect(f,11,6,2,12,accent(1));}
    else if(i>=24&&i<28){const up=i<26;plate(f,2,2,20,20,{face:(i%2)?11:8,sunk:(i%2)===1});
      for(let k=0;k<5;k++)rect(f,12-k-1,up?8+k:15-k,2*k+2,1,S(1));}
    else{
      const right=i%2===1;
      // An L-shaped steel bracket with a teal inlay, mirrored for the right.
      for(let y=0;y<24;y++)for(let x=0;x<24;x++){
        const X=right?23-x:x;
        if((X<5&&y<20)||(y<5&&X<20))f.pixels[y*24+x]=(X===0||y===0)?S(3):(X===4||y===4)?S(14):S(9);
        if((X===2&&y>2&&y<17)||(y===2&&X>2&&X<17))f.pixels[y*24+x]=accent(1);
      }
      rivet(f,right?19:3,19);rivet(f,right?3:19,3);
    }
    out.push(f);
  }
  return out;
}
// Dialog fill texture (BTEXTURE.SHP, tiled by CC_Texture_Fill, dialog.cpp:
// 148): frame 0 menus, 1 in game. Dark brushed steel.
function texture(){
  return [0,1].map(k=>{const f=frame(32,32);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++)f.pixels[y*32+x]=S(((x*3+y*7+k)%17===0)?12:13+((y>>3)&1&k));
    return f;});
}
// Title screen (HTITLE.PCX, 640x400, behind the main menu): rendered units
// either side of the menu and the wordmark along the bottom.
function title(){
  const W=640,H=400,px=new Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const v=11+Math.round(y/H*4)+(((x*7+y*13)%29===0)?1:0);
    px[y*W+x]=S(Math.min(15,v));
  }
  const {render,frameHeading}=require("./render.js");const m=require("./models.js");
  const stamp=(parts,cx,cy,scale,k,w,h)=>{const r=render(parts,{width:w,height:h,origin:[w/2,h/2+10],heading:frameHeading(k),scale,groundShadow:false});
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=r[y*w+x];if(v&&v!==4){const X=cx-w/2+x,Y=cy-h/2+y;if(X>=0&&Y>=0&&X<W&&Y<H)px[Y*W+X]=v;}}};
  stamp(m.tankBody().concat(m.tankTurret()),85,150,4.2,28,160,160);
  stamp(m.harvester(0),85,265,3.0,30,140,110);
  stamp(m.constructionYard(),555,150,1.5,2,150,120);
  stamp(m.jeepBody().concat(m.jeepTurret()),555,262,4.0,4,140,110);
  // Wordmark: 5x7 block letters, scaled 5x, with a drop shadow.
  const F={W:"10001100011000110101101011101110001",O:"01110100011000110001100011000101110",
    R:"11110100011000111110101001001010001",L:"10000100001000010000100001000011111",
    D:"11110100011000110001100011000111110","-":"00000000000000111110000000000000000",
    C:"01111100001000010000100001000001111",N:"10001110011010110101100111000110001",
    Q:"01110100011000110001101011001001101",U:"10001100011000110001100011000101110",
    E:"11111100001000011110100001000011111"};
  const word="WORLD-CONQUER",sc=5,adv=6*sc,x0=Math.round((W-word.length*adv+sc)/2),y0=330;
  [...word].forEach((ch,i)=>{const g=F[ch];for(let k=0;k<35;k++)if(g[k]==="1"){
    const gx=x0+i*adv+(k%5)*sc,gy=y0+Math.floor(k/5)*sc;
    for(let y=0;y<sc;y++)for(let x=0;x<sc;x++)px[(gy+y+3)*W+gx+x+3]=S(15);
    for(let y=0;y<sc;y++)for(let x=0;x<sc;x++)px[(gy+y)*W+gx+x]=(y===0||x===0)?accent(0):accent(1+(y===sc-1?1:0));}});
  return {width:W,height:H,pixels:px};
}
function encodePCXImage({width,height,pixels},colors){
  const head=Buffer.alloc(128);
  head[0]=10;head[1]=5;head[2]=1;head[3]=8;
  head.writeUInt16LE(width-1,8);head.writeUInt16LE(height-1,10);
  head.writeUInt16LE(width,12);head.writeUInt16LE(height,14);
  head[65]=1;head.writeUInt16LE(width+(width&1),66);head.writeUInt16LE(1,68);
  const bytes=[];
  for(let y=0;y<height;y++){
    const row=pixels.slice(y*width,(y+1)*width);if(width&1)row.push(0);
    for(let i=0;i<row.length;){
      let n=1;while(i+n<row.length&&row[i+n]===row[i]&&n<63)n++;
      if(n>1||row[i]>=192)bytes.push(0xC0|n,row[i]);else bytes.push(row[i]);
      i+=n;
    }
  }
  const pal=Buffer.alloc(769);pal[0]=12;
  for(let i=0;i<256;i++)for(let c=0;c<3;c++)pal[1+i*3+c]=colors[i][c];
  return Buffer.concat([head,Buffer.from(bytes),pal]);
}

function files(){
  return {
    "HSIDE1.SHP":sidebarPanel(true),"HSIDE2.SHP":sidebarPanel(false),
    "HREPAIR.SHP":button(wrench),"HSELL.SHP":button(coin),"HMAP.SHP":button(grid),
    "HSTRIPUP.SHP":arrow(true),"HSTRIPDN.SHP":arrow(false),"HSTRIP.SHP":stripFiller(),
    "HCLOCK.SHP":clock(),"HPIPS.SHP":pips(),"HPWRBAR.SHP":powerBar(),"HPOWER.SHP":drainMarker(),
    "HTABS.SHP":tabs(),"HRADAR.GDI":radar(),"HRADAR.NOD":radar(),
    "OPTIONS.SHP":options(),
    // List and slider scroll buttons (expand.cpp:95-99, ShapeButtonClass
    // frames up / pressed / disabled).
    "HBTN-UP.SHP":arrow(true,32,18),"HBTN-DN.SHP":arrow(false,32,18),
    "HBTN-UP2.SHP":arrow(true,32,18),"HBTN-DN2.SHP":arrow(false,32,18),
  };
}
module.exports={files,placementGrid,texture,title,encodePCXImage,text,textWidth,GLYPHS};
