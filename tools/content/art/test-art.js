#!/usr/bin/env node
"use strict";
// M5 art and sound checks (no browser, no native tools):
// - palette ramps avoid fixed, cycling and house-remap indices;
// - templates.json matches the engine's template table (cdata.cpp);
// - every roster file meets the engine's frame contract
//   (requirements.json minFrames) and has the expected frame sizes;
// - the renderer is deterministic;
// - sound files have a valid AUD header.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../..");

const palette=require("./palette.js");
assert.ok(palette.check());
const pal=palette.gamePalette();
assert.equal(pal.length,256);
for(const [house,targets] of Object.entries(palette.REMAP)){
  // The first band entry is the brightest shade of each house ramp (unless a
  // fixed index forbids repainting it).
  const t=targets.find(i=>!palette.FIXED.has(i));
  assert.ok(pal[t].reduce((a,b)=>a+b)>150,house+" remap target "+t+" is bright");
}
console.log("PASS: palette ramps avoid fixed, cycling and remap indices");

const {current}=require("./extract-templates.js");
const saved=JSON.parse(fs.readFileSync(path.join(__dirname,"templates.json"),"utf8"));
assert.deepEqual(saved,JSON.parse(JSON.stringify(current())),"templates.json is stale: run node tools/content/art/extract-templates.js");
console.log("PASS: templates.json matches tiberiandawn/cdata.cpp ("+saved.length+" templates)");

const {files}=require("./build.js");
const roster=files();
const effectNames=new Set([...Object.keys(require("./effects.js").files()),...Object.keys(require("./ui.js").files())]);
// Every effect and projectile slot of the wireframe catalog is replaced.
const catalog=JSON.parse(fs.readFileSync(path.join(root,"game/content/wireframes/catalog.json"),"utf8"));
for(const a of catalog.assets.filter(a=>["effect","projectile"].includes(a.category)&&a.engineFilename)){
  if(/ROT\.SHP$|^(RAPT|STEG|TREX|TRIC|FLAGFLY|ATOMDOOR|DEVIATOR|DOLLAR|EARTH|EMPULSE|INVUN|MINE|MISSILE2|RAPID|STEALTH2)\.SHP$/.test(a.engineFilename))continue;
  assert.ok(effectNames.has(a.engineFilename.toUpperCase()),"no art for effect "+a.engineFilename);
}
const req=JSON.parse(fs.readFileSync(path.join(root,"game/content/pack/requirements.json"),"utf8"));
const min=new Map(req.files.filter(f=>f.contract&&Number.isInteger(f.contract.minFrames)).map(f=>[f.name.toUpperCase(),f.contract.minFrames]));
const sizes={"FACT.SHP":[72,48],"NUKE.SHP":[48,48],"PROC.SHP":[72,72],"PYLE.SHP":[48,48],"WEAP.SHP":[72,72],
  "WEAP2.SHP":[72,48],"GTWR.SHP":[24,24],"MTNK.SHP":[32,32],"JEEP.SHP":[32,32],"HARV.SHP":[32,32],"MCV.SHP":[32,32],"E1.SHP":[24,24]};
for(const [name,frames] of Object.entries(roster)){
  if(min.has(name))assert.ok(frames.length>=min.get(name),name+" has "+frames.length+" frames; the engine uses "+min.get(name));
  if(sizes[name])for(const f of frames)assert.deepEqual([f.width,f.height],sizes[name],name+" frame size");
  if(/ICNH\.(SHP|TEM)$/.test(name))assert.deepEqual([frames[0].width,frames[0].height],[64,48],name);
  for(const f of frames){
    assert.equal(f.pixels.length,f.width*f.height);
    assert.ok(f.pixels.every(p=>p<32||p>38),name+" uses a colour-cycling index");
  }
  if(!/MAKE|ICNH|WEAP2/.test(name)&&!effectNames.has(name))assert.ok(frames[0].pixels.some(p=>p>=176&&p<=191),name+" shows house colour (remap band)");
}
assert.equal(roster["E1.SHP"].length,532);
assert.equal(roster["HARV.SHP"].length,68);
// Command interface contracts (ui.js header): clock reaches STEP_COUNT+1,
// radar has 42 frames, buttons have up/down/disabled.
assert.ok(roster["HCLOCK.SHP"].length>=110);
assert.equal(roster["HRADAR.GDI"].length,42);
for(const b of ["HREPAIR.SHP","HSELL.SHP","HMAP.SHP","HSTRIPUP.SHP","HSTRIPDN.SHP"])assert.equal(roster[b].length,3,b);
assert.deepEqual([roster["HSIDE1.SHP"][0].width,roster["HSIDE1.SHP"][0].height],[160,120]);
assert.equal(roster["HPWRBAR.SHP"].length,8);
console.log("PASS: "+Object.keys(roster).length+" roster files meet the engine frame contracts");

const {render}=require("./render.js"),m=require("./models.js");
const a=render(m.tankBody(),{width:32,height:32,origin:[16,16],heading:1});
const b=render(m.tankBody(),{width:32,height:32,origin:[16,16],heading:1});
assert.deepEqual(a,b);
console.log("PASS: renderer is deterministic");

const {encodeAUD,effects}=require("../sound.js");
const aud=encodeAUD([0,0.5,-0.5,1],22050);
assert.equal(aud.readUInt16LE(0),22050);assert.equal(aud.readInt32LE(2),4);assert.equal(aud[11],0);
assert.deepEqual([...aud.subarray(12)],[128,192,65,255]);
const fx=effects();
for(const name of ["GUN18","MGUN2","GUN19","GUN5","TNKFIRE6","XPLOS","XPLOSML2","BUTTON","SCOLD2","CONSTRU2"])
  assert.ok(fx[name]&&fx[name].length>100,name+" effect exists");
console.log("PASS: AUD encoding and "+Object.keys(fx).length+" effects");

// Cursors: every frame the engine's cursor table reaches, with each hotspot
// inside the frame (mouse.cpp:304-341).
{
  const c=require("./cursors.js");
  const fr=c.frames();
  for(const [name,[start,count,small,hx,hy]] of Object.entries(c.TABLE)){
    assert.ok(start+count<=fr.length,name+" frames");
    if(small>=0)assert.ok(small+Math.max(1,count)<=fr.length,name+" small frames");
    assert.ok(hx<fr[start].width&&hy<fr[start].height,name+" hotspot inside the frame");
  }
  assert.ok(fr.every(f=>f.pixels.some(p=>p)),"no empty cursor frame");
  console.log("PASS: "+fr.length+" cursor frames cover the engine's cursor table");
}
