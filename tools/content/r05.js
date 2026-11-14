#!/usr/bin/env node
"use strict";

// R05 is a deliberately separate art-ID namespace. It does not register
// simulation entities or alter the legacy engine's class/filename semantics.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const {encodeTacticalShape, decodeTacticalShape} = require("./encode-shape");
const {encodePalette} = require("./encode-palette");

const root = path.resolve(__dirname, "../..");
const sourceDir = path.join(root, "game/content/r05");
const galleryDir = path.join(root, "browser/engine");
const SIZE_BUDGET = 2500000;
const ATLAS_SIZE = 1024;
const MAX_ATLASES = 4;
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const json = value => Buffer.from(JSON.stringify(value, null, 2) + "\n");
const allowedKinds = new Set(["infantry", "vehicle", "building", "resource", "terrain", "effect"]);
const number = (v, label) => {
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(String(v))) throw new Error(`Invalid ${label}: ${v}`);
  return Number(v);
};

function readSources(dir = sourceDir) {
  const roster = JSON.parse(fs.readFileSync(path.join(dir, "roster.json"), "utf8"));
  const palette = JSON.parse(fs.readFileSync(path.join(dir, "palette.json"), "utf8"));
  if (roster.schemaVersion !== 1 || roster.namespace !== "r05" ||
      roster.gameplayCellPixels !== 24 || !Array.isArray(roster.assets) ||
      !Array.isArray(roster.factions) || roster.factions.length !== 2 ||
      roster.license !== "CC0-1.0" || !roster.creator?.trim()) throw new Error("Invalid R05 roster header");
  const colors = palette.colors;
  encodePalette(palette); // Validate RGB6 compatibility and transparent index 0.
  if (colors.length !== new Set(colors.map(c => c.toUpperCase())).size) throw new Error("Duplicate palette color");
  const teams = new Map();
  for (const faction of roster.factions) {
    if (!/^[a-z]+$/.test(faction.id) || teams.has(faction.id) ||
        !faction.name || faction.teamPalette.length !== 4 ||
        faction.teamPalette.some(n => !Number.isInteger(n) || n < 1 || n >= colors.length)) {
      throw new Error("Invalid faction/team palette");
    }
    teams.set(faction.id, faction);
  }
  if (new Set([...teams.values()].flatMap(t => t.teamPalette)).size !== 8) throw new Error("Overlapping team remap colors");
  const ids = new Set(), sources = new Set(), roles = new Map();
  const assets = roster.assets.map(asset => {
    if (!new RegExp("^r05\\.(?:" + [...teams.keys()].join("|") + "|world)\\.[a-z][a-z0-9-]+$").test(asset.id) ||
        ids.has(asset.id) || !allowedKinds.has(asset.kind) || !asset.name || !asset.role ||
        ![24, 32, 48].includes(asset.size) || !Array.isArray(asset.footprint) ||
        asset.footprint.length !== 2 || asset.footprint.some(n => !Number.isInteger(n) || n < 1 || n > 3) ||
        (asset.faction === null ? !asset.id.startsWith("r05.world.") || !["resource","terrain","effect"].includes(asset.kind)
          : !teams.has(asset.faction) || !asset.id.startsWith(`r05.${asset.faction}.`) || !["infantry","vehicle","building"].includes(asset.kind))) {
      throw new Error(`Invalid R05 asset contract: ${asset.id}`);
    }
    ids.add(asset.id);
    if (typeof asset.source !== "string" || !/^source\/(?:aster|forge|world)\/[a-z-]+\.svg$/.test(asset.source) ||
        !asset.source.startsWith(`source/${asset.faction || "world"}/`) || sources.has(asset.source)) {
      throw new Error(`Unsafe or shared source: ${asset.source}`);
    }
    sources.add(asset.source);
    const resolved = path.resolve(dir, asset.source), real = fs.realpathSync(resolved);
    if (!real.startsWith(path.resolve(dir) + path.sep) || !fs.statSync(real).isFile()) throw new Error("Source escapes content root");
    const source = fs.readFileSync(real, "utf8");
    const key = `${asset.faction || "world"}:${asset.kind}`;
    roles.set(key, (roles.get(key) || 0) + 1);
    return {...asset, svg: source, sourceSha256: sha(Buffer.from(source))};
  });
  for (const faction of teams.keys()) {
    if (roles.get(`${faction}:infantry`) !== 1 || roles.get(`${faction}:vehicle`) !== 2 ||
        roles.get(`${faction}:building`) !== 5) throw new Error(`Incomplete ${faction} roster`);
  }
  if (roles.get("world:resource") !== 2 || roles.get("world:terrain") !== 3 || roles.get("world:effect") !== 3 ||
      assets.length !== 24) throw new Error("Incomplete environment roster");
  return {roster, palette, teams, assets};
}

function attrs(text) {
  const found = {};
  for (const m of text.matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/g)) {
    if (found[m[1]] !== undefined) throw new Error("Duplicate SVG attribute");
    found[m[1]] = m[2];
  }
  if (text.replace(/([a-z][a-z0-9-]*)="([^"]*)"/g, "").trim()) throw new Error("Unsupported SVG attribute syntax");
  return found;
}

function sourcePixels(svg, size, colors) {
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">[\s\S]*<\/svg>\s*$/.test(svg.trim()) ||
      /<!|<\?|&|url\(|script|href|style|transform/i.test(svg)) throw new Error("Unsafe or unsupported SVG source");
  const elements = [...svg.matchAll(/<(rect|polygon|circle|ellipse|line)\b([^<>]*?)\/>/g)];
  const other = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
    .replace(/<(rect|polygon|circle|ellipse|line)\b[^<>]*?\/>/g, "").trim();
  if (!elements.length || other) throw new Error("Unsupported SVG nodes");
  const lookup = new Map(colors.map((c, i) => [c.toUpperCase(), i]));
  const pixels = new Array(size * size).fill(0);
  for (const [, tag, raw] of elements) {
    const a = attrs(raw), allowed = tag === "rect" ? ["x","y","width","height","fill"] :
      tag === "polygon" ? ["points","fill"] : tag === "circle" ? ["cx","cy","r","fill"] :
        tag === "ellipse" ? ["cx","cy","rx","ry","fill"] : ["x1","y1","x2","y2","stroke","stroke-width"];
    if (Object.keys(a).some(k => !allowed.includes(k))) throw new Error(`Unsupported ${tag} attribute`);
    const paint = a[tag === "line" ? "stroke" : "fill"]?.toUpperCase();
    if (!lookup.has(paint) || lookup.get(paint) === 0) throw new Error("SVG uses a color outside the nontransparent authored palette");
    let inside;
    if (tag === "rect") {
      const x = number(a.x, "x"), y = number(a.y, "y"), w = number(a.width, "width"), h = number(a.height, "height");
      if (w <= 0 || h <= 0) throw new Error("Empty SVG rect");
      inside = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
    } else if (tag === "circle" || tag === "ellipse") {
      const cx = number(a.cx, "cx"), cy = number(a.cy, "cy"), rx = number(a.r || a.rx, "rx"), ry = number(a.r || a.ry, "ry");
      if (rx <= 0 || ry <= 0) throw new Error("Empty SVG ellipse");
      inside = (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
    } else if (tag === "polygon") {
      const points = (a.points || "").trim().split(/\s+/).map(pair => pair.split(",").map(n => number(n, "point")));
      if (points.length < 3 || points.some(p => p.length !== 2)) throw new Error("Invalid polygon points");
      inside = (px, py) => {
        let hit = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i], [xj, yj] = points[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) hit = !hit;
        }
        return hit;
      };
    } else {
      const x1 = number(a.x1, "x1"), y1 = number(a.y1, "y1"), x2 = number(a.x2, "x2"), y2 = number(a.y2, "y2"), width = number(a["stroke-width"], "stroke-width");
      if (width <= 0) throw new Error("Invalid stroke width");
      inside = (px, py) => {
        const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy || 1)));
        return Math.hypot(px-(x1+t*dx), py-(y1+t*dy)) <= width/2;
      };
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (inside((x+.5)*32/size, (y+.5)*32/size)) pixels[y*size+x] = lookup.get(paint);
    }
  }
  if (pixels.filter(Boolean).length < size) throw new Error("Nearly blank authored sprite");
  return pixels;
}

function frameContract(kind) {
  if (kind === "infantry" || kind === "vehicle") return [
    {state:"idle",facings:8,phases:1}, {state:"move",facings:8,phases:3},
    {state:"attack",facings:8,phases:2}, {state:"damaged",facings:8,phases:2},
    {state:"destroyed",facings:1,phases:3}
  ];
  if (kind === "building") return [
    {state:"idle",facings:1,phases:2}, {state:"active",facings:1,phases:3},
    {state:"damaged",facings:1,phases:2}, {state:"critical",facings:1,phases:2},
    {state:"destroyed",facings:1,phases:3}
  ];
  if (kind === "resource") return ["rich","harvested","depleted"].map(state => ({state,facings:1,phases:1}));
  if (kind === "terrain") return ["normal","scorched"].map(state => ({state,facings:1,phases:1}));
  return [{state:"burst",facings:1,phases:6}];
}

function rotate(pixels, size, facing) {
  if (!facing) return pixels.slice();
  const result = new Array(size*size).fill(0), angle = facing*Math.PI/4,
    sin = Math.sin(angle), cos = Math.cos(angle), center = (size-1)/2;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const dx=x-center,dy=y-center,
      sx=Math.round(center+dx*cos-dy*sin),sy=Math.round(center+dx*sin+dy*cos);
    if (sx>=0&&sx<size&&sy>=0&&sy<size) result[y*size+x]=pixels[sy*size+sx];
  }
  return result;
}

function paintFrame(base, asset, spec, facing, phase, faction) {
  const n=asset.size, out=base.slice(), isUnit=["infantry","vehicle"].includes(asset.kind);
  if (isUnit && spec.state === "move") {
    const shift=phase-1, copy=out.slice(); out.fill(0);
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++)out[y*n+x]=copy[(y-shift)*n+x]||0;
  }
  if (isUnit && spec.state === "attack") {
    const tip=Math.round(n*.09), mid=Math.floor(n/2);
    out[tip*n+mid]=20;out[(tip+1)*n+mid]=phase?21:20;
    out[(tip+2)*n+mid-1]=20;out[(tip+2)*n+mid+1]=21;
  }
  if (spec.state === "active" || (spec.state === "idle" && phase)) {
    const highlight=faction ? faction.teamPalette[phase%2 ? 3 : 2] : 20;
    for(let i=0;i<3;i++)out[(Math.round(n*.25)+i)*n+Math.round(n*.24)]=highlight;
  }
  if (["damaged","critical","scorched"].includes(spec.state)) {
    for(let y=Math.round(n*.24);y<Math.round(n*.70);y++) {
      const x=Math.round(n*.44)+(y%3);
      if(out[y*n+x])out[y*n+x]=(y%4===0?21:1);
    }
    if(phase)out[Math.round(n*.20)*n+Math.round(n*.55)]=20;
  }
  if (spec.state === "harvested" || spec.state === "depleted") {
    const cutoff=spec.state==="harvested"?.40:.63;
    for(let y=0;y<n*cutoff;y++)for(let x=0;x<n;x++)out[y*n+x]=0;
  }
  if (spec.state === "destroyed") {
    const threshold=Math.round(n*(.40+phase*.15));
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const i=y*n+x;
      if(y<threshold||(x+y+phase)%7===0)out[i]=0;
      else if(out[i])out[i]=(x+y)%3===0?22:2;
    }
    out[(n-4)*n+Math.floor(n/2)]=phase%2?20:21;
  }
  if (asset.kind === "effect") {
    const scale=spec.state==="burst" ? (phase<3?.35+phase*.25:1.2-(phase-3)*.20) : 1;
    const copy=out.slice();out.fill(0);const center=(n-1)/2;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const sx=Math.round(center+(x-center)/scale),sy=Math.round(center+(y-center)/scale);
      if(sx>=0&&sx<n&&sy>=0&&sy<n&&!(phase>=4&&(x+y)%4===0))out[y*n+x]=copy[sy*n+sx];
    }
  }
  const pixels=isUnit?rotate(out,n,facing):out;
  return {width:n,height:n,pixels};
}

// Small dependency-free RGBA PNG writer. No canvas, ImageMagick or network
// dependency affects the output bytes, and CRCs are verified in tests.
const crcTable=Array.from({length:256},(_,n)=>{
  let c=n;for(let i=0;i<8;i++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);return c>>>0;
});
function pngChunk(type,data) {
  const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let checksum=0xFFFFFFFF;for(const b of Buffer.concat([name,data]))checksum=crcTable[(checksum^b)&255]^(checksum>>>8);
  crc.writeUInt32BE((checksum^0xFFFFFFFF)>>>0);
  return Buffer.concat([length,name,data,crc]);
}
function pngRGBA(width,height,rgba) {
  const raw=Buffer.alloc(height*(1+width*4));
  for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(raw,y*(1+width*4)+1);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a","hex"),pngChunk("IHDR",ihdr),pngChunk("IDAT",zlib.deflateSync(raw,{level:9})),pngChunk("IEND",Buffer.alloc(0))]);
}

function compile(src = readSources()) {
  const all = [], files = new Map(), pages = [];
  let current = null, x=1, y=1, rowHeight=0, frameTotal=0;
  function place(frame) {
    const size=frame.width;
    if(!current || x+size+1>ATLAS_SIZE && y+rowHeight+size+2>ATLAS_SIZE) {
      if(pages.length>=MAX_ATLASES)throw new Error("R05 atlas page budget exceeded");
      current={rgba:new Uint8Array(ATLAS_SIZE*ATLAS_SIZE*4)};pages.push(current);x=1;y=1;rowHeight=0;
    }
    if(x+size+1>ATLAS_SIZE){x=1;y+=rowHeight+1;rowHeight=0;}
    if(y+size+1>ATLAS_SIZE){
      if(pages.length>=MAX_ATLASES)throw new Error("R05 atlas page budget exceeded");
      current={rgba:new Uint8Array(ATLAS_SIZE*ATLAS_SIZE*4)};pages.push(current);x=1;y=1;rowHeight=0;
    }
    const rect={page:pages.length-1,x,y,w:size,h:size};
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const p=frame.pixels[py*size+px],rgba=(y+py)*ATLAS_SIZE*4+(x+px)*4;
      if(p){const color=src.palette.colors[p];for(let c=0;c<3;c++)current.rgba[rgba+c]=parseInt(color.slice(1+c*2,3+c*2),16);current.rgba[rgba+3]=255;}
    }
    x+=size+1;rowHeight=Math.max(rowHeight,size);return rect;
  }
  for(const asset of [...src.assets].sort((a,b)=>a.id<b.id?-1:1)) {
    const faction=src.teams.get(asset.faction),base=sourcePixels(asset.svg,asset.size,src.palette.colors);
    if(faction){
      const own=base.filter(p=>faction.teamPalette.includes(p)).length;
      const other=base.filter(p=>[...src.teams.values()].some(t=>t!==faction&&t.teamPalette.includes(p))).length;
      if(own<asset.size/4||other)throw new Error(`Incorrect team colors: ${asset.id}`);
    }
    const frames=[],states=[],atlas=[];
    for(const config of frameContract(asset.kind)){
      const state={...config,start:frames.length,count:config.facings*config.phases};states.push(state);
      for(let facing=0;facing<config.facings;facing++)for(let phase=0;phase<config.phases;phase++){
        const frame=paintFrame(base,asset,config,facing,phase,faction);
        if(frame.pixels.every(p=>!p))throw new Error(`Empty frame: ${asset.id}/${config.state}`);
        frames.push(frame);atlas.push(place(frame));
      }
    }
    frameTotal+=frames.length;
    const shp=encodeTacticalShape({frames}),parsed=decodeTacticalShape(shp);
    if(parsed.frames.length!==frames.length || frames.some((f,i)=>f.pixels.some((p,j)=>p!==parsed.frames[i].pixels[j])))
      throw new Error(`SHP roundtrip failed: ${asset.id}`);
    const filename=`shapes/${asset.id}.SHP`;
    files.set(filename,shp);
    all.push({id:asset.id,name:asset.name,faction:asset.faction,kind:asset.kind,role:asset.role,
      size:asset.size,footprint:asset.footprint,anchor:[Math.floor(asset.size/2),asset.size-4],
      source:asset.source,sourceSha256:asset.sourceSha256,license:src.roster.license,creator:src.roster.creator,
      shape:filename,states,atlas,frames:frames.length});
  }
  pages.forEach((page,i)=>files.set(`atlases/atlas-${i}.png`,pngRGBA(ATLAS_SIZE,ATLAS_SIZE,page.rgba)));
  files.set("R05.PAL",encodePalette(src.palette));
  files.set("gallery.html",fs.readFileSync(path.join(galleryDir,"r05-gallery.html")));
  files.set("gallery.js",fs.readFileSync(path.join(galleryDir,"r05-gallery.js")));
  const totalBytes=[...files.values()].reduce((n,b)=>n+b.length,0);
  if(totalBytes>SIZE_BUDGET)throw new Error(`R05 size budget exceeded: ${totalBytes} > ${SIZE_BUDGET}`);
  const inventory=[...files].sort(([a],[b])=>a<b?-1:1).map(([target,bytes])=>({target,bytes:bytes.length,sha256:sha(bytes)}));
  const manifest={schemaVersion:1,namespace:"r05",status:"visual-content-only; no simulation registry binding",
    gameplayCellPixels:src.roster.gameplayCellPixels,license:src.roster.license,creator:src.roster.creator,
    factions:src.roster.factions,palette:src.palette.colors,atlasSize:ATLAS_SIZE,
    budgets:{maxBytes:SIZE_BUDGET,actualBytes:totalBytes,maxPages:MAX_ATLASES,pages:pages.length,frames:frameTotal},
    assets:all,files:inventory,contentSha256:sha(Buffer.from(inventory.map(f=>`${f.target}:${f.sha256}`).join("\n")))};
  return {manifest,files};
}

function build(output) {
  const out=path.resolve(output);
  if(out===sourceDir || out.startsWith(sourceDir+path.sep) || sourceDir.startsWith(out+path.sep))
    throw new Error("Output overlaps source content directory");
  if(fs.existsSync(out))throw new Error(`Output already exists: ${out}`);
  const {manifest,files}=compile(); // all validation precedes filesystem writes
  fs.mkdirSync(out,{recursive:true});
  for(const [target,bytes] of files){
    const dest=path.join(out,target);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:"wx"});
  }
  fs.writeFileSync(path.join(out,"manifest.json"),json(manifest),{flag:"wx"});
  return manifest;
}

if(require.main===module){
  try {
    if(process.argv.length!==4 || process.argv[2]!=="build")throw new Error("Usage: node tools/content/r05.js build <new-output-directory>");
    const manifest=build(process.argv[3]);
    console.log(`PASS R05: ${manifest.assets.length} original assets, ${manifest.budgets.frames} frames, ${manifest.budgets.pages} atlases, ${manifest.budgets.actualBytes} bytes; SHA-256 ${manifest.contentSha256}`);
  } catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={readSources,sourcePixels,frameContract,paintFrame,pngRGBA,compile,build,SIZE_BUDGET};
