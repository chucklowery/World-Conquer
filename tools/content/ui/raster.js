"use strict";
// Indexed-colour raster primitives for the command-interface generators.
// Every pixel is computed from geometry in this repository; index 0 is the
// shape-transparent colour. Coordinates are engine pixels.
const UI=require("./ui-colors.js");

class Raster{
  constructor(width,height,fill=0){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error("bad raster size");
    this.width=width;this.height=height;this.pixels=new Array(width*height).fill(fill);
  }
  inside(x,y){return x>=0&&y>=0&&x<this.width&&y<this.height;}
  set(x,y,c){x=Math.round(x);y=Math.round(y);if(c!=null&&this.inside(x,y))this.pixels[y*this.width+x]=c;return this;}
  get(x,y){return this.inside(x,y)?this.pixels[y*this.width+x]:0;}
  rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)this.set(i,j,c);return this;}
  hline(x0,x1,y,c){for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)this.set(x,y,c);return this;}
  vline(x,y0,y1,c){for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)this.set(x,y,c);return this;}
  frame(x,y,w,h,c){this.hline(x,x+w-1,y,c).hline(x,x+w-1,y+h-1,c).vline(x,y,y+h-1,c).vline(x+w-1,y,y+h-1,c);return this;}
  line(x0,y0,x1,y1,c){
    const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
    for(let i=0;i<=n;i++)this.set(x0+(x1-x0)*i/(n||1),y0+(y1-y0)*i/(n||1),c);
    return this;
  }
  // Even-odd polygon fill sampled at pixel centres.
  poly(points,c){
    const ys=points.map(p=>p[1]);
    for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++){
      const cy=y+0.5,xs=[];
      for(let i=0;i<points.length;i++){
        const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
        if((ay<=cy&&by>cy)||(by<=cy&&ay>cy))xs.push(ax+(cy-ay)*(bx-ax)/(by-ay));
      }
      xs.sort((a,b)=>a-b);
      for(let k=0;k+1<xs.length;k+=2)
        for(let x=Math.ceil(xs[k]-0.5);x<=Math.floor(xs[k+1]-0.5);x++)this.set(x,y,c);
    }
    return this;
  }
  // Outline of a polygon (closed).
  outline(points,c){
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];this.line(a[0],a[1],b[0],b[1],c);}
    return this;
  }
  // Clipped-corner plate: matte fill, 1 px outline, chamfer of `cut` pixels
  // on the corners listed in `corners` ("tl","tr","br","bl").
  plate(x,y,w,h,{fill=UI.plate,edge=UI.bevel,cut=3,corners=["tl","tr","br","bl"],light=null}={}){
    const k=c=>corners.includes(c)?cut:0;
    const pts=[[x+k("tl"),y],[x+w-k("tr"),y],[x+w,y+k("tr")],[x+w,y+h-k("br")],[x+w-k("br"),y+h],[x+k("bl"),y+h],[x,y+h-k("bl")],[x,y+k("tl")]];
    this.poly(pts,fill);
    const o=[[x+k("tl"),y],[x+w-1-k("tr"),y],[x+w-1,y+k("tr")],[x+w-1,y+h-1-k("br")],[x+w-1-k("br"),y+h-1],[x+k("bl"),y+h-1],[x,y+h-1-k("bl")],[x,y+k("tl")]];
    this.outline(o,edge);
    // Restrained top-left light: a short segment, not a full bevel.
    if(light!=null){this.hline(x+k("tl")+1,x+Math.min(w-2-k("tr"),k("tl")+Math.floor(w/3)),y+1,light);}
    return this;
  }
  // Deterministic grain: swaps `fill` pixels for `alt` on a sparse hash grid
  // (about 1 in `every`), which stays under 4% contrast modulation.
  grain(x,y,w,h,fill,alt,every=23,seed=1){
    for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){
      if(this.get(i,j)!==fill)continue;
      const v=((i*73856093)^(j*19349663)^(seed*83492791))>>>0;
      if(v%every===0)this.set(i,j,alt);
    }
    return this;
  }
  blit(src,x,y,{transparent=true}={}){
    for(let j=0;j<src.height;j++)for(let i=0;i<src.width;i++){
      const p=src.pixels[j*src.width+i];
      if(transparent&&p===0)continue;
      this.set(x+i,y+j,p);
    }
    return this;
  }
  crop(x,y,w,h){
    const out=new Raster(w,h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++)out.pixels[j*w+i]=this.get(x+i,y+j);
    return out;
  }
  clone(){const r=new Raster(this.width,this.height);r.pixels=this.pixels.slice();return r;}
  map(fn){this.pixels=this.pixels.map(fn);return this;}
  toFrame(){return {width:this.width,height:this.height,pixels:this.pixels.slice()};}
}

// Compact original 5x7 capital glyphs for wordmarks and labels on art.
// Each glyph is 7 rows of 5 bits, most significant bit at the left.
const GLYPHS={
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[15,16,16,16,16,16,15],D:[30,17,17,17,17,17,30],
  E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[15,16,16,19,17,17,15],H:[17,17,17,31,17,17,17],
  I:[14,4,4,4,4,4,14],J:[1,1,1,1,17,17,14],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
  M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],
  Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
  U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],
  Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],"0":[14,17,19,21,25,17,14],"1":[4,12,4,4,4,4,14],
  "2":[14,17,1,2,4,8,31],"3":[30,1,1,14,1,1,30],"4":[2,6,10,18,31,2,2],"5":[31,16,30,1,1,17,14],
  "6":[6,8,16,30,17,17,14],"7":[31,1,2,4,8,8,8],"8":[14,17,17,14,17,17,14],"9":[14,17,17,15,1,2,12],
  "-":[0,0,0,31,0,0,0]," ":[0,0,0,0,0,0,0],".":[0,0,0,0,0,12,12],":":[0,12,12,0,12,12,0],
  "/":[1,1,2,4,8,16,16],"!":[4,4,4,4,4,0,4],"'":[4,4,8,0,0,0,0],",":[0,0,0,0,12,4,8],"?":[14,17,1,2,4,0,4]
};
function textWidth(s,scale=1,gap=1){return s.length?s.length*(5+gap)*scale-gap*scale:0;}
function drawText(r,s,x,y,c,{scale=1,gap=1,shadow=null}={}){
  for(const [n,ch] of [...s.toUpperCase()].entries()){
    const g=GLYPHS[ch];if(!g)throw Error("no glyph for "+JSON.stringify(ch));
    const ox=x+n*(5+gap)*scale;
    for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(g[row]&(16>>col)){
      if(shadow!=null)r.rect(ox+col*scale+1,y+row*scale+1,scale,scale,shadow);
    }
    for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(g[row]&(16>>col))r.rect(ox+col*scale,y+row*scale,scale,scale,c);
  }
  return r;
}
module.exports={Raster,GLYPHS,drawText,textWidth};
