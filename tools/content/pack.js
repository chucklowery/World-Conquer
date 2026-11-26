#!/usr/bin/env node
"use strict";
// Single M2 pack entrypoint. Source-owned, reproducible data only.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),cp=require("node:child_process");
const {build:buildBoot,nativeMixer}=require("./boot-pack.js");
const root=path.resolve(__dirname,"../..");
const requirementsPath=path.join(root,"game/content/pack/requirements.json");
const sha256=buffer=>crypto.createHash("sha256").update(buffer).digest("hex");
const {encodeTacticalShape,decodeTacticalShape}=require("./encode-shape.js");
// Wireframes are drawn with their own 8-colour palette (indices 1-7,
// game/content/source/placeholder.palette.json). Translate those indices to
// the nearest game-palette colours (TEMPERAT.PAL, boot-colors.js), skipping
// the fixed engine colours 0-15 and the house remap band 176-191, which is
// kept as-is so the engine can recolour each house.
// Indices the engine uses for text colours; art must not land on them
// (233-237 also rotate on the score screen). See boot-colors.js.
const TEXT_COLOURS=new Set([16,25,202,209,233,234,235,236,237]);
function wireframeTranslation(){
  const {rgbPalette}=require("./boot-colors.js");
  const game=rgbPalette();
  const source=JSON.parse(fs.readFileSync(path.join(root,"game/content/source/placeholder.palette.json"),"utf8")).colors
    .map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  const table=Array.from({length:256},(_,i)=>i);
  for(let i=1;i<source.length;i++){
    let best=16,dist=Infinity;
    for(let j=16;j<256;j++){
      if(j>=176&&j<=191)continue;        // house remap band
      if(j>=32&&j<=38)continue;          // colour cycling (defines.h:1936-1937)
      if(TEXT_COLOURS.has(j))continue;     // engine text colours (boot-colors.js)
      const d=source[i].reduce((sum,c,k)=>sum+(c-game[j][k])**2,0);
      if(d<dist){dist=d;best=j;}
    }
    table[i]=best;
  }
  return table;
}
function translateShape(buffer,table){
  const shape=decodeTacticalShape(buffer);
  for(const frame of shape.frames)frame.pixels=frame.pixels.map(p=>table[p]);
  return encodeTacticalShape(shape);
}
function build(outdir){
  outdir=path.resolve(outdir);
  // Never recursively delete arbitrary user work. CI builds under build/;
  // reproducibility tests use newly created directories beneath OS temp.
  const allowedRoots=[path.join(root,"build"),fs.realpathSync(os.tmpdir())];
  if(fs.existsSync(outdir)&&fs.lstatSync(outdir).isSymbolicLink())
    throw Error("Pack output must not be a symbolic link: "+outdir);
  const parent=fs.realpathSync(path.dirname(outdir));
  const realTarget=path.join(parent,path.basename(outdir));
  if(!allowedRoots.some(base=>realTarget.startsWith(base+path.sep)))
    throw Error("Pack output must be inside build/ or the OS temp directory: "+outdir);
  if(fs.existsSync(outdir)&&fs.readdirSync(outdir).length&&!fs.existsSync(path.join(outdir,"pack.json")))
    throw Error("Refusing to overwrite non-pack directory: "+outdir);
  fs.rmSync(outdir,{recursive:true,force:true});
  fs.mkdirSync(outdir,{recursive:true});
  const wireframeStage=path.join(outdir,"_wireframes");
  const contentStage=path.join(outdir,"_content");
  fs.mkdirSync(contentStage,{recursive:true});
  require("./wireframes.js").build(wireframeStage,undefined,true);
  const generated=JSON.parse(fs.readFileSync(path.join(wireframeStage,"manifest.json"),"utf8")).assets;
  // One name may belong to several engine types. Select the largest frame
  // contract so a smaller placeholder cannot hide an out-of-range lookup.
  const chosen=new Map();
  for(const asset of generated){
    if(!asset.engineFilename||!asset.target)continue;
    const name=asset.engineFilename.toUpperCase();
    if(name==="WIREFRAME.PAL")continue;
    const prev=chosen.get(name);
    if(!prev||asset.frames>prev.frames||(asset.frames===prev.frames&&asset.id<prev.id))chosen.set(name,asset);
  }
  const wireframeNames=new Set();
  const bootOwned=new Set(["MOUSE.SHP","CONQUER.ENG"]);
  const translation=wireframeTranslation();
  for(const name of [...chosen.keys()].sort()){
    const asset=chosen.get(name);
    const source=path.join(wireframeStage,"files",asset.target);
    if(!fs.existsSync(source))throw Error("Wireframe missing "+asset.target);
    // Preserve the M1 boot/menu files when an engine filename overlaps.
    if(!bootOwned.has(name)){
      fs.writeFileSync(path.join(contentStage,name),translateShape(fs.readFileSync(source),translation));
      wireframeNames.add(name);
    }
  }
  fs.rmSync(wireframeStage,{recursive:true,force:true});
  // M5 roster art (tools/content/art) replaces the wireframes for the
  // objects a skirmish can show, plus their build-up animations and cameos.
  const artNames=new Set(require("./art/build.js").build(contentStage));
  for(const name of artNames)wireframeNames.delete(name);
  const placeholderNames=new Set(require("./placeholders.js").build(contentStage,new Set([...wireframeNames,...artNames])));
  // Audited frame contracts: the engine indexes frames up to minFrames-1 for
  // these objects (requirements.json minFramesEvidence). Fail the build if a
  // generated sprite is shorter, since the engine would read past its end.
  const reqFiles=JSON.parse(fs.readFileSync(requirementsPath,"utf8")).files;
  for(const entry of reqFiles){
    const min=entry.contract&&entry.contract.minFrames;
    if(!Number.isInteger(min))continue;
    const file=path.join(contentStage,entry.name.toUpperCase());
    if(!fs.existsSync(file))throw Error("Audited sprite not generated: "+entry.name);
    const frames=fs.readFileSync(file).readUInt16LE(0);
    if(frames<min)throw Error(entry.name+" has "+frames+" frames; the engine uses up to "+min);
  }
  const conquerMembers=[...wireframeNames,...artNames,...placeholderNames].filter(n=>!n.endsWith(".TEM")&&n!=="TEMPERAT.PAL").sort();
  const theaterMembers=[...placeholderNames,...artNames].filter(n=>n.endsWith(".TEM")||n==="TEMPERAT.PAL").sort();
  const soundStage=path.join(outdir,"_sounds"),speechStage=path.join(outdir,"_speech");
  fs.mkdirSync(soundStage,{recursive:true});fs.mkdirSync(speechStage,{recursive:true});
  const audio=require("./sound.js").build(soundStage,speechStage);
  const soundNames=new Set([...audio.sounds,...audio.speech]);
  buildBoot(outdir,{conquerExtra:{dir:contentStage,files:conquerMembers},
    sounds:{dir:soundStage,files:audio.sounds},speech:{dir:speechStage,files:audio.speech}});
  fs.rmSync(soundStage,{recursive:true,force:true});fs.rmSync(speechStage,{recursive:true,force:true});
  fs.copyFileSync(path.join(outdir,"game","TEMPERAT.PAL"),path.join(contentStage,"TEMPERAT.PAL"));
  const scenarioNames=new Set(require("./scenario.js").build(path.join(outdir,"game")));
  const theaterNames=new Set(require("./theater.js").build(path.join(outdir,"game"),
    {dir:contentStage,files:[...new Set(["TEMPERAT.PAL",...theaterMembers])]}));
  fs.rmSync(contentStage,{recursive:true,force:true});
  const requirements=JSON.parse(fs.readFileSync(requirementsPath,"utf8"));
  if(requirements.schema!==1||!Array.isArray(requirements.files))throw Error("Invalid requirements schema");
  const revision=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
  const game=path.join(outdir,"game");
  // Pack metadata is based on *all* loose files under /game, independent of
  // filesystem enumeration order. The manifest uses schema 1 (M1 loader).
  const list=()=>fs.readdirSync(game).sort().filter(name=>fs.statSync(path.join(game,name)).isFile())
    .map(name=>{const data=fs.readFileSync(path.join(game,name));
      return {path:name,bytes:data.length,sha256:sha256(data)};});
  const files=list();
  const provenance=Object.fromEntries(files.map(entry=>[entry.path,{
    generator:scenarioNames.has(entry.path)?"tools/content/scenario.js":
      theaterNames.has(entry.path)?"tools/content/theater.js":
      wireframeNames.has(entry.path)?"tools/content/wireframes.js":"tools/content/boot-pack.js",
    sourceFiles:scenarioNames.has(entry.path)?["tools/content/scenario.js",require("./scenario.js").build.sources[entry.path]]:
      theaterNames.has(entry.path)?["tools/content/theater.js","tools/content/encode-iconset.js","tools/content/encode-shape.js"]:
      wireframeNames.has(entry.path)?
      ["tools/content/wireframes.js","game/content/wireframes/catalog.json","game/content/source/placeholder.palette.json"]:
      entry.path.toUpperCase().endsWith(".MIX")?
      ["tools/content/boot-pack.js","tools/content/placeholders.js","tools/content/fading.js","tools/content/theater.js",
        "tools/content/wireframes.js","tools/content/art/build.js","tools/content/sound.js","game/content/pack/requirements.json"]:
      ["tools/content/boot-pack.js","game/content/pack/boot-requirements.json"],
    license:"CC0-1.0",sourceRevision:revision
  }]));
  const manifest={schema:1,packVersion:"m2-"+revision.slice(0,12),files};
  const names=new Set(files.map(f=>f.path.toUpperCase()));
  // Only report an archive member as produced when the *built archive*
  // lists it. Inventory declarations are not evidence of a MIX member.
  const mixer=nativeMixer();
  const archiveContents=new Set();
  const archiveMembers={};
  const mixAudit=path.join(outdir,"_mix_audit");
  fs.mkdirSync(mixAudit,{recursive:true});
  for(const archive of files.filter(x=>x.path.toUpperCase().endsWith(".MIX"))){
    // vanillamix uses RawFileClass's lower-case POSIX basename normalization.
    const alias=path.join(mixAudit,archive.path.toLowerCase());
    fs.copyFileSync(path.join(game,archive.path),alias);
    const run=cp.spawnSync(mixer,["--list",alias],{encoding:"utf8"});
    if(run.error||run.status!==0)throw Error("Cannot inspect MIX "+archive.path+": "+(run.error||run.stderr));
    for(const line of run.stdout.split(/\r?\n/)){
      const match=line.match(/^\s*([A-Za-z0-9_.-]+\.[A-Za-z0-9]+)\s+\d+\s+\d+\s*$/);
      if(match){
        archiveContents.add(match[1].toUpperCase());
        (archiveMembers[archive.path]=archiveMembers[archive.path]||[]).push(match[1].toUpperCase());
      }
    }
  }
  fs.rmSync(mixAudit,{recursive:true,force:true});
  const produced=req=>names.has(req.name.toUpperCase())||archiveContents.has(req.name.toUpperCase());
  const required=requirements.files.filter(x=>x.requiredFor!=="optional");
  const present=required.filter(produced);
  const coverage={schema:1,total:required.length,produced:present.length,
    missing:required.filter(x=>!produced(x)).map(x=>x.name),
    byStage:Object.fromEntries(["boot","menu","scenario","gameplay"].map(stage=>{
      const group=required.filter(x=>x.requiredFor===stage);
      return [stage,{total:group.length,produced:group.filter(produced).length}];
    }))};
  fs.writeFileSync(path.join(outdir,"pack.json"),JSON.stringify(manifest,null,2)+"\n");
  // Archive members: the engine loads game data through MFCD::Retrieve,
  // which only sees registered MIX archives, so members are what count.
  for(const name of Object.keys(archiveMembers))archiveMembers[name].sort();
  const memberSource=name=>name.endsWith(".MRF")?"tools/content/fading.js":
    artNames.has(name)?"tools/content/art/build.js":
    soundNames.has(name)?"tools/content/sound.js":
    (require("./theater.js").build.artFiles||[]).includes(name)?"tools/content/art/terrain.js":
    theaterMembers.includes(name)||placeholderNames.has(name)?"tools/content/placeholders.js":
    wireframeNames.has(name)?"tools/content/wireframes.js":
    ["CLEAR1.TEM","W1.TEM","T01.TEM"].includes(name)||/^TI\d+\.TEM$/.test(name)?"tools/content/theater.js":
    "tools/content/boot-pack.js";
  provenance.members=Object.fromEntries(Object.entries(archiveMembers).map(([archive,members])=>
    [archive,Object.fromEntries(members.map(m=>[m,{generator:memberSource(m),license:"CC0-1.0"}]))]));
  fs.writeFileSync(path.join(outdir,"archives.json"),JSON.stringify(archiveMembers,null,2)+"\n");
  fs.writeFileSync(path.join(outdir,"PROVENANCE.json"),JSON.stringify(provenance,null,2)+"\n");
  fs.writeFileSync(path.join(outdir,"coverage.json"),JSON.stringify(coverage,null,2)+"\n");
  console.log("M2 pack coverage:",JSON.stringify(coverage));
  return {manifest,coverage,provenance};
}
if(require.main===module){
  try{if(process.argv[2]!=="build"||!process.argv[3])throw Error("Usage: node tools/content/pack.js build <outDir>");
    build(process.argv[3]);
  }catch(e){console.error(e.stack||e);process.exitCode=1;}
}
module.exports={build,wireframeTranslation,translateShape};
