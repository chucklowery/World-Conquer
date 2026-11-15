#!/usr/bin/env node
// Produce only the public, original-content runtime files from a verified
// VanillaTD WebAssembly build. Never publish the rest of the build tree.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const files = [
  "vanillatd.html", "vanillatd.js", "vanillatd.wasm",
  "asset-import.js", "original-asset.js", "wireframe-asset.js",
  "cargo-hd.js", "vertical-slice.js", "mission-pack.js", "tactical-hud.js", "simulation-bridge.js",
  "rts-camera.js", "rts-input-ui.js", "play.html"
];
const folders = ["missions", "cargo-hd", "content", "wireframes", "r05"];

function packageAlpha(buildPath, outputPath, revision="local") {
  const source=path.resolve(buildPath), target=path.resolve(outputPath);
  if(target===source || target.startsWith(source+path.sep))
    throw new Error("The public output must be outside the engine build directory");
  if(fs.existsSync(target) && fs.readdirSync(target).length)
    throw new Error("Refusing to overwrite a nonempty publication directory");
  for(const name of files){
    const file=path.join(source,name);
    if(!fs.statSync(file).isFile() || fs.statSync(file).size===0)
      throw new Error("Missing or empty WebAssembly runtime file: "+name);
  }
  for(const name of folders){
    const folder=path.join(source,name);
    if(!fs.statSync(folder).isDirectory() || !fs.readdirSync(folder).length)
      throw new Error("Missing original-content asset directory: "+name);
  }
  fs.mkdirSync(target,{recursive:true});
  for(const name of files)fs.copyFileSync(path.join(source,name),path.join(target,name));
  for(const name of folders)fs.cpSync(path.join(source,name),path.join(target,name),{recursive:true});
  fs.copyFileSync(path.join(source,"vanillatd.html"),path.join(target,"index.html"));
  fs.writeFileSync(path.join(target,".nojekyll"),"");
  fs.writeFileSync(path.join(target,"release.json"),JSON.stringify({
    name:"World-Conquer Tactical Alpha",version:"0.1",revision
  },null,2)+"\n");
  return {files:files.length+2,folders:folders.length,revision};
}

if(require.main===module){
  if(process.argv.length<4){
    console.error("Usage: node package-alpha.js <engine-build-dir> <empty-output-dir> [revision]");
    process.exit(2);
  }
  try{
    const result=packageAlpha(process.argv[2],process.argv[3],process.argv[4]||"local");
    console.log("PASS: packaged browser-playable native alpha",result);
  }catch(error){console.error(error.message);process.exitCode=1;}
}

module.exports={packageAlpha,files,folders};
