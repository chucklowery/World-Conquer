"use strict";
// Minimal RGBA PNG writer for art previews and contact sheets (not shipped).
const zlib=require("node:zlib");
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(buf){let c=0xffffffff;for(const b of buf)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);}
// pixels: palette indices; palette: [[r,g,b]]; index 0 is transparent
// unless background is given ([r,g,b]).
function encodeIndexedPNG(width,height,pixels,palette,{scale=1,background=null}={}){
  const W=width*scale,H=height*scale;
  const raw=Buffer.alloc((W*4+1)*H);
  for(let y=0;y<H;y++){
    raw[y*(W*4+1)]=0;
    for(let x=0;x<W;x++){
      const p=pixels[Math.floor(y/scale)*width+Math.floor(x/scale)];
      const o=y*(W*4+1)+1+x*4;
      let rgb=p===0?background:palette[p],a=255;
      if(p===4&&background)rgb=background.map(v=>Math.round(v*0.45));
      if(!rgb){rgb=[0,0,0];a=0;}
      raw[o]=rgb[0];raw[o+1]=rgb[1];raw[o+2]=rgb[2];raw[o+3]=a;
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
// Lay frames out on a grid: frames [{width,height,pixels}].
function contactSheet(frames,palette,{columns=8,scale=3,background=[78,120,50],gap=2}={}){
  const cw=Math.max(...frames.map(f=>f.width)),ch=Math.max(...frames.map(f=>f.height));
  const rows=Math.ceil(frames.length/columns);
  const W=columns*(cw+gap)+gap,H=rows*(ch+gap)+gap;
  const px=new Array(W*H).fill(-1);
  frames.forEach((f,i)=>{const x0=gap+(i%columns)*(cw+gap),y0=gap+Math.floor(i/columns)*(ch+gap);
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)px[(y0+y)*W+x0+x]=f.pixels[y*f.width+x];});
  const pal=palette.slice();pal[255+1]=[20,20,20];
  const mapped=px.map(v=>v===-1?256:v);
  const bgPal=pal;
  // index 256 = gap colour
  return encodeIndexedPNG(W,H,mapped,bgPal,{scale,background});
}
module.exports={encodeIndexedPNG,contactSheet};
