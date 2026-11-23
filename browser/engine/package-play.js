#!/usr/bin/env node
"use strict";
// Packages the public play site (M3): the stock engine page, its scripts and
// the CI-built original data pack. index.html opens the play view
// (vanillatd.html?play). Usage:
//   node browser/engine/package-play.js <engine-dir> <data-dir> <out-dir> <commit-sha>
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");

const ENGINE=["vanillatd.html","vanillatd.js","vanillatd.wasm"];
// Every script the page loads (shell.html <script src>), in browser/engine.
const SCRIPTS=["asset-audit.js","pack-loader.js","asset-import.js","original-asset.js",
  "wireframe-asset.js","cargo-hd.js","vertical-slice.js","mission-pack.js","tactical-hud.js",
  "simulation-bridge.js","rts-camera.js","rts-input-ui.js"];

function main(){
  const [engineDir,dataDir,outDir,sha]=process.argv.slice(2);
  if(!engineDir||!dataDir||!outDir||!/^[0-9a-f]{7,40}$/.test(sha||""))
    throw Error("Usage: package-play.js <engine-dir> <data-dir> <out-dir> <commit-sha>");
  const html=fs.readFileSync(path.join(engineDir,"vanillatd.html"),"utf8");
  const loaded=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const missing=loaded.filter(s=>!SCRIPTS.includes(s));
  if(missing.length)throw Error("Page loads scripts the package does not list: "+missing.join(", "));
  if(!fs.existsSync(path.join(dataDir,"pack.json")))throw Error("No pack.json in "+dataDir);

  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});
  for(const f of ENGINE)fs.copyFileSync(path.join(engineDir,f),path.join(outDir,f));
  // Scripts come from the tested engine build, like the engine itself.
  for(const f of SCRIPTS)fs.copyFileSync(path.join(engineDir,f),path.join(outDir,f));
  fs.cpSync(dataDir,path.join(outDir,"data"),{recursive:true});
  // Pages serves index.html at the site root.
  fs.writeFileSync(path.join(outDir,"index.html"),[
    "<!doctype html>",
    "<html lang=\"en\"><head><meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>World-Conquer</title>",
    "<meta http-equiv=\"refresh\" content=\"0; url=vanillatd.html?play\">",
    "<style>body{background:#111925;color:#edf4fa;font:16px system-ui,sans-serif;padding:24px}a{color:#69dfb2}</style>",
    "</head><body><p><a href=\"vanillatd.html?play\">Play World-Conquer</a></p></body></html>",""
  ].join("\n"));
  fs.writeFileSync(path.join(outDir,".nojekyll"),"");
  const files=[];
  (function walk(dir){
    for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const p=path.join(dir,e.name);
      if(e.isDirectory())walk(p);
      else files.push({path:path.relative(outDir,p).split(path.sep).join("/"),bytes:fs.statSync(p).size,
        sha256:crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")});
    }
  })(outDir);
  fs.writeFileSync(path.join(outDir,"site.json"),JSON.stringify({schema:1,commit:sha,files},null,1)+"\n");
  const bytes=files.reduce((n,f)=>n+f.bytes,0);
  console.log("Packaged play site: "+files.length+" files, "+bytes+" bytes, commit "+sha.slice(0,12));
}
main();
