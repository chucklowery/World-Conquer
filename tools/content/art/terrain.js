"use strict";
// M5 temperate theater art (original, CC0): terrain templates, the crystal
// resource overlay and trees.
//
// Passability is the engine's: each template's land type, and the icons that
// use its alternate land type, come from the compiled template table
// (tiberiandawn/cdata.cpp, extracted to templates.json by
// tools/content/art/extract-templates.js). The art is painted from exactly
// that land mask, so what a player sees is what units can cross:
//   clear  grass            water  animated water (colour-cycling range)
//   beach  sand              rock   shaded cliffs and boulders
// Transitions are smoothed inside a template. At a template's outer edge the
// land of the edge icon is assumed to continue, so templates whose edges
// carry the same land join without a seam; maps are built that way
// (tools/content/scenario.js terrain features).
const fs=require("node:fs");
const path=require("node:path");
const {rampIndex}=require("./palette.js");
const {render}=require("./render.js");
const m=require("./models.js");

const TEMPLATES=JSON.parse(fs.readFileSync(path.join(__dirname,"templates.json"),"utf8"));
const CELL=24;
const LAND={LAND_CLEAR:"clear",LAND_WATER:"water",LAND_BEACH:"beach",LAND_ROCK:"rock",LAND_ROAD:"clear",LAND_ROUGH:"clear"};

// Smooth deterministic value noise in [0,1).
function hash2(x,y,s){let h=(x*374761393+y*668265263+s*982451653)>>>0;h=Math.imul(h^(h>>>13),1274126177)>>>0;return ((h^(h>>>16))>>>0)/4294967296;}
// period (pixels, a multiple of scale) makes the noise tile.
function noise(x,y,scale,s,period=0){
  const fx=x/scale,fy=y/scale,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
  const sm=t=>t*t*(3-2*t);
  const n=period?period/scale:0,w=v=>n?((v%n)+n)%n:v;
  const a=hash2(w(x0),w(y0),s),b=hash2(w(x0+1),w(y0),s),c=hash2(w(x0),w(y0+1),s),d=hash2(w(x0+1),w(y0+1),s);
  return (a+(b-a)*sm(tx))+((c+(d-c)*sm(tx))-(a+(b-a)*sm(tx)))*sm(ty);
}
function fbm(x,y,s,period=0){return noise(x,y,16,s,period)*0.55+noise(x,y,8,s+1,period)*0.3+noise(x,y,4,s+2,period)*0.15;}

function landOf(t,ix,iy){
  const outside=ix<0||iy<0||ix>=t.w||iy>=t.h;
  ix=Math.max(0,Math.min(t.w-1,ix));iy=Math.max(0,Math.min(t.h-1,iy));
  const icon=iy*t.w+ix;
  const land=LAND[t.altIcons.includes(icon)?t.altLand:t.land]||"clear";
  // Rock and beach end inside their own template (rounded outcrops and sand
  // on grass); water continues past the edge so lakes tile without seams.
  return outside&&(land==="rock"||land==="beach")?"clear":land;
}
// Weight of each land type at a template pixel: bilinear over icon centres
// (edge icons extended), perturbed by noise so boundaries are irregular.
function landAt(t,x,y,seed){
  const kinds=["clear","water","beach","rock"];
  const wob=(fbm(x,y,seed)-0.5)*10;
  const fx=(x+wob)/CELL-0.5,fy=(y+(fbm(x+50,y+50,seed)-0.5)*10)/CELL-0.5;
  const x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;
  const w={clear:0,water:0,beach:0,rock:0};
  for(const [dx,dy,k] of [[0,0,(1-tx)*(1-ty)],[1,0,tx*(1-ty)],[0,1,(1-tx)*ty],[1,1,tx*ty]])w[landOf(t,x0+dx,y0+dy)]+=k;
  let best="clear",bw=-1;for(const k of kinds)if(w[k]>bw){bw=w[k];best=k;}
  return {kind:best,w};
}

// ----- pixel painters -----
function grass(x,y,seed,period=0){
  const n=fbm(x,y,seed,period);
  const speck=hash2(period?x%period:x,period?y%period:y,seed+7);
  if(speck>0.985)return rampIndex("grass",1);
  if(speck<0.012)return rampIndex("earth",6);
  return rampIndex("grass",3+Math.round(n*5));
}
function dirt(x,y,seed){const n=fbm(x,y,seed+40);return rampIndex("earth",5+Math.round(n*5));}
function sand(x,y,seed){const n=fbm(x,y,seed+20);return rampIndex("sand",1+Math.round(n*3));}
function water(x,y,seed,shoreW){
  // Colour-cycling indices 32-38 shimmer (conquer.cpp:1202); keep them to a
  // wave pattern over a still base.
  // Wave crests: thin bands that shimmer through the cycling colours.
  const crest=Math.sin((x*0.35+y*0.9)+fbm(x,y,seed+30)*9);
  if(crest>0.82)return 32+((Math.floor(x/3)+Math.floor(y/2))%7+7)%7;
  const depth=Math.max(0,Math.min(1,1-shoreW*1.6));
  return rampIndex("water",1+Math.round(depth*4+fbm(x,y,seed+33)*1.5));
}
// Rock: a height field from the rock weight, shaded by its slope.
function rockShade(t,x,y,seed){
  const h=(px,py)=>{const r=landAt(t,px,py,seed).w.rock;
    return r*16+r*(noise(px,py,9,seed+60)*14+noise(px,py,4,seed+62)*6);};
  const gx=h(x+1,y)-h(x-1,y),gy=h(x,y+1)-h(x,y-1);
  const n=[-gx,-gy,2];const l=Math.hypot(...n);
  const light=(-0.55*n[0]-0.75*n[1]+1.0*n[2])/l/1.37;
  const crack=hash2(x>>1,y>>1,seed+61)<0.05;
  const edge=landAt(t,x,y,seed).w.rock<0.62;   // outline where rock meets grass
  return rampIndex("rock",Math.max(1,Math.min(15,Math.round((1-light)*13)+(crack?3:0)+(edge?4:0))));
}

// Template art: the template's icons, in order.
function templateIcons(t,{seed=1,style=null}={}){
  const W=t.w*CELL,H=t.h*CELL;
  const px=new Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const {kind,w}=landAt(t,x,y,seed);
    let v;
    if(kind==="water")v=water(x,y,seed,w.clear+w.beach+w.rock);
    else if(kind==="beach")v=sand(x,y,seed);
    else if(kind==="rock")v=rockShade(t,x,y,seed);
    else{
      v=grass(x,y,seed);
      // Sand rim along water, shadow along the lit-away side of rock.
      if(w.water>0.22)v=sand(x,y,seed);
      else if(w.rock>0.32)v=rampIndex("grass",8+Math.round(w.rock*6));
    }
    px[y*W+x]=v;
  }
  if(style)style(px,W,H,seed);
  const icons=[];
  for(let iy=0;iy<t.h;iy++)for(let ix=0;ix<t.w;ix++){
    const icon=new Array(CELL*CELL);
    for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++)icon[y*CELL+x]=px[(iy*CELL+y)*W+ix*CELL+x];
    icons.push(icon);
  }
  return icons;
}
// Cosmetic overlays on clear ground (roads and dirt patches are clear land
// in the engine, cdata.cpp).
const roadStyle=(axis)=>(px,W,H,seed)=>{
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const d=axis==="x"?Math.abs(y-H/2+0.5):axis==="y"?Math.abs(x-W/2+0.5):Math.min(Math.abs(y-H/2+0.5),Math.abs(x-W/2+0.5));
    const edge=5+fbm(x,y,seed+70)*2;
    if(d<edge)px[y*W+x]=d>edge-1.2?rampIndex("earth",10):rampIndex("earth",4+Math.round(fbm(x,y,seed+71)*3));
  }
};
const patchStyle=(px,W,H,seed)=>{
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=(x-W/2)/(W/2),dy=(y-H/2)/(H/2);
    if(dx*dx+dy*dy+(fbm(x,y,seed+80)-0.5)*0.9<0.6)px[y*W+x]=dirt(x,y,seed);
  }
};
const STYLE={D03:roadStyle("y"),D10:roadStyle("x"),D04:roadStyle("+"),P01:patchStyle,P03:patchStyle,
  P07:patchStyle,P08:patchStyle,P13:patchStyle,P14:patchStyle,P15:patchStyle};

// ----- objects -----
// Crystal resource overlay (TI1-TI12): frame = growth stage 0..11
// (odata.cpp:828-839). Each type is a different cluster layout.
// scale > 1 renders the frames of the HD sheet (hd.js); the same for the
// generators below.
function crystalFrames(type,scale=1){
  const frames=[];
  for(let f=0;f<16;f++){
    const stage=Math.min(11,f);
    const parts=[];
    const count=2+Math.floor(stage/2);
    for(let i=0;i<count;i++){
      const a=hash2(type,i,3)*Math.PI*2,r=hash2(type,i,4)*7;
      const cx=Math.cos(a)*r,cy=Math.sin(a)*r*0.8;
      const h=2.5+stage*0.45+hash2(type,i,5)*3,s=0.9+hash2(type,i,6)*0.9;
      // A shard: square pyramid.
      parts.push({shape:"poly",mat:m.M.crystal,planes:[
        {n:norm3([0,0,-1]),d:0},
        {n:norm3([h,0,s]),d:dot3(norm3([h,0,s]),[cx+s,cy,0])},
        {n:norm3([-h,0,s]),d:dot3(norm3([-h,0,s]),[cx-s,cy,0])},
        {n:norm3([0,h,s]),d:dot3(norm3([0,h,s]),[cx,cy+s,0])},
        {n:norm3([0,-h,s]),d:dot3(norm3([0,-h,s]),[cx,cy-s,0])}]});
    }
    const S=24*scale;
    frames.push({width:S,height:S,pixels:render(parts,{width:S,height:S,origin:[12*scale,14*scale],scale})});
  }
  return frames;
}
function norm3(v){const l=Math.hypot(...v);return v.map(c=>c/l);}
function dot3(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
// Tree (T01): trunk and a layered crown; later frames are the burnt tree.
function treeFrames(scale=1){
  const leaf={ramp:"grass",lo:2,hi:14},trunk={ramp:"earth",lo:6,hi:14};
  const tree=[m.cyl([0,2,0],1.6,0,8,trunk),m.sphere([0,2,10],6,leaf),m.sphere([-3,0,8],4,leaf),m.sphere([3,4,8],4.5,leaf),m.sphere([1,-1,14],3.8,leaf)];
  const burnt=[m.cyl([0,2,0],1.6,0,8,m.M.burnt),m.sphere([0,2,10],3.5,m.M.burnt)];
  const frames=[];
  const S=32*scale;
  for(let f=0;f<16;f++)frames.push({width:S,height:S,pixels:render(f<8?tree:burnt,{width:S,height:S,origin:[16*scale,22*scale],scale})});
  return frames;
}

// Building aprons (BIB1-3, w x h cells, sdata.cpp:148-175): one 24x24 frame
// per cell, drawn at the cell's corner (sdata.cpp:449). Concrete slabs with
// seams, a bevelled outer edge and a little grime.
function bibFrames(w,h,seed,scale=1){
  const C=CELL*scale,W=w*C,H=h*C,px=new Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const bx=x/scale,by=y/scale;
    let v=4+Math.round(fbm(bx,by,seed+90)*3);
    if(x%C<scale||y%C<scale)v+=3;                     // slab seams
    if(hash2(x,y,seed+91)<0.03)v+=2;                  // grime
    if(bx<2||by<2)v=2;else if(bx>=W/scale-2||by>=H/scale-2)v=11; // bevel
    px[y*W+x]=rampIndex("rock",v);
  }
  const frames=[];
  for(let cy=0;cy<h;cy++)for(let cx=0;cx<w;cx++){
    const f=new Array(C*C);
    for(let y=0;y<C;y++)for(let x=0;x<C;x++)f[y*C+x]=px[(cy*C+y)*W+cx*C+x];
    frames.push({width:C,height:C,pixels:f});
  }
  return frames;
}
// Craters (CR1-6) and scorch marks (SC1-6): ragged dark marks, a few sizes.
function markFrames(seed,crater,scale=1){
  const frames=[],C=CELL*scale;
  for(let i=0;i<5;i++){
    const f=new Array(C*C).fill(0),r=5+i*1.4;
    for(let y=0;y<C;y++)for(let x=0;x<C;x++){
      const bx=(x+0.5)/scale-0.5,by=(y+0.5)/scale-0.5;
      const dx=bx+0.5-12,dy=by+0.5-12,d=Math.hypot(dx,dy*1.2)/(r*(0.8+0.4*noise(bx,by,4,seed+i)));
      if(d<1){
        if(crater)f[y*C+x]=d<0.55?rampIndex("dark",8+Math.round(d*6)):rampIndex("earth",8+Math.round(d*5));
        else if(hash2(x,y,seed+i)<1.1-d)f[y*C+x]=rampIndex("dark",4+Math.round(d*8));
      }
    }
    frames.push({width:C,height:C,pixels:f});
  }
  return frames;
}
function smudges(scale=1){
  const out={"BIB1.TEM":bibFrames(4,2,1,scale),"BIB2.TEM":bibFrames(3,2,2,scale),"BIB3.TEM":bibFrames(2,2,3,scale)};
  for(let n=1;n<=6;n++){out["CR"+n+".TEM"]=markFrames(10+n,true,scale);out["SC"+n+".TEM"]=markFrames(20+n,false,scale);}
  return out;
}

// Every temperate template, keyed by its .TEM file name.
function templates(){
  const out={};
  for(const t of TEMPLATES){
    if(!t.temperate)continue;
    const file=t.name+".TEM";
    if(out[file])continue;
    out[file]={t,icons:templateIcons(t,{seed:hashName(t.name),style:STYLE[t.name]})};
  }
  // CLEAR1: 16 grass variants; the engine picks one per cell.
  out["CLEAR1.TEM"]={t:{name:"CLEAR1",w:4,h:4},icons:Array.from({length:16},(_,i)=>{
    const icon=new Array(CELL*CELL);
    for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++)icon[y*CELL+x]=grass(x+(i%4)*CELL,y+Math.floor(i/4)*CELL,1,4*CELL);
    return icon;})};
  return out;
}
function hashName(s){let h=7;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%1000+1;}
module.exports={templates,templateIcons,crystalFrames,treeFrames,smudges,TEMPLATES,landOf};
