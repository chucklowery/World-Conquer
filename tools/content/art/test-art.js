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
// Power gauge (hi-res y 176-399): the pair of frames drawn at PowY and
// PowY+100 reaches the bottom, and the sidebar panels leave it see-through.
assert.equal(roster["HPWRBAR.SHP"][0].height,124);
{const p1=roster["HSIDE1.SHP"][0],p2=roster["HSIDE2.SHP"][0];
  for(let y=18;y<120;y++)for(let x=0;x<16;x++)assert.equal(p1.pixels[y*160+x],0,"HSIDE1 covers the gauge");
  for(let y=0;y<120;y++)for(let x=0;x<16;x++)assert.equal(p2.pixels[y*160+x],0,"HSIDE2 covers the gauge");}
assert.equal(roster["HRADAR.GDI"][0].height,143);
console.log("PASS: "+Object.keys(roster).length+" roster files meet the engine frame contracts");

// Readability (M5 art pass 2): no model reaches past its frame, damaged
// frames are visibly different, build-ups do not stall, cameos carry a name.
{
  const {overflow,INFANTRY,cameo}=require("./build.js"),m=require("./models.js"),{frameHeading}=require("./render.js");
  const structures={FACT:[m.constructionYard(),72,48],NUKE:[m.powerPlant(),48,48],PROC:[m.refinery(),72,72],
    PYLE:[m.barracks(),48,48],WEAP:[m.factory(),72,72],GTWR:[m.guardTower(),24,24]};
  for(const [n,[parts,w,h]] of Object.entries(structures))assert.equal(overflow(parts,w,h),0,n+" reaches past its frame");
  const vehicles={MTNK:[m.tankBody(),m.tankTurret()],JEEP:[m.jeepBody(),m.jeepTurret()],HARV:[m.harvester(0),m.harvester(3)],MCV:[m.mcv()]};
  for(const [n,models] of Object.entries(vehicles))for(const parts of models)for(let k=0;k<32;k+=2)
    assert.equal(overflow(parts,32,32,{heading:frameHeading(k)}),0,n+" reaches past its frame at heading "+k);
  for(const pose of [{},{walk:0.25},{aim:true,flash:true},{prone:true,crawl:0.5},{fall:1},{wave:1}])for(let f=0;f<8;f++)
    assert.equal(overflow(m.rifleman(pose),INFANTRY.size,INFANTRY.size,{heading:f*Math.PI/4,origin:INFANTRY.origin,scale:INFANTRY.scale}),0,
      "E1 "+JSON.stringify(pose)+" reaches past its frame facing "+f);
  const diff=(a,b)=>a.pixels.filter((v,i)=>v!==b.pixels[i]).length;
  for(const n of Object.keys(structures)){
    const fr=roster[n+".SHP"],half=fr.length/2;
    assert.ok(diff(fr[0],fr[half])>=0.08*fr[0].pixels.length,n+" damaged frame is too close to the normal one");
    const make=roster[n+"MAKE.SHP"];let repeats=0;
    for(let i=1;i<make.length;i++)if(diff(make[i],make[i-1])===0)repeats++;
    assert.ok(repeats<=1,n+"MAKE repeats "+repeats+" frames");
  }
  const {rampIndex}=require("./palette.js"),ink=rampIndex("steel",1);
  for(const name of Object.keys(roster).filter(k=>k.endsWith("ICNH.SHP"))){
    const f=roster[name][0];let lit=0;
    for(let y=39;y<48;y++)for(let x=0;x<64;x++)if(f.pixels[y*64+x]===ink)lit++;
    assert.ok(lit>20,name+" has no name strip");
  }
  assert.throws(()=>cameo(m.guardTower(),"MUCH TOO LONG A NAME HERE"),/too wide/);
  // The same at 2x, with the fine detail the HD sheets add.
  for(const [n,[parts,w,h]] of Object.entries(structures))assert.equal(overflow(parts,w*2,h*2,{scale:2}),0,n+" HD reaches past its frame");
  for(const [n,models] of Object.entries(vehicles))for(const parts of models)for(let k=0;k<32;k+=4)
    assert.equal(overflow(parts,64,64,{heading:frameHeading(k),scale:2}),0,n+" HD reaches past its frame at heading "+k);
  for(const pose of [{},{aim:true,flash:true},{prone:true},{fall:1}])for(let f=0;f<8;f+=2)
    assert.equal(overflow(m.rifleman(pose),INFANTRY.size*2,INFANTRY.size*2,{heading:f*Math.PI/4,origin:INFANTRY.origin.map(v=>v*2),scale:INFANTRY.scale*2}),0,
      "E1 HD "+JSON.stringify(pose)+" reaches past its frame facing "+f);
  console.log("PASS: roster art stays inside its frames; damaged, build-up and cameo name checks");
}

// HD sheets (ADR-0006): one HD frame per SHP frame, scale times the size,
// same palette rules, and the encoding round-trips.
{
  const {hdFiles,HD_SCALE}=require("./build.js"),{encodeHD,decodeHD}=require("./hd.js");
  for(const [name,sheet] of Object.entries(hdFiles())){
    const shp=sheet.base;
    assert.ok(shp&&shp.length,name+" has no matching 1x file");
    if(roster[sheet.source])assert.deepEqual(roster[sheet.source].map(f=>f.width),shp.map(f=>f.width),name+" source differs from the shipped "+sheet.source);
    assert.equal(sheet.scale,HD_SCALE);
    assert.equal(sheet.frames.length,shp.length,name+" frame count");
    const cycles=shp.some(f=>f.pixels.some(p=>p>=32&&p<=38));
    shp.forEach((f,i)=>{
      assert.deepEqual([sheet.frames[i].width,sheet.frames[i].height],[f.width*HD_SCALE,f.height*HD_SCALE],name+" frame "+i+" size");
      // Water templates cycle colours (32-38) on purpose; nothing else may.
      if(!cycles)assert.ok(sheet.frames[i].pixels.every(p=>p<32||p>38),name+" uses a colour-cycling index");
    });
    const back=decodeHD(encodeHD(sheet.frames,sheet.scale,sheet.width,sheet.height));
    back.frames.forEach((f,i)=>assert.ok(Buffer.from(f.pixels).equals(Buffer.from(sheet.frames[i].pixels)),name+" frame "+i+" round trip"));
  }
  console.log("PASS: HD sheets match their SHP frames and round-trip");
}

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
