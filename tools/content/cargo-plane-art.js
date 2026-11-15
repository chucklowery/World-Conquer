#!/usr/bin/env node
"use strict";

// WF-0002 — an original fictional utility transport, authored as 80 indexed
// 32x32 frames. No commercial C-17 or legacy game sprite is sampled or traced.
// 0..31 = audited facing bank; 32..35 = four-stage door-ramp bank; 36..79
// are deliberately provisional reserve views, not asserted engine lookups.
const fs=require("node:fs");
const path=require("node:path");
const zlib=require("node:zlib");
const {crc32}=require("./png-to-frames");

const root=path.resolve(__dirname,"../..");
const size=32, frameCount=80;
const colors=["#000000","#172a36","#277e68","#45cba2","#4e97c8","#a1e7d3","#d7a45b","#f4e6bd"];
const base=path.join(root,"game/content/wireframes");
const samples=[
  {key:"north",frame:0,label:"NORTH"}, {key:"east",frame:8,label:"EAST"},
  {key:"south",frame:16,label:"SOUTH"}, {key:"west",frame:24,label:"WEST"},
  {key:"ramp-closed",frame:32,label:"RAMP CLOSED"}, {key:"ramp-ajar",frame:33,label:"RAMP AJAR"},
  {key:"ramp-deploy",frame:34,label:"RAMP DEPLOY"}, {key:"ramp-open",frame:35,label:"RAMP OPEN"},
  {key:"gear-test",frame:40,label:"GEAR TEST"}, {key:"reserve",frame:64,label:"RESERVE"}
];

function paintCargo(frame) {
  if(!Number.isSafeInteger(frame)||frame<0||frame>=frameCount)throw Error(`WF-0002 invalid frame ${frame}`);
  const px=new Uint8Array(size*size);
  const plot=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<size&&y>=0&&y<size)px[y*size+x]=c;};
  const line=(x1,y1,x2,y2,c,t=1)=>{
    const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)*3));
    for(let i=0;i<=steps;i++)for(let ix=0;ix<t;ix++)for(let iy=0;iy<t;iy++)
      plot(x1+(x2-x1)*i/steps+ix,y1+(y2-y1)*i/steps+iy,c);
  };
  const polygon=(points,c)=>{
    const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let y=minY;y<=maxY;y++)for(let x=0;x<size;x++){
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[i],b=points[j];
        if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      if(inside)plot(x,y,c);
    }
  };
  const disk=(x,y,r,c)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)plot(x+dx,y+dy,c);};
  const isRamp=frame>=32&&frame<=35, reserveGear=frame>=36&&frame<=63;
  const reserveDamage=frame>=64;
  const heading=frame<32?frame:reserveGear?(frame-36)%32:reserveDamage?(frame-64)*2:0;
  const theta=-heading*Math.PI/16, co=Math.cos(theta),si=Math.sin(theta);
  const turn=([x,y])=>[15.5+x*co-y*si,15.5+x*si+y*co];
  const poly=(pts,c)=>polygon(pts.map(turn),c);
  const stroke=(a,b,c,t=1)=>line(...turn(a),...turn(b),c,t);
  const dot=(x,y,r,c)=>disk(...turn([x,y]),r,c);

  // Distinctive high wing plus two teal lift nacelles; silhouette remains
  // inside the shared 32x32 canvas at all 32 orientation indices.
  poly([[-3,-4],[-8,-2],[-12,4],[-10,7],[-2,3]],2);
  poly([[3,-4],[8,-2],[12,4],[10,7],[2,3]],2);
  poly([[-3,-4],[-10,3],[-10,4],[-2,1]],5);
  poly([[3,-4],[10,3],[10,4],[2,1]],5);
  poly([[-3,-12],[3,-12],[4,-8],[4,7],[3,12],[-3,12],[-4,7],[-4,-8]],2);
  poly([[-2,-11],[2,-11],[3,-7],[3,7],[2,10],[-2,10],[-3,7],[-3,-7]],3);
  // Cockpit, navigation pinstripes, two separate cargo thrusters.
  poly([[-2,-9],[2,-9],[2,-5],[-2,-5]],4);
  stroke([-2,-10],[2,-10],7);
  stroke([-11,3],[-6,2],4);stroke([11,3],[6,2],4);
  dot(-7,5,2,6);dot(7,5,2,6);
  dot(-7,5,1,1);dot(7,5,1,1);
  poly([[-7,9],[-3,8],[-3,10],[-7,12]],5);
  poly([[7,9],[3,8],[3,10],[7,12]],5);
  stroke([0,-4],[0,6],5);
  // Centered three-bar cargo hatch and stage-specific extending ramp.
  const progress=isRamp?frame-32:reserveGear?3:reserveDamage?(frame-64)%4:0;
  if(isRamp||reserveGear||reserveDamage){
    poly([[-3,7],[3,7],[3,11],[-3,11]],1);
    poly([[-2,8],[2,8],[2,10],[-2,10]],6);
    if(progress>=1)stroke([-3,11],[3,11],7,1);
    if(progress>=2)poly([[-3,11],[3,11],[4,13],[-4,13]],6);
    if(progress>=3)stroke([-4,13],[4,13],7,1);
  }
  if(reserveGear){dot(-5,9,1,6);dot(5,9,1,6);}
  if(reserveDamage)stroke([-3,-2],[4,5],6,1);
  return [...px];
}

function chunk(type,data) {
  const name=Buffer.from(type,"ascii"),out=Buffer.alloc(12+data.length);
  out.writeUInt32BE(data.length,0);name.copy(out,4);data.copy(out,8);
  out.writeUInt32BE(crc32(Buffer.concat([name,data])),8+data.length);
  return out;
}
function makePng(pixels) {
  if(pixels.length!==size*size||pixels.some(c=>!Number.isInteger(c)||c<0||c>=colors.length))throw Error("Invalid cargo palette indices");
  const scan=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=pixels[y*size+x],target=y*(size*4+1)+1+x*4;
    const hex=colors[index];
    scan[target]=parseInt(hex.slice(1,3),16);
    scan[target+1]=parseInt(hex.slice(3,5),16);
    scan[target+2]=parseInt(hex.slice(5,7),16);
    scan[target+3]=index?255:0;
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(scan,{level:9})),chunk("IEND",Buffer.alloc(0))]);
}
function svgPixels(frame) {
  const pixels=paintCargo(frame),parts=[];
  for(let y=0;y<size;y++)for(let x=0;x<size;){
    const c=pixels[y*size+x];if(!c){x++;continue;}
    let n=1;while(x+n<size&&pixels[y*size+x+n]===c)n++;
    parts.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${colors[c]}"/>`);x+=n;
  }
  return parts.join("");
}
function stateSvg(spec) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196 48" width="784" height="192" shape-rendering="crispEdges" role="img" aria-label="Original WF-0002 C17 cargo transport ${spec.label} frame ${spec.frame}"><rect width="196" height="48" fill="#101c25"/><g transform="translate(7 8)">${svgPixels(spec.frame)}</g><g font-family="monospace" fill="#a1e7d3"><text x="49" y="13" font-size="8">WF-0002 / C17.SHP</text><text x="49" y="25" font-size="7" fill="#f4e6bd">${spec.label}</text><text x="49" y="36" font-size="6.5">32x32 / FRAME ${String(spec.frame).padStart(2,"0")}</text></g></svg>\n`;
}
function atlasSvg() {
  const w=6*112,h=2*110,parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" role="img" aria-label="WF-0002 original cargo aircraft directional and ramp storyboard">`,
    `<rect width="${w}" height="${h}" fill="#101c25"/>`];
  for(const [i,s] of samples.entries()){
    const x=(i%6)*112,y=Math.floor(i/6)*110;
    parts.push(`<rect x="${x+3}" y="${y+3}" width="106" height="103" fill="#172a36" stroke="#277e68"/>`,
      `<g transform="translate(${x+25} ${y+8}) scale(2)">${svgPixels(s.frame)}</g>`,
      `<text x="${x+12}" y="${y+87}" font-family="monospace" font-size="8" fill="#f4e6bd">${s.label}</text>`,
      `<text x="${x+12}" y="${y+99}" font-family="monospace" font-size="7" fill="#a1e7d3">FRAME ${s.frame}</text>`);
  }
  parts.push("</svg>\n");return parts.join("");
}
function generate() {
  const final=path.join(base,"final/WF-0002"),states=path.join(base,"states");
  if(fs.existsSync(final))throw Error("WF-0002 output exists; refusing to overwrite authored artwork");
  const expected=JSON.parse(fs.readFileSync(path.join(root,"game/content/source/placeholder.palette.json"),"utf8")).colors;
  if(JSON.stringify(expected)!==JSON.stringify(colors))throw Error("WF-0002 palette drift; update artwork generation before exporting");
  fs.mkdirSync(final,{recursive:true});fs.mkdirSync(states,{recursive:true});
  const attribution={creator:"World-Conquer project",license:"CC0-1.0",
    source:"Original procedural Courier-class cargo aircraft; tools/content/cargo-plane-art.js",
    revision:"wf0002-draft-1",stage:"draft",rightsNotes:"Project-authored geometry; no existing game sprite, aircraft photo or commercial asset used"};
  fs.writeFileSync(path.join(final,"ATTRIBUTION.json"),JSON.stringify(attribution,null,2)+"\n",{flag:"wx"});
  for(let i=0;i<frameCount;i++)fs.writeFileSync(path.join(final,`${String(i).padStart(4,"0")}.png`),makePng(paintCargo(i)),{flag:"wx"});
  for(const s of samples)fs.writeFileSync(path.join(states,`WF-0002-${s.key}.svg`),stateSvg(s),{flag:"wx"});
  fs.writeFileSync(path.join(states,"WF-0002-atlas.svg"),atlasSvg(),{flag:"wx"});
  console.log("Created 80 original WF-0002 cargo PNG frames, 10 state SVGs and an atlas");
}
if(require.main===module){
  try{if(process.argv[2]!=="generate")throw Error("Usage: node tools/content/cargo-plane-art.js generate");generate();}
  catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={paintCargo,makePng,stateSvg,atlasSvg,samples,colors,frameCount};
