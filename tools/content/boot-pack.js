#!/usr/bin/env node
"use strict";
// Deterministic, source-owned boot placeholders. Generated data must not be committed.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),cp=require("node:child_process");
const {encodePalette}=require("./encode-palette.js");
const {encodeShape}=require("./encode-shape.js");
const {encodeFont,verifyFont}=require("./encode-font.js");
const {encodeCPS,decodeCPS}=require("./encode-cps.js");
const {encodePCX,verifyPCX}=require("./encode-pcx.js");
const ROOT=path.resolve(__dirname,"../..");
const REQUIREMENTS=path.join(ROOT,"game/content/pack/boot-requirements.json");
function stringTable() {
  // Extract_String uses the first uint16 offset as the number of entries * 2.
  // The final index range is reserved for the engine's own InternetTxt table.
  const count=4567;
  const pieces=Array.from({length:count},(_,i)=>{
    const value=i%2?"ASTER":"FORGE";
    return Buffer.from(value+"\0","ascii");
  });
  const table=Buffer.alloc(count*2);
  let offset=table.length;
  for(let i=0;i<count;i++){
    table.writeUInt16LE(offset,i*2);
    offset+=pieces[i].length;
  }
  return Buffer.concat([table,...pieces]);
}
function shape(frames,width,height,color) {
  const pixels=Array.from({length:width*height},(_,i)=>{
    const x=i%width,y=Math.floor(i/width);
    return x===0||y===0||x===width-1||y===height-1||x===y?color:0;
  });
  return encodeShape({frames:Array.from({length:frames},()=>({width,height,pixels}))});
}
function write(dir,name,bytes) {
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,name),bytes);
}
function nativeMixer() {
  const guesses=[
    process.env.WC_MIXTOOL,
    path.join(ROOT,"build/native/vanillamix"),
    path.join(ROOT,"build/native/vanillamix.exe")
  ].filter(Boolean);
  const tool=guesses.find(p=>fs.existsSync(p));
  if(!tool)throw Error("vanillamix not built; build native tools first or set WC_MIXTOOL");
  return tool;
}
function archive(tool,workdir,game,name,entries) {
  const dest=path.join(game,name);
  const args=["--create","--directory",workdir,...entries.flatMap(x=>["--file",x]),dest];
  const run=cp.spawnSync(tool,args,{encoding:"utf8"});
  if(run.error||run.status!==0)throw Error("MIX create "+name+": "+(run.error||run.stderr||run.stdout));
  // RawFileClass inside vanillamix normalizes the output basename to
  // lowercase on POSIX. The browser manifest and MEMFS require uppercase.
  const emitted=path.join(game,name.toLowerCase());
  if(!fs.existsSync(dest)&&fs.existsSync(emitted))fs.renameSync(emitted,dest);
  if(!fs.existsSync(dest))throw Error("MIX output not found: "+name);
  const listing=cp.spawnSync(tool,["--list",dest],{encoding:"utf8"});
  if(listing.error||listing.status!==0)throw Error("MIX list "+name+" failed");
}
function build(outdir) {
  const requirements=JSON.parse(fs.readFileSync(REQUIREMENTS,"utf8"));
  const revision=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8"}).trim();
  const game=path.join(outdir,"game"),stage=path.join(outdir,"_m1stage");
  fs.mkdirSync(game,{recursive:true});
  fs.mkdirSync(stage,{recursive:true});
  const palette=encodePalette({colors:Array.from({length:256},(_,i)=>
    i===0?"#000000":i%2?"#74DCC3":"#25374A")});
  const font=encodeFont();verifyFont(font);
  const cps=encodeCPS();if(decodeCPS(cps).length!==64000)throw Error("CPS round-trip failed");
  const pcx=encodePCX();verifyPCX(pcx);
  const mouse=shape(16,16,16,15),texture=shape(64,20,20,10);
  const strings=stringTable();
  const fontNames=["3POINT.FNT","6POINT.FNT","8POINT.FNT","6POINT.FNT",
    "LED.FNT","VCR.FNT","GRAD6FNT.FNT","8FAT.FNT","12GREEN.FNT","12GRNGRD.FNT","SCOREFNT.FNT"];
  const fonts=[...new Set(fontNames)];
  for(const name of fonts)write(stage,name,font);
  write(stage,"MOUSE.SHP",mouse);
  write(stage,"BTEXTURE.SHP",texture);
  write(stage,"PREPICK.CPS",cps);
  write(stage,"TITLE.CPS",cps);
  write(stage,"HTITLE.PCX",pcx);
  write(stage,"CONQUER.ENG",strings);
  write(stage,"WCBOOT.DAT",Buffer.from("World-Conquer original boot placeholder\n"));
  const tool=nativeMixer();
  archive(tool,stage,game,"CCLOCAL.MIX",fonts);
  archive(tool,stage,game,"LOCAL.MIX",fonts);
  archive(tool,stage,game,"CONQUER.MIX",["MOUSE.SHP","CONQUER.ENG"]);
  archive(tool,stage,game,"GENERAL.MIX",["BTEXTURE.SHP","PREPICK.CPS","TITLE.CPS","HTITLE.PCX"]);
  archive(tool,stage,game,"SOUNDS.MIX",["WCBOOT.DAT"]);
  write(game,"TEMPERAT.PAL",palette);
  write(game,"CONQUER.ENG",strings);
  // Loose decoder fixtures are also usable by the stock engine's fallback lookup.
  write(game,"8POINT.FNT",font);
  write(game,"PREPICK.CPS",cps);
  write(game,"TITLE.CPS",cps);
  write(game,"HTITLE.PCX",pcx);
  // Original file names inside a MIX are supplied by the generated archive.
  const provided=new Set(["CCLOCAL.MIX","LOCAL.MIX","CONQUER.MIX","GENERAL.MIX","SOUNDS.MIX",
    "TEMPERAT.PAL","CONQUER.ENG",...fonts,"MOUSE.SHP","BTEXTURE.SHP","PREPICK.CPS","TITLE.CPS","HTITLE.PCX"]);
  for(const req of requirements.files){
    if(["boot","menu"].includes(req.requiredFor)&&!provided.has(req.name))
      throw Error("Missing boot requirement: "+req.name);
  }
  const output=fs.readdirSync(game).sort().map(name=>{
    const bytes=fs.readFileSync(path.join(game,name));
    return {path:name,bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex")};
  });
  const manifest={schema:1,packVersion:"m1-"+revision.slice(0,12),files:output};
  const provenance=Object.fromEntries(output.map(f=>[f.path,{
    generator:"tools/content/boot-pack.js",license:"CC0-1.0",sourceRevision:revision
  }]));
  write(outdir,"pack.json",Buffer.from(JSON.stringify(manifest,null,2)+"\n"));
  write(outdir,"PROVENANCE.json",Buffer.from(JSON.stringify(provenance,null,2)+"\n"));
  fs.rmSync(stage,{recursive:true,force:true});
  return manifest;
}
if(require.main===module){
  try {
    if(process.argv[2]!=="build"||!process.argv[3])throw Error("Usage: boot-pack.js build <outDir>");
    const result=build(path.resolve(process.argv[3]));
    console.log("Created original boot pack: "+result.files.map(f=>f.path).join(", "));
  }catch(e){console.error(e.stack||e.message);process.exitCode=1;}
}
module.exports={build,stringTable,shape};
