"use strict";
// Renders generated UI frames to PNG through the shipped palette, for review
// and CI evidence. Usage: node tools/content/ui/preview.js <outDir>
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib");
const {rgbPalette}=require("../boot-colors.js");
// The engine presents 6-bit palette values shifted left by 2 (SDL output).
const PAL=rgbPalette().map(c=>c.map(v=>(v>>2)<<2));
function crc32(buf){let c,crc=~0;for(const b of buf){c=(crc^b)&255;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}return ~crc>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);}
// pixels: indexed array; transparent (0) shows as `matte`.
function png(width,height,pixels,{scale=1,matte=[38,59,49]}={}){
  const W=width*scale,H=height*scale,raw=Buffer.alloc((W*3+1)*H);
  for(let y=0;y<H;y++){
    raw[y*(W*3+1)]=0;
    for(let x=0;x<W;x++){
      const p=pixels[Math.floor(y/scale)*width+Math.floor(x/scale)];
      const c=p===0?matte:PAL[p];
      raw.set(c,y*(W*3+1)+1+x*3);
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
// A contact sheet of frames laid out in rows.
function sheet(frames,{columns=8,pad=2}={}){
  const fw=Math.max(...frames.map(f=>f.width)),fh=Math.max(...frames.map(f=>f.height));
  const rows=Math.ceil(frames.length/columns),W=columns*(fw+pad)+pad,H=rows*(fh+pad)+pad;
  const px=new Array(W*H).fill(12);
  frames.forEach((f,i)=>{
    const ox=pad+(i%columns)*(fw+pad),oy=pad+Math.floor(i/columns)*(fh+pad);
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const p=f.pixels[y*f.width+x];px[(oy+y)*W+ox+x]=p===0?14:p;}
  });
  return {width:W,height:H,pixels:px};
}
function write(dir,{scale=2}={}){
  fs.mkdirSync(dir,{recursive:true});
  const {collect}=require("./build.js");
  const out=[];
  for(const [name,{value}] of Object.entries(collect())){
    if(Buffer.isBuffer(value))continue;
    const frames=value.map(f=>f.toFrame?f.toFrame():f);
    const s=sheet(frames,{columns:Math.min(frames.length,frames[0].width>100?6:12)});
    const file=path.join(dir,name.replace(/\./g,"_")+".png");
    fs.writeFileSync(file,png(s.width,s.height,s.pixels,{scale}));out.push(file);
  }
  for(const [name,frame] of Object.entries(require("./compose.js").screens())){
    const file=path.join(dir,"screen-"+name+".png");
    fs.writeFileSync(file,png(frame.width,frame.height,frame.pixels,{scale}));out.push(file);
  }
  return out;
}
if(require.main===module)console.log(write(process.argv[2]||"build/ui-preview").join("\n"));
module.exports={png,sheet,write};
