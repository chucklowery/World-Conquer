"use strict";
// HD sprite sheets (NAME.HD2) for the engine's HD layer (common/hdlayer.h).
// Each sheet holds every frame of NAME.SHP rendered at `scale` times the
// logical size, in the same palette, so the engine can repaint a sprite in
// HD exactly where it drew the logical frame.
//
// Format (little endian):
//   0  "WCHD"
//   4  u16 scale, u16 frame count, u16 base width, u16 base height
//   12 u32 offset of each frame from the start of the file (0 = empty)
//   frames: (width*scale) x (height*scale) palette indices, run-length coded:
//   0x00 n = n transparent pixels (1-255); any other byte stands for itself.
function encodeHD(frames,scale,baseW,baseH){
  const W=baseW*scale,H=baseH*scale;
  const head=Buffer.alloc(12+4*frames.length);
  head.write("WCHD",0,"latin1");
  head.writeUInt16LE(scale,4);head.writeUInt16LE(frames.length,6);
  head.writeUInt16LE(baseW,8);head.writeUInt16LE(baseH,10);
  const bodies=[];let at=head.length;
  frames.forEach((f,i)=>{
    if(f.width!==W||f.height!==H)throw Error("HD frame "+i+" is "+f.width+"x"+f.height+", expected "+W+"x"+H);
    if(!f.pixels.some(p=>p)){head.writeUInt32LE(0,12+4*i);return;}
    const out=[];
    for(let k=0;k<f.pixels.length;){
      if(f.pixels[k]===0){let n=0;while(k<f.pixels.length&&f.pixels[k]===0&&n<255){n++;k++;}out.push(0,n);}
      else out.push(f.pixels[k++]);
    }
    head.writeUInt32LE(at,12+4*i);
    const b=Buffer.from(out);bodies.push(b);at+=b.length;
  });
  return Buffer.concat([head,...bodies]);
}
function decodeHD(buf){
  if(buf.toString("latin1",0,4)!=="WCHD")throw Error("Not an HD sheet");
  const scale=buf.readUInt16LE(4),count=buf.readUInt16LE(6),w=buf.readUInt16LE(8),h=buf.readUInt16LE(10);
  const size=w*scale*h*scale,frames=[];
  for(let i=0;i<count;i++){
    const px=new Array(size).fill(0);let at=buf.readUInt32LE(12+4*i),o=0;
    while(at&&o<size){const b=buf[at++];if(b===0)o+=buf[at++];else px[o++]=b;}
    frames.push({width:w*scale,height:h*scale,pixels:px});
  }
  return {scale,width:w,height:h,frames};
}
module.exports={encodeHD,decodeHD};
