#!/usr/bin/env node
"use strict";
// Single M2 pack entrypoint. Source-owned, reproducible data only.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),cp=require("node:child_process");
const {build:buildBoot,nativeMixer}=require("./boot-pack.js");
const root=path.resolve(__dirname,"../..");
const requirementsPath=path.join(root,"game/content/pack/requirements.json");
const sha256=buffer=>crypto.createHash("sha256").update(buffer).digest("hex");
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
  buildBoot(outdir);
  const wireframeStage=path.join(outdir,"_wireframes");
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
  for(const name of [...chosen.keys()].sort()){
    const asset=chosen.get(name);
    const source=path.join(wireframeStage,"files",asset.target);
    if(!fs.existsSync(source))throw Error("Wireframe missing "+asset.target);
    const target=path.join(outdir,"game",name);
    // Preserve the M1 boot/menu files when an engine filename overlaps.
    if(!fs.existsSync(target)){
      fs.copyFileSync(source,target);
      wireframeNames.add(name);
    }
  }
  fs.rmSync(wireframeStage,{recursive:true,force:true});
  const scenarioNames=new Set(require("./scenario.js").build(path.join(outdir,"game")));
  const theaterNames=new Set(require("./theater.js").build(path.join(outdir,"game")));
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
    sourceFiles:scenarioNames.has(entry.path)?["tools/content/scenario.js","game/content/scenarios/foundry-test-range.json"]:
      theaterNames.has(entry.path)?["tools/content/theater.js","tools/content/encode-iconset.js"]:
      wireframeNames.has(entry.path)?
      ["tools/content/wireframes.js","game/content/wireframes/catalog.json","game/content/source/placeholder.palette.json"]:
      ["tools/content/boot-pack.js","game/content/pack/boot-requirements.json"],
    license:"CC0-1.0",sourceRevision:revision
  }]));
  const manifest={schema:1,packVersion:"m2-"+revision.slice(0,12),files};
  const names=new Set(files.map(f=>f.path.toUpperCase()));
  // Only report an archive member as produced when the *built archive*
  // lists it. Inventory declarations are not evidence of a MIX member.
  const mixer=nativeMixer();
  const archiveContents=new Set();
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
      if(match)archiveContents.add(match[1].toUpperCase());
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
module.exports={build};
