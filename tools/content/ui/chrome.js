"use strict";
// UI-B: command-bar chrome. Generates the engine's own sidebar, tab, radar
// housing, command button, power gauge and strip arrow shapes as indexed
// frames. Slot contracts: docs/browser/UI_SPEC.md "UI-A close-out".
// Original geometry only; nothing is traced or sampled from other media.
const {Raster}=require("./raster.js");
const UI=require("./ui-colors.js");

// Engine coordinates of the art origins (640x400).
const L=Object.freeze({
  sideX:480,side1Y:158,side2Y:276,side1H:118,side2H:124,
  buttons:{REPAIR:484,SELL:537,MAP:590},buttonY:160,buttonW:48,buttonH:18,
  radarY:15,radarW:160,radarH:142,insetX:16,insetY:6,insetW:128,insetH:128,
  powerY:176,powerW:16,powerH:224,upperH:100,
  columnX:[497,567],cameoX:[500,570],stripY:181,stripW:64,stripH:193,
  cameoY:182,cameoH:48,scrollY:373,scrollW:32,scrollH:24
});
const FACTION={GDI:{name:"aster",glow:UI.teal,soft:UI.ice},NOD:{name:"forge",glow:UI.red,soft:UI.primary}};

// ---------------------------------------------------------------- sidebar
// One 160x242 composite (y 158..399) split at the engine's seam (y 276).
function sidebarComposite(){
  const H=L.side1H+L.side2H,r=new Raster(L.radarW,H,UI.coal);
  r.grain(0,0,160,H,UI.coal,UI.shadow,23,7);
  // Command-button bay (y 158..180): raised steel deck with a crimson tick.
  r.plate(0,0,160,23,{fill:UI.plate,edge:UI.bevel,cut:3,corners:["bl","br"],light:UI.edge});
  r.hline(150,156,21,UI.primary);
  // Recessed build channels behind both cameo columns (x 497.., y 181..372).
  for(const cx of L.columnX){
    const x=cx-L.sideX,y=L.stripY-L.side1Y,w=70,h=L.scrollY-L.stripY;
    r.rect(x,y,w,h,UI.shadow).frame(x-1,y-1,w+2,h+2,UI.subtle);
    // Inset technical segments between slots.
    for(let k=1;k<4;k++){const yy=y+1+k*L.cameoH-1;r.hline(x,x+2,yy,UI.bevel).hline(x+w-3,x+w-1,yy,UI.bevel);}
  }
  // Divider spine between the columns.
  r.vline(87,24,214,UI.bevel);
  // Scroll-button deck (y 373..399) with clipped lower corner.
  r.plate(16,214,144,28,{fill:UI.plate,edge:UI.bevel,cut:4,corners:["br"]});
  for(let x=24;x<150;x+=8)r.set(x,239,UI.subtle);
  // Right-edge rail and power-slot rail.
  r.vline(159,0,H-5,UI.subtle);
  r.vline(16,23,H-1,UI.subtle);
  return r;
}
function sidebar(){
  const c=sidebarComposite();
  return {
    "HSIDE1.SHP":[c.crop(0,0,160,L.side1H)],
    "HSIDE2.SHP":[c.crop(0,L.side1H,160,L.side2H)]
  };
}

// ------------------------------------------------------------------- tabs
// 160x16: OPTIONS / credits / SIDEBAR. The engine prints centred text over
// row 0..14 and draws BLACK on row 15. Frame 1 is the highlighted tab.
function tab(highlight){
  const r=new Raster(160,16,0);
  r.plate(0,0,160,15,{fill:highlight?UI.deep:UI.plate,edge:highlight?UI.red:UI.bevel,cut:4,corners:["bl","br"],light:highlight?UI.primary:UI.edge});
  // Inset readout well under the centred label.
  r.rect(36,3,88,10,highlight?UI.deep:UI.shadow).frame(35,2,90,12,highlight?UI.primary:UI.subtle);
  // Chamfer ticks.
  r.hline(6,14,13,highlight?UI.button:UI.primary).hline(145,153,13,highlight?UI.button:UI.subtle);
  return r;
}
function tabs(){return {"HTABS.SHP":[tab(false),tab(true)]};}

// -------------------------------------------------------- command buttons
// Pictograms, 14x12, drawn into a 48x18 button. Wrench, currency mark, map grid.
function pictogram(r,kind,x,y,c){
  if(kind==="REPAIR"){
    // Open-end wrench, 2 px handle on the diagonal.
    for(const d of [0,1])r.line(x+1+d,y+11,x+8+d,y+4,c).line(x+1,y+10-d,x+8,y+3-d,c);
    r.poly([[x+7,y+2],[x+10,y-0.5],[x+14,y+1],[x+14,y+5],[x+11,y+7],[x+8,y+6]],c);
    r.rect(x+10,y+2,3,3,0);                                          // jaw opening
  }else if(kind==="SELL"){
    // Currency mark: an S stroke crossed by a vertical bar.
    r.rect(x+4,y+1,7,2,c).rect(x+3,y+2,2,3,c).rect(x+4,y+5,6,2,c);
    r.rect(x+9,y+6,2,4,c).rect(x+3,y+9,7,2,c);
    r.vline(x+7,y-1,y+12,c);
  }else{
    r.frame(x,y+1,14,10,c);
    r.vline(x+4,y+1,y+10,c).vline(x+9,y+1,y+10,c).hline(x,x+13,y+5,c);
    r.rect(x+10,y+2,3,3,c);                                          // marker
  }
  return r;
}
function button(kind,state){
  // state: 0 up/off, 1 down/on (sunk, lit), 2 disabled.
  const W=L.buttonW,H=L.buttonH,r=new Raster(W,H,0);
  const s=[
    {fill:UI.steel,edge:UI.edge,light:UI.highlight,ink:UI.white,d:0},
    {fill:UI.deep,edge:UI.red,light:null,ink:UI.button,d:1},
    {fill:UI.coal,edge:UI.subtle,light:null,ink:UI.edge,d:0}
  ][state];
  r.plate(0,0,W,H,{fill:s.fill,edge:s.edge,cut:3,light:s.light});
  if(state===1){r.hline(3,W-4,1,UI.shadow).vline(1,3,H-4,UI.shadow);} // inner shadow: sunk
  if(state===2){for(let x=4;x<W-4;x+=4)r.set(x,H-3,UI.subtle);}        // dotted rail: inert
  pictogram(r,kind,17+s.d,3+s.d,s.ink);
  if(state===0)r.hline(4,9,H-3,UI.primary);                              // red action mark
  return r;
}
function buttons(){
  const out={};
  for(const kind of Object.keys(L.buttons))out["H"+kind+".SHP"]=[0,1,2].map(s=>button(kind,s));
  return out;
}

// ------------------------------------------------------------------ radar
// 42 frames, 160x140, drawn at (480,15). See UI_SPEC.md for frame meaning.
function radarFrame(house,frame){
  const f=FACTION[house],r=new Raster(L.radarW,L.radarH,0);
  const {insetX:ix,insetY:iy,insetW:iw,insetH:ih}=L;
  const offline=frame===0||frame===41;
  // Open fraction: 1..21 opening, 22 open, 23..40 closing, 0/41 closed.
  const open=frame===0||frame===41?0:frame<=21?frame/21:frame===22?1:(40-frame+1)/19;
  // Opaque through row 156 so nothing shows between housing and sidebar.
  r.rect(0,0,160,L.radarH,UI.coal);
  r.plate(0,0,160,L.radarH,{fill:UI.plate,edge:UI.bevel,cut:6,light:UI.edge});
  r.grain(1,1,158,L.radarH-2,UI.plate,UI.steel,29,3);
  // Inset glass well and housing outline.
  r.rect(ix,iy,iw,ih,UI.shadow).frame(ix-2,iy-2,iw+4,ih+4,UI.subtle);
  // Technical tick segments along the housing.
  for(let k=0;k<=8;k++){
    const t=iy+k*16;r.hline(ix-6,ix-4,t,UI.edge).hline(ix+iw+3,ix+iw+5,t,UI.edge);
    const u=ix+k*16;r.vline(u,iy-5,iy-4,UI.edge).vline(u,iy+ih+3,iy+ih+4,UI.edge);
  }
  // Faction corner brackets: lit while the radar is online or animating,
  // dim when offline, absent when there is no radar facility (frame 0).
  const glow=frame===0?null:offline?UI.bevel:open>=1?f.glow:f.soft;
  if(glow!=null)for(const [x,y,dx,dy] of [[ix-3,iy-3,1,1],[ix+iw+2,iy-3,-1,1],[ix-3,iy+ih+2,1,-1],[ix+iw+2,iy+ih+2,-1,-1]]){
    r.hline(x,x+dx*9,y,glow).vline(x,y,y+dy*9,glow);
  }
  // Glass: faint static when closed; radar-only scanlines when revealed.
  if(frame===0){
    for(let j=0;j<ih;j++)for(let i=0;i<iw;i++){
      const v=((i*2654435761)^(j*40503))>>>0;
      if(v%61===0)r.set(ix+i,iy+j,UI.subtle);
    }
  }else{
    for(let j=1;j<ih;j+=4)r.hline(ix,ix+iw-1,iy+j,UI.coal);
  }
  // Shutters: two halves that part horizontally from the centre line.
  if(frame!==0&&frame!==22){
    const half=iw/2,gap=Math.round(half*open);
    const left=ix,right=ix+iw-1,lw=Math.round(half-gap);
    if(lw>0){
      r.rect(left,iy,lw,ih,UI.steel).rect(right-lw+1,iy,lw,ih,UI.steel);
      for(let j=iy+6;j<iy+ih;j+=12){r.hline(left+2,left+lw-3,j,UI.subtle);r.hline(right-lw+3,right-2,j,UI.subtle);}
      // Leading edges.
      r.vline(left+lw-1,iy,iy+ih-1,offline?UI.edge:f.glow);
      r.vline(right-lw+1,iy,iy+ih-1,offline?UI.edge:f.glow);
    }
    // Offline cue: centred link-lost bar.
    if(frame===41){r.rect(ix+iw/2-14,iy+ih/2-2,28,4,UI.shadow).hline(ix+iw/2-12,ix+iw/2+11,iy+ih/2,UI.amber);}
  }
  return r;
}
function radar(){
  const out={};
  for(const house of Object.keys(FACTION))out["HRADAR."+house]=Array.from({length:42},(_,f)=>radarFrame(house,f));
  return out;
}

// ------------------------------------------------------------- power gauge
// Frames 0/1 empty, 2/3 normal, 4/5 low, 6/7 critical. Even frames are the
// upper 100 px (y 176..275), odd frames the lower 124 px (y 276..399).
// Each state differs in value *and* pattern: solid, diagonal, cross-hatch.
function gaugePixel(state,x,y){
  // Track: x 3..12, with a 1px dark gap every 6 rows (segments).
  if(x<3||x>12)return null;
  if(state==="empty")return (y%6===5)?UI.subtle:UI.shadow;
  if(y%6===5)return UI.shadow;
  if(state==="normal")return x===3?UI.white:UI.normal;
  if(state==="low")return ((x+y)%4===0)?UI.shadow:UI.amber;
  return ((x+y)%3===0||(x-y+300)%3===0)?UI.red:UI.critical;
}
// The keyframe SHP format has one size per file (encode-shape.js), so the
// 100 px upper piece is padded to 124 rows; rows 100..123 are transparent and
// the lower piece, drawn 100 px further down, covers them.
function gaugePiece(state,upper){
  const lowerH=L.powerH-L.upperH,h=upper?L.upperH:lowerH,y0=upper?0:L.upperH,r=new Raster(16,lowerH,0);
  r.rect(0,0,16,h,UI.coal);
  for(let y=0;y<h;y++){
    r.set(0,y,UI.bevel).set(15,y,UI.subtle).set(1,y,UI.plate).set(14,y,UI.plate);
    // Scale notches on the left rail every 12 px.
    if((y+y0)%12===0)r.set(1,y,UI.edge).set(2,y,UI.edge);
    for(let x=3;x<=12;x++){const c=gaugePixel(state,x,y+y0);if(c!=null)r.set(x,y,c);}
  }
  if(upper)r.hline(0,15,0,UI.bevel);
  else r.hline(0,15,h-1,UI.bevel);
  return r;
}
function power(){
  const frames=[];
  for(const state of ["empty","normal","low","critical"])frames.push(gaugePiece(state,true),gaugePiece(state,false));
  // Drain marker: notched white bar with dark outline; tip row 4.
  const m=new Raster(16,9,0);
  m.poly([[0,0],[4,4.5],[0,9]],UI.shadow).poly([[0,1],[3,4.5],[0,8]],UI.button);
  m.poly([[16,0],[12,4.5],[16,9]],UI.shadow).poly([[16,1],[13,4.5],[16,8]],UI.button);
  m.hline(2,13,3,UI.shadow).hline(2,13,5,UI.shadow).hline(2,13,4,UI.button);
  return {"HPWRBAR.SHP":frames,"HPOWER.SHP":[m]};
}

// ------------------------------------------------- strip filler and arrows
function stripLogo(id){
  const r=new Raster(L.stripW,L.stripH,UI.shadow);
  r.grain(0,0,L.stripW,L.stripH,UI.shadow,UI.coal,19,id+11);
  for(let k=0;k<4;k++){
    const y=1+k*L.cameoH;
    r.plate(2,y+2,60,L.cameoH-5,{fill:UI.coal,edge:UI.subtle,cut:4});
  }
  // Neutral crest: an angular chevron mark, mirrored per column.
  const cx=32,cy=97,s=id?-1:1;
  r.poly([[cx-14,cy-10],[cx,cy-18],[cx+14,cy-10],[cx+14,cy+6],[cx,cy+16],[cx-14,cy+6]],UI.plate);
  r.outline([[cx-14,cy-10],[cx,cy-18],[cx+14,cy-10],[cx+14,cy+6],[cx,cy+16],[cx-14,cy+6]],UI.bevel);
  r.poly([[cx-8*s,cy-6],[cx+6*s,cy+1],[cx-8*s,cy+8],[cx-4*s,cy+1]],UI.edge);
  r.hline(cx-4,cx+4,cy+11,UI.primary);
  return r;
}
function arrowButton(up,state){
  const r=new Raster(L.scrollW,L.scrollH,0);
  const s=[{fill:UI.steel,edge:UI.edge,ink:UI.white,d:0,light:UI.highlight},
           {fill:UI.deep,edge:UI.red,ink:UI.button,d:1,light:null},
           {fill:UI.coal,edge:UI.subtle,ink:UI.bevel,d:0,light:null}][state];
  r.plate(1,1,30,22,{fill:s.fill,edge:s.edge,cut:4,light:s.light});
  const cx=16+s.d,cy=12+s.d;
  // Chevron: two strokes, 2 px thick.
  const pts=up?[[cx-7,cy+3],[cx,cy-4],[cx+7,cy+3]]:[[cx-7,cy-3],[cx,cy+4],[cx+7,cy-3]];
  for(const dy of [0,1]){r.line(pts[0][0],pts[0][1]+dy,pts[1][0],pts[1][1]+dy,s.ink).line(pts[1][0],pts[1][1]+dy,pts[2][0],pts[2][1]+dy,s.ink);}
  if(state===1)r.hline(5,26,2,UI.shadow);
  return r;
}
function strip(){
  return {
    "HSTRIP.SHP":[stripLogo(0),stripLogo(1)],
    "HSTRIPUP.SHP":[0,1,2].map(s=>arrowButton(true,s)),
    "HSTRIPDN.SHP":[0,1,2].map(s=>arrowButton(false,s))
  };
}

function generate(){
  return Object.assign({},sidebar(),tabs(),buttons(),radar(),power(),strip());
}
module.exports={generate,layout:L,FACTION,sidebarComposite,radarFrame,button,gaugePixel};
