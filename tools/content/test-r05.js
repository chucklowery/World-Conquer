#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const zlib=require("node:zlib");
const {decodeTacticalShape}=require("./encode-shape");
const {readSources,sourcePixels,frameContract,compile,build,SIZE_BUDGET}=require("./r05");

function pngPixels(bytes){
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  let offset=8,width,height,idat=[];
  while(offset<bytes.length){
    const n=bytes.readUInt32BE(offset),type=bytes.toString("ascii",offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+n);
    if(type==="IHDR"){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[9],6);}
    if(type==="IDAT")idat.push(data);
    offset+=12+n;
  }
  const inflated=zlib.inflateSync(Buffer.concat(idat));
  assert.equal(inflated.length,height*(width*4+1));
  const rgba=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++){
    assert.equal(inflated[y*(width*4+1)],0);
    inflated.copy(rgba,y*width*4,y*(width*4+1)+1,(y+1)*(width*4+1));
  }
  return {width,height,rgba};
}

function main(){
  const src=readSources();
  assert.equal(src.assets.length,24);
  assert.equal(src.roster.factions.length,2);
  assert.equal(src.roster.gameplayCellPixels,24);
  assert(src.assets.every(a=>a.sourceSha256.length===64 && a.svg.includes("<svg")));
  for(const a of src.assets){
    const p=sourcePixels(a.svg,a.size,src.palette.colors);
    assert(p.some(Boolean),`${a.id}: blank source`);
    assert(frameContract(a.kind).every(s=>s.facings===8||s.facings===1));
  }
  const first=compile(src),second=compile(src);
  assert.deepEqual(first.manifest,second.manifest,"R05 manifest is not deterministic");
  for(const [name,data] of first.files)assert(first.files.get(name).equals(second.files.get(name)),`${name} changed across builds`);
  const {manifest}=first;
  assert.equal(manifest.budgets.frames,552);
  assert(manifest.budgets.pages>=1 && manifest.budgets.pages<=4);
  assert(manifest.budgets.actualBytes<=SIZE_BUDGET);
  assert.equal(manifest.files.length,manifest.assets.length+manifest.budgets.pages+3);
  const atlases=Array.from({length:manifest.budgets.pages},(_,i)=>pngPixels(first.files.get(`atlases/atlas-${i}.png`)));
  for(const a of manifest.assets){
    const shape=decodeTacticalShape(first.files.get(a.shape));
    assert.equal(shape.frames.length,a.frames,`${a.id}: frame count`);
    assert.equal(a.atlas.length,a.frames);
    assert.equal(a.states.reduce((n,s)=>n+s.count,0),a.frames);
    assert.deepEqual(a.states.map(s=>s.start),a.states.map((_,i)=>a.states.slice(0,i).reduce((n,s)=>n+s.count,0)));
    const distinct=new Set(shape.frames.map(f=>Buffer.from(f.pixels).toString("base64")));
    assert(distinct.size>=a.states.length,`${a.id}: insufficient state changes`);
    for(let frame=0;frame<a.frames;frame++){
      const raster=shape.frames[frame],rect=a.atlas[frame],atlas=atlases[rect.page];
      assert.equal(raster.width,a.size);assert.equal(raster.height,a.size);
      assert(rect.x>=0&&rect.y>=0&&rect.x+rect.w<=atlas.width&&rect.y+rect.h<=atlas.height);
      assert(raster.pixels.some(Boolean),`${a.id}/${frame}: blank tactical frame`);
      for(let y=0;y<a.size;y++)for(let x=0;x<a.size;x++){
        const p=raster.pixels[y*a.size+x],off=((rect.y+y)*atlas.width+rect.x+x)*4;
        assert(p<src.palette.colors.length);
        assert.equal(atlas.rgba[off+3],p?255:0,`${a.id}/${frame}: atlas alpha mismatch`);
        if(p){
          const color=src.palette.colors[p];
          for(let c=0;c<3;c++)assert.equal(atlas.rgba[off+c],parseInt(color.slice(1+c*2,3+c*2),16));
        }
      }
    }
    if(a.faction){
      const own=src.teams.get(a.faction).teamPalette;
      const rival=[...src.teams.values()].filter(f=>f.id!==a.faction).flatMap(f=>f.teamPalette);
      assert(shape.frames[0].pixels.some(p=>own.includes(p)),`${a.id}: lacks team color`);
      assert(!shape.frames[0].pixels.some(p=>rival.includes(p)),`${a.id}: rival team color`);
    }
  }
  // Facing index 0 is north, then clockwise. Weapon sparks make the
  // 8-way ordering directly testable, independent of body silhouette.
  const ranger=manifest.assets.find(a=>a.id==="r05.aster.ranger");
  const attack=ranger.states.find(s=>s.state==="attack");
  const points=[];
  for(let facing=0;facing<8;facing++){
    const p=decodeTacticalShape(first.files.get(ranger.shape)).frames[attack.start+facing*attack.phases].pixels;
    const sparks=[];for(let i=0;i<p.length;i++)if(p[i]===20||p[i]===21)sparks.push([i%ranger.size,Math.floor(i/ranger.size)]);
    assert(sparks.length>=2);
    points.push([sparks.reduce((n,v)=>n+v[0],0)/sparks.length,sparks.reduce((n,v)=>n+v[1],0)/sparks.length]);
  }
  const center=(ranger.size-1)/2;
  assert(points[0][1]<center-4 && points[2][0]>center+4 && points[4][1]>center+4 && points[6][0]<center-4,
    `Incorrect clockwise cardinal facings: ${JSON.stringify(points)}`);
  assert(points[1][0]>center&&points[1][1]<center&&points[3][0]>center&&points[3][1]>center&&
    points[5][0]<center&&points[5][1]>center&&points[7][0]<center&&points[7][1]<center,
    `Incorrect diagonal facings: ${JSON.stringify(points)}`);
  const corrupted=readSources();corrupted.assets[0].svg+="<image href='evil'/>";
  assert.throws(()=>compile(corrupted),/Unsafe or unsupported SVG/);
  const wrongTeam=readSources();wrongTeam.assets[0].svg=wrongTeam.assets[0].svg.replace(/#2F9990/g,"#BF6654");
  assert.throws(()=>compile(wrongTeam),/Incorrect team colors/);
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),"world-conquer-r05-"));
  try{
    const output=path.join(sandbox,"package"),saved=build(output);
    assert.equal(saved.contentSha256,manifest.contentSha256);
    for(const file of manifest.files)assert(fs.readFileSync(path.join(output,file.target)).equals(first.files.get(file.target)));
    assert.throws(()=>build(output),/already exists/);
    assert.throws(()=>build(path.join(__dirname,"../../game/content/r05/source/new")),/overlaps source/);
  }finally{fs.rmSync(sandbox,{recursive:true,force:true});}
  console.log(`PASS: R05 24 owned SVGs, 2 team colors, ${manifest.budgets.frames} indexed frames, SHP roundtrips, atlas pixel parity, SHA determinism, provenance, size budget and unsafe-input guards`);
}
main();
