"use strict";
// UI-E: title, menus and dialogs. HTITLE.PCX (640x400 title / menu
// background, goptions.cpp:63), BTEXTURE.SHP (dialog texture fill,
// dialog.cpp:148 -> conquer.cpp:2514 CC_Texture_Fill), OPTIONS.SHP (dialog
// corner filigree and option glyphs, goptions.cpp:570-571, defines.h:2897-2919)
// and the drop-list arrow buttons (H)BTN-UP/DN(2).SHP (nulldlg.cpp:236-240).
const {Raster,drawText,textWidth}=require("./raster.js");
const UI=require("./ui-colors.js");
const {encodeTacticalShape}=require("../encode-shape.js");
const {rgbPalette}=require("../boot-colors.js");

// ----------------------------------------------------------------- title
// The main menu dialog is drawn over the centre (x ~171-474, y 0-272 at
// 640x400), so the wordmark sits below it and the side panels frame it.
function title(){
  const W=640,H=400,r=new Raster(W,H,UI.shadow);
  // Blue-smoke field with a sparse ordered dither toward the top.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const v=((x*7+y*13)%17);
    if(y<200&&v===0)r.set(x,y,UI.coal);
    if(y>=200&&v<2)r.set(x,y,UI.coal);
  }
  // Technical grid, very faint, outside the menu area.
  for(let x=8;x<W;x+=32)for(let y=8;y<H;y+=2)if(x<160||x>480||y>280)r.set(x,y,UI.coal);
  for(let y=8;y<H;y+=32)for(let x=8;x<W;x+=2)if(x<160||x>480||y>280)r.set(x,y,UI.coal);
  // Side consoles: clipped plates with inset segments and crimson ticks.
  for(const [x,mirror] of [[16,false],[496,true]]){
    r.plate(x,24,128,252,{fill:UI.coal,edge:UI.subtle,cut:8,corners:mirror?["tr","bl"]:["tl","br"]});
    for(let k=0;k<7;k++){
      const y=44+k*32;
      r.rect(x+14,y,100,18,UI.shadow).frame(x+13,y-1,102,20,UI.subtle);
      r.hline(x+18,x+18+((k*37)%70)+14,y+9,k%3===0?UI.teal:UI.bevel);
      if(k===2)r.hline(mirror?x+96:x+18,mirror?x+110:x+32,y+14,UI.primary);
    }
    r.vline(mirror?x+124:x+3,40,260,UI.primary);
  }
  // Wordmark: original 5x7 capitals at 5x, with a cold drop shadow.
  const word="WORLD-CONQUER",scale=5,tw=textWidth(word,scale);
  const wx=Math.floor((W-tw)/2),wy=300;
  drawText(r,word,wx+2,wy+2,UI.shadow,{scale});
  drawText(r,word,wx,wy,UI.white,{scale});
  // Cut lines through the wordmark: precise, angular, not decorative noise.
  for(const y of [wy+11,wy+23])for(let x=wx;x<wx+tw;x++)if(r.get(x,y)===UI.white)r.set(x,y,UI.highlight);
  r.hline(wx,wx+tw-1,wy+44,UI.teal);
  r.hline(wx,wx+40,wy+46,UI.primary);
  const tag="TACTICAL COMMAND";
  drawText(r,tag,Math.floor((W-textWidth(tag))/2),wy+54,UI.grey);
  // Outer frame with clipped corners.
  r.outline([[6,0],[W-7,0],[W-1,6],[W-1,H-7],[W-7,H-1],[6,H-1],[0,H-7],[0,6]],UI.bevel);
  return r;
}
// PCX with real pixel data (RLE per common/filepcx.cpp) and the shipped
// palette (Load_Title_Screen sets the palette from the file).
function encodePCXPixels(r,colors=rgbPalette()){
  const {width,height,pixels}=r;
  const head=Buffer.alloc(128);
  head[0]=10;head[1]=5;head[2]=1;head[3]=8;
  head.writeUInt16LE(width-1,8);head.writeUInt16LE(height-1,10);
  head.writeUInt16LE(width,12);head.writeUInt16LE(height,14);
  head[65]=1;head.writeUInt16LE(width+(width&1),66);head.writeUInt16LE(1,68);
  const bytes=[],padded=width+(width&1);
  for(let y=0;y<height;y++){
    const row=Array.from({length:padded},(_,x)=>x<width?pixels[y*width+x]:0);
    for(let x=0;x<padded;){
      let n=1;while(x+n<padded&&row[x+n]===row[x]&&n<63)n++;
      if(n>1||row[x]>=192)bytes.push(0xC0|n,row[x]);else bytes.push(row[x]);
      x+=n;
    }
  }
  const pal=Buffer.alloc(769);pal[0]=12;
  colors.forEach((c,i)=>c.forEach((v,k)=>{pal[1+i*3+k]=v;}));
  return Buffer.concat([head,Buffer.from(bytes),pal]);
}

// ------------------------------------------------------------- dialogs
// BTEXTURE: Texture_Fill_Rect tiles the frame by screen coordinates
// (graphicsviewport.cpp:982-999) with no transparency, so a seamless matte
// plate with sparse grain. Frame 0 menus, frame 1 in game (InMainLoop).
function texture(frame){
  const r=new Raster(64,64,UI.plate);
  r.grain(0,0,64,64,UI.plate,frame?UI.steel:UI.coal,29,frame+5);
  return r;
}
// OPTIONS.SHP: frames come in left/right pairs per dialog kind
// (OPTION_DIALOG 0 ... OPTION_BUTTON_NOD 30), drawn SHAPE_CENTER at the
// caption corners; 18/19 slider thumbs, 20-27 play/stop/up/down pairs.
function optionsFrame(i){
  const r=new Raster(24,24,0),right=i%2===1;
  const corner=(accent)=>{
    const x=right?23:0,s=right?-1:1;
    r.line(x,2,x+s*12,2,UI.edge).line(x,2,x,14,UI.edge);
    r.line(x+s*2,4,x+s*8,4,accent).line(x+s*2,4,x+s*2,9,accent);
    r.line(x+s*12,2,x+s*16,6,UI.subtle);
  };
  if(i<18)corner(i===0||i===2?UI.primary:UI.teal);
  else if(i===18||i===19){const w=i===18?6:10;r.plate(12-w/2,4,w,16,{fill:UI.steel,edge:UI.highlight,cut:2});r.hline(12-w/2+2,12+w/2-3,12,UI.primary);}
  else if(i===20||i===21){r.poly([[8,5],[18,12],[8,19]],i===20?UI.normal:UI.edge);}
  else if(i===22||i===23){r.rect(7,7,10,10,i===22?UI.red:UI.edge);}
  else if(i===24||i===25){r.poly([[5,15],[12,7],[19,15]],i===24?UI.white:UI.edge);}
  else if(i===26||i===27){r.poly([[5,9],[12,17],[19,9]],i===26?UI.white:UI.edge);}
  else{
    // Side choice emblems: Aster (cyan chevron) and Forge (crimson anvil).
    const aster=i<30,c=i%2?UI.edge:aster?UI.teal:UI.red;
    r.plate(2,2,20,20,{fill:UI.coal,edge:c,cut:4});
    if(aster)r.poly([[6,15],[12,6],[18,15],[12,12]],c);else r.poly([[6,8],[18,8],[16,12],[13,12],[14,17],[10,17],[11,12],[8,12]],c);
  }
  return r;
}
// Drop-list arrow button: 0 up, 1 down, 2 disabled, 3 spare (= up).
function dropButton(up,state){
  const r=new Raster(32,18,0);
  const s=[{fill:UI.steel,edge:UI.edge,ink:UI.white},{fill:UI.deep,edge:UI.red,ink:UI.button},
           {fill:UI.coal,edge:UI.subtle,ink:UI.bevel},{fill:UI.steel,edge:UI.edge,ink:UI.white}][state];
  r.plate(0,0,32,18,{fill:s.fill,edge:s.edge,cut:3});
  const d=state===1?1:0,cx=16+d,cy=9+d;
  const pts=up?[[cx-5,cy+2],[cx,cy-3],[cx+5,cy+2]]:[[cx-5,cy-2],[cx,cy+3],[cx+5,cy-2]];
  for(const dy of [0,1])r.line(pts[0][0],pts[0][1]+dy,pts[1][0],pts[1][1]+dy,s.ink).line(pts[1][0],pts[1][1]+dy,pts[2][0],pts[2][1]+dy,s.ink);
  return r;
}
// drop.cpp:51-52, list.cpp:80-81: the "up" shape is the list's scroll-up
// arrow; the "down" shape is both the drop-open button and scroll-down.
// ShapeButtonClass frames: 0 up, 1 pressed, 2 disabled (frame 3 spare).
function generate(){
  const out={"OPTIONS.SHP":Array.from({length:32},(_,i)=>optionsFrame(i))};
  for(const n of ["HBTN-UP.SHP","HBTN-UP2.SHP"])out[n]=[0,1,2,3].map(s=>dropButton(true,s));
  for(const n of ["HBTN-DN.SHP","HBTN-DN2.SHP"])out[n]=[0,1,2,3].map(s=>dropButton(false,s));
  return out;
}
// Boot-archive members (GENERAL.MIX), written by boot-pack.js.
function bootAssets(){
  return {
    "BTEXTURE.SHP":encodeTacticalShape({frames:[texture(0),texture(1)].map(f=>f.toFrame())}),
    "HTITLE.PCX":encodePCXPixels(title())
  };
}
module.exports={generate,bootAssets,title,texture,optionsFrame,dropButton,encodePCXPixels};
