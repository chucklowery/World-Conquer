#!/usr/bin/env node
"use strict";

// Generate project-authored, license-clean wireframes for every type slot
// declared in the Tiberian Dawn engine. The catalog and SVGs are checked in;
// generated .SHP files belong in ignored build outputs.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {encodeTacticalShape, decodeTacticalShape} = require("./encode-shape");
const {encodePalette} = require("./encode-palette");
const {importFrames} = require("./png-to-frames");
const {representativePixels, factory, statePreviewSpecs} = require("./representative-animation");
const {draw: drawFirstPass, archetype: artArchetype} = require("./first-pass-art");

const root = path.resolve(__dirname, "../..");
const outputRoot = path.join(root, "game/content/wireframes");
const docsPath = path.join(root, "docs/browser/WIREFRAME_REPLACEMENT_CATALOG.md");
const configs = [
  {category: "vehicle", file: "udata.cpp", className: "UnitTypeClass", prefix: "UNIT_", size: 32, frames: 192},
  {category: "infantry", file: "idata.cpp", className: "InfantryTypeClass", prefix: "INFANTRY_", size: 24, frames: 640},
  {category: "aircraft", file: "aadata.cpp", className: "AircraftTypeClass", prefix: "AIRCRAFT_", size: 32, frames: 80},
  {category: "building", file: "bdata.cpp", className: "BuildingTypeClass", prefix: "STRUCT_", size: 48, frames: 128},
  {category: "terrain", file: "tdata.cpp", className: "TerrainTypeClass", prefix: "TERRAIN_", size: 32, frames: 32},
  {category: "projectile", file: "bbdata.cpp", className: "BulletTypeClass", prefix: "BULLET_", size: 16, frames: 32},
  {category: "overlay", file: "odata.cpp", className: "OverlayTypeClass", prefix: "OVERLAY_", size: 24, frames: 16},
  {category: "effect", file: "adata.cpp", className: "AnimTypeClass", prefix: "ANIM_", size: 32, frames: 128}
];
const requirements = {
  vehicle: "32 heading frames (0–31); turret or radar layers from frame 32 when applicable; ammo, movement, door and damage variations depend on class flags. For this placeholder the first 32 are directional; later frames are repeatable stand-ins.",
  infantry: "Animation frames must follow that class's DO control table (stand, eight-facing walk/fire, prone, death and optional gestures). The recorded frame count is derived from the DoControls table when possible; stand-ins are not choreographed.",
  aircraft: "32 body headings; additional flight, rotor, door and movement states per aircraft class. Keep the center point and shadow distinct and preserve transparent index 0.",
  building: "Base, production/active, damage, destruction and potentially turret/directional frames. Building footprints and anchors must match the map occupancy definition; the placeholder animation is schematic.",
  terrain: "Theater-dependent vegetation/rock silhouette, tile footprint, collision/selection footprint, burning/damage stages where applicable. Preserve ground contact and transparent pixels.",
  projectile: "Heading, flight, hit, explosion or intentionally invisible states per weapon code. Validate visibility requirements before replacing; not every bullet requires a drawn sprite.",
  overlay: "Road, wall, resource, decal or crate cells with neighbor-join and damage variants. These use the theater icon/overlay system: SVG preview is a design reference, not yet a verified tactical SHP replacement.",
  effect: "Timing, frame-start, frame-count, looping and transparency vary by animation type. Follow the AnimTypeClass sequence before finalizing; generated frames are visual stand-ins."
};
const paletteColors = ["#000000", "#172a36", "#277e68", "#45cba2", "#4e97c8", "#a1e7d3", "#d7a45b", "#f4e6bd"];
function cleanSource(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " ")); }
function infantryMinimum(source, block) {
  const name = block.match(/&([A-Za-z0-9_]+)\[0\]\[0\]/)?.[1];
  if (!name) return {frames: 640, table: null, audited: false};
  const tables = new RegExp(`int\\s+${name}\\[DO_COUNT\\]\\[3\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`);
  const body = source.match(tables)?.[1];
  if (!body) return {frames: 640, table: name, audited: false};
  const nums = (body.match(/-?\d+/g) || []).map(Number);
  if (nums.length % 3 !== 0) return {frames: 640, table: name, audited: false};
  let max = 1;
  for (let i = 0; i < nums.length; i += 3) {
    max = Math.max(max, nums[i] + nums[i + 1] + nums[i + 2] * 7);
  }
  return {frames: max, table: name, audited: true};
}
function inventory() {
  const result = [];
  for (const config of configs) {
    const cpp = `tiberiandawn/${config.file}`;
    const source = cleanSource(fs.readFileSync(path.join(root, cpp), "utf8"));
    const pattern = new RegExp(`(?:static\\s+)?${config.className}\\s+const\\s+(\\w+)\\s*\\(\\s*(${config.prefix}[A-Z0-9_]+)\\s*,([\\s\\S]*?)\\);`, "g");
    for (const match of source.matchAll(pattern)) {
      const engineSymbol = match[1], engineEnum = match[2], args = match[3];
      const sourceLine = source.slice(0, match.index).split("\n").length;
      const artName = args.match(/"([A-Za-z0-9_-]+)"/)?.[1]?.toUpperCase() || engineEnum.slice(config.prefix.length);
      const kind = engineEnum.slice(config.prefix.length).toLowerCase();
      const info = config.category === "infantry" ? infantryMinimum(source, args) : null;
      const width = config.size, height = config.size;
      const frames = info ? Math.max(1, info.frames) : config.frames;
      const previewOnly = config.category === "overlay";
      result.push({category: config.category, engineEnum, engineSymbol,
        source: cpp, sourceLine, artName, engineFilename: `${artName}.SHP`,
        role: kind.replace(/_/g, " "), width, height,
        provisionalFrameCount: frames, doTable: info?.table || null,
        frameCountFromDoTable: info?.audited || false,
        format: previewOnly ? "theater-overlay-unverified" : "tactical-keyframe",
        status: previewOnly ? "design-only" : "generated-tactical-placeholder"});
    }
  }
  result.sort((a, b) => a.category.localeCompare(b.category, "en") || a.engineEnum.localeCompare(b.engineEnum, "en"));
  const catalog=result.map((item, i) => ({id: `WF-${String(i + 1).padStart(4, "0")}`, ...item,
    preview: `previews/WF-${String(i + 1).padStart(4, "0")}.svg`,
    finalFrameDirectory: `final/WF-${String(i + 1).padStart(4, "0")}`}));
  const byFilename=new Map();
  for(const a of catalog)byFilename.set(a.engineFilename,[...(byFilename.get(a.engineFilename)||[]),a]);
  for(const a of catalog)a.sharedFilenameWith=byFilename.get(a.engineFilename).filter(b=>b.id!==a.id).map(b=>b.id);
  return catalog;
}

function paint(item, frame = 0) {
  const representative = representativePixels(item, frame);
  if (representative) return representative;
  return drawFirstPass(item,frame);
}
function renderSvg(item, frame = 0, overridePixels = null) {
  const pixels = overridePixels || paint(item, frame), w=item.width, h=item.height;
  const labelWidth=160, previewHeight=Math.max(h,48), fullWidth=w+labelWidth;
  const lines = [];
  for (let y=0;y<h;y++) for(let x=0;x<w;) {
    const c=pixels[y*w+x]; if(!c){x++;continue;}
    let run=1; while(x+run<w&&pixels[y*w+x+run]===c)run++;
    lines.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${paletteColors[c]}"/>`);x+=run;
  }
  const frameLabel=frame||overridePixels?`frame ${frame}`:`${item.provisionalFrameCount} frames`;
  const accessibility=frame||overridePixels?` frame ${frame}`:"";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullWidth} ${previewHeight}" width="${fullWidth*3}" height="${previewHeight*3}" shape-rendering="crispEdges" role="img" aria-label="${item.id} ${item.category} ${item.engineEnum} original wireframe${accessibility}"><rect width="${fullWidth}" height="${previewHeight}" fill="#101c25"/><rect width="${w}" height="${h}" fill="#172a36"/><rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" fill="none" stroke="#4e97c8" stroke-dasharray="2 2" stroke-width="0.5"/>${lines.join("")}<line x1="${w+5}" y1="0" x2="${w+5}" y2="${previewHeight}" stroke="#277e68" stroke-width="0.5"/><g font-family="monospace" fill="#a1e7d3"><text x="${w+10}" y="10" font-size="7">${item.id} / ${item.category.toUpperCase()}</text><text x="${w+10}" y="21" font-size="6.5" fill="#f4e6bd">${item.engineEnum}</text><text x="${w+10}" y="31" font-size="6">${item.engineFilename}</text><text x="${w+10}" y="41" font-size="5.5" fill="#4e97c8">${w}x${h} / ${frameLabel}</text></g></svg>\n`;
}
function renderDoc(catalog) {
  const categories = [...new Set(catalog.map(a=>a.category))];
  const audited = new Set(JSON.parse(fs.readFileSync(path.join(outputRoot,"representative-roster.json"),"utf8")).assets.map(a=>a.id));
  const rows = ["# World-Conquer: Original wireframe asset replacement catalog", "",
    "> Generated original placeholder art. No Electronic Arts media is included. `WF-####` identifiers stay stable only while the upstream enumeration and sorting remain unchanged; use `engineEnum` for persistent game mappings.", "",
    `This catalog contains **${catalog.length} independently linked asset slots** derived from Tiberian Dawn C++ class definitions. The preview is the generated placeholder's first frame.`, "",
    "The [original first-pass art gallery](ART_FIRST_PASS.md) groups all 295 slots into browsable category sheets and identifies remaining visual dependencies. The [state-aware representative animation milestone](REPRESENTATIVE_ANIMATION_MILESTONE.md) adds 23 linked state previews and separate `FACTMAKE.SHP` buildup instructions.", "",
    "## Replacement workflow", "",
    "1. Open an individual `WF-####` SVG below. It is a design guide, not a request to redraw copyrighted artwork.",
    "2. Create newly authored **palette-constrained pixel art** using the project-owned palette. Index `0` is transparent. Dimensions and frame counts here are **provisional build contracts** until each class's production frame lookup, footprint and anchor are audited against C++.",
    "3. Export one numbered 8-bit RGB/RGBA PNG per frame, starting `0000.png`, using exact palette colors. Use consistent dimensions, transparent alpha for index 0, no interpolation and no semitransparent pixels.",
    "4. Add `ATTRIBUTION.json` to that folder with `creator`, `license`, `source`, and `revision` (all nonempty strings). Run `node tools/content/wireframes.js build <new-output-dir>`. The builder automatically uses final PNGs instead of wireframes; it validates frame dimensions/count, palette colors and provenance.",
    "5. Verify generated SHA-256 and native LCW decode; then test actual class state sequences (facings, combat, movement, damage, construction, death) in Chromium and a native build.",
    "6. For terrain overlays, theater icons and other special formats, complete the format adapter before treating the art as runtime-compatible. `design-only` items are not yet game-ready.", "",
    "## Shared technical contract", "",
    "| Field | Requirement |", "|---|---|",
    "| Palette | 256 entries × RGB6, 768-byte `.PAL`; index 0 transparent; project-owned color definitions |",
    "| Tactical SHP | `KeyFrameHeaderType`, little-endian 8-byte frame table, LCW full-keyframes initially |",
    "| Canvas | The recorded width/height are generated-placeholder dimensions, **not verified original-game dimensions**. Fix dimensions and camera pivots after reviewing actual sprite lookup, weapon muzzle offsets and theater footprint. No resampling between states |",
    "| Facing | 32 heading directions for vehicles/aircraft; infantry uses its `DoControls`; buildings/terrain/effects follow state-specific offsets |",
    "| Replacements | New artwork and provenance, collision/hitbox and remap tests, frame timing, silhouette legibility at 1× |",
    "| Runtime | A generated SHP that parses is **not** enough: verify class-specific lookup and frame selections, including damage and special states |",
    "| Build outputs | `node tools/content/wireframes.js build <new-output-dir>`; output is generated, never committed as source media |",
    "| Per-slot audit gate | Before marking final: determine exact frame offsets and order, frame timing, selection bounds, rendered offset, image dimensions, turret/door/rotor layers, shadows, remap range, theater variation and native/browser parity from engine use sites. Record verified changes in the catalog generator |", ""];
  rows.push("### Engine filename conflicts", "", "Some engine classes share the same resource filename (for example a building and an overlay). The build emits an individual categorized SHP for each item but copies **only unambiguous filenames** into `game-root/`. Shared-filename items must be reconciled into one final resource and tested against every referencing class; do not blindly overwrite one with another.", "");
  for (const category of categories) {
    const items=catalog.filter(a=>a.category===category);
    rows.push(`## ${category[0].toUpperCase()+category.slice(1)} (${items.length})`, "", requirements[category], "");
    for(const a of items){
      const pathToSvg = `../../game/content/wireframes/${a.preview}`;
      rows.push(`- [ ] **${a.id} — ${a.role}** · [View placeholder](${pathToSvg})${audited.has(a.id)?` · [Source-audited frame contract](REPRESENTATIVE_FRAME_CONTRACTS.md#${a.id.toLowerCase()})`:""} · engine slot \`${a.engineEnum}\` ([\`${a.source}:${a.sourceLine}\`](../../${a.source}#L${a.sourceLine}), \`${a.engineSymbol}\`).`,
        `  - **Engine target:** \`${a.engineFilename}\`. **Placeholder contract (provisional):** ${a.width}×${a.height} indexed pixels, ${a.provisionalFrameCount} generated frames (${a.frameCountFromDoTable ? `minimum calculated from ${a.doTable}` : "provisional allocation; verify exact frame use"}); format \`${a.format}\`.`,
        `  - **Final art input:** \`game/content/wireframes/${a.finalFrameDirectory}/0000.png\` through \`${String(a.provisionalFrameCount-1).padStart(4,"0")}.png\` (ordered RGBA PNGs), plus \`ATTRIBUTION.json\` documenting creator/license/source/revision.`,
        `  - **Replace:** Produce unique silhouettes and animations, preserve transparency (palette index 0), match ${category} state rules above, and document rights/source. Do not assume the placeholder animation matches gameplay state semantics.${a.sharedFilenameWith.length?` **Shared engine filename:** coordinate replacement with ${a.sharedFilenameWith.join(", ")}.`:""}`,
        `  - **Acceptance:** Confirm exact engine-consumed frame offsets and dimensions against the linked constructor and class render path; test 1× readability, every referenced heading/stage, damage states, remaps, offsets, shadow/selection alignment and native/browser parity. Status: **${a.status}**.`, "");
    }
  }
  rows.push("## Separate global dependencies still required", "", "These class entries do not enumerate menus, all tile templates, fonts, complete theater icon sets, missions, UI skin, music, voice lines, audio, particles, or hardcoded special assets (such as `MOUSE.SHP`, `WAKE.SHP`, and `SHADOW.SHP`). Those require distinct manifests and integration work before a wholly standalone game can boot.", "");
  return rows.join("\n");
}
function renderSheet(category,assets) {
  const columns=8, tileW=126, tileH=87, rows=Math.ceil(assets.length/columns),
    width=columns*tileW, height=rows*tileH+28;
  const elements=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="World-Conquer ${category} first-pass art gallery" shape-rendering="crispEdges">`,
    `<rect width="${width}" height="${height}" fill="#101c25"/>`,
    `<text x="10" y="19" font-family="monospace" fill="#f4e6bd" font-size="14">${category.toUpperCase()} — ${assets.length} PROJECT-OWNED CONCEPTS</text>`];
  for(const [index,a] of assets.entries()){
    const ox=(index%columns)*tileW,oy=Math.floor(index/columns)*tileH+28,
      scale=48/Math.max(a.width,a.height),pixels=paint(a);
    elements.push(`<rect x="${ox+2}" y="${oy+2}" width="${tileW-4}" height="${tileH-4}" fill="#172a36" stroke="#277e68" stroke-width="0.5"/>`,
      `<g transform="translate(${ox+9} ${oy+7}) scale(${scale})">`);
    for(let y=0;y<a.height;y++)for(let x=0;x<a.width;){
      const c=pixels[y*a.width+x];if(!c){x++;continue;}
      let n=1;while(x+n<a.width&&pixels[y*a.width+x+n]===c)n++;
      elements.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${paletteColors[c]}"/>`);x+=n;
    }
    elements.push(`</g><g font-family="monospace" font-size="9" fill="#a1e7d3"><text x="${ox+9}" y="${oy+67}">${a.id}</text><text x="${ox+9}" y="${oy+78}" fill="#f4e6bd">${a.engineEnum.split("_").slice(1).join("_").slice(0,18)}</text></g>`);
  }
  elements.push("</svg>\n");return elements.join("");
}
function generateFirstPass(catalog) {
  const sheets=path.join(outputRoot,"sheets");fs.mkdirSync(sheets,{recursive:true});
  const groups=[...new Set(catalog.map(a=>a.category))];
  for(const category of groups){
    const entries=catalog.filter(a=>a.category===category);
    fs.writeFileSync(path.join(sheets,`${category}.svg`),renderSheet(category,entries));
  }
  const roster=new Set(JSON.parse(fs.readFileSync(path.join(outputRoot,"representative-roster.json"),"utf8")).assets.map(a=>a.id));
  const assets=catalog.map(a=>({id:a.id,engineEnum:a.engineEnum,category:a.category,
    engineFilename:a.engineFilename,archetype:artArchetype(a),
    coverage:roster.has(a.id)?"source-audited-state-preview":"schematic-first-pass",
    runtimeStatus:a.status,preview:a.preview,sheet:`sheets/${a.category}.svg`,
    provisionalFrames:a.provisionalFrameCount,canvas:[a.width,a.height],
    firstFrameSha256:crypto.createHash("sha256").update(Buffer.from(paint(a))).digest("hex")}));
  fs.writeFileSync(path.join(outputRoot,"first-pass-manifest.json"),JSON.stringify({schemaVersion:1,
    status:"original procedural first-pass; not final approved artwork",rights:"project-owned CC0-1.0 procedural generation",
    total:catalog.length,packable:catalog.filter(a=>a.status!=="design-only").length,
    designOnly:catalog.filter(a=>a.status==="design-only").length,
    supplemental:["FACTMAKE.SHP"],assets},null,2)+"\n");
}
function generate() {
  const catalog=inventory();
  fs.mkdirSync(path.join(outputRoot,"previews"),{recursive:true});
  for(const a of catalog)fs.writeFileSync(path.join(outputRoot,a.preview),renderSvg(a));
  fs.mkdirSync(path.join(outputRoot,"states"),{recursive:true});
  for(const spec of statePreviewSpecs){
    const original=catalog.find(a=>a.id===spec.id);
    const asset=spec.supplemental?{...original,engineFilename:"FACTMAKE.SHP",provisionalFrameCount:24}:original;
    const pixels=spec.supplemental?factory(spec.frame,true,24):null;
    fs.writeFileSync(path.join(outputRoot,"states",`${spec.id}-${spec.name}.svg`),
      renderSvg(asset,spec.frame,pixels));
  }
  fs.writeFileSync(path.join(outputRoot,"catalog.json"),JSON.stringify({schemaVersion:1,generatedFrom:"tiberiandawn/*data.cpp",assets:catalog},null,2)+"\n");
  generateFirstPass(catalog);
  fs.writeFileSync(docsPath,renderDoc(catalog));
  console.log(`Generated ${catalog.length} first-pass concept previews, 8 contact sheets and replacement entries`);
}
function representativeRoster() {
  const roster=JSON.parse(fs.readFileSync(path.join(outputRoot,"representative-roster.json"),"utf8"));
  if(roster.schemaVersion!==1||!Array.isArray(roster.assets)||roster.assets.length!==6)throw new Error("Invalid representative roster");
  const catalog=inventory();
  const ids=new Set();
  for(const expected of roster.assets){
    const found=catalog.find(a=>a.id===expected.id);
    if(!found||ids.has(expected.id)||found.status==="design-only"||found.sharedFilenameWith.length||
        ["category","engineEnum","engineFilename"].some(field=>found[field]!==expected[field])){
      throw new Error(`Invalid or conflicting representative entry ${expected.id}`);
    }
    ids.add(expected.id);
  }
  return roster.assets;
}
function build(destination, selectedIds) {
  const dir=path.resolve(destination);
  if(fs.existsSync(dir))throw new Error(`Output already exists: ${dir}`);
  const catalog=JSON.parse(fs.readFileSync(path.join(outputRoot,"catalog.json"),"utf8")).assets;
  const only=selectedIds===undefined?null:new Set(selectedIds);
  if(only&&(only.size!==selectedIds.length||only.size===0||[...only].some(id=>!catalog.some(a=>a.id===id&&a.status!=="design-only")))){
    throw new Error("Invalid or duplicate selected asset ID");
  }
  let auditedRoster=null;
  if(only){
    const roster=representativeRoster();
    if(roster.length===only.size&&roster.every(a=>only.has(a.id))){
      const computed=require("./representative-contracts").buildContracts();
      const stored=JSON.parse(fs.readFileSync(path.join(outputRoot,"representative-contracts.json"),"utf8"));
      if(JSON.stringify(computed)!==JSON.stringify(stored))throw new Error("Representative frame contracts are stale; regenerate and review them");
      auditedRoster={roster,contracts:computed};
    }
  }
  const entries=[];
  fs.mkdirSync(path.join(dir,"files"),{recursive:true});
  fs.mkdirSync(path.join(dir,"game-root"),{recursive:true});
  const sourcePal=JSON.parse(fs.readFileSync(path.join(root,"game/content/source/placeholder.palette.json"),"utf8"));
  const paletteSource=path.join(root,"game/content/source/placeholder.palette.json");
  const palette=encodePalette(sourcePal);
  fs.writeFileSync(path.join(dir,"files/WIREFRAME.PAL"),palette);
  fs.writeFileSync(path.join(dir,"game-root/WIREFRAME.PAL"),palette);
  entries.push({id:"palette.wireframe",target:"WIREFRAME.PAL",bytes:palette.length,sha256:crypto.createHash("sha256").update(palette).digest("hex")});
  for(const a of catalog){
    if(only&&!only.has(a.id))continue;
    const finalDir=path.join(outputRoot,a.finalFrameDirectory);
    if(a.status==="design-only"){
      if(fs.existsSync(finalDir))throw new Error(`${a.id} requires a non-SHP format adapter before final art can be packaged`);
      continue;
    }
    let frames, provenance;
    if(fs.existsSync(finalDir)){
      provenance=JSON.parse(fs.readFileSync(path.join(finalDir,"ATTRIBUTION.json"),"utf8"));
      for(const field of ["creator","license","source","revision"]){
        if(typeof provenance[field]!=="string"||!provenance[field].trim())throw new Error(`${a.id}: missing ${field} in attribution`);
      }
      frames=importFrames(finalDir,paletteSource).frames;
      if(frames.length!==a.provisionalFrameCount || frames.some(f=>f.width!==a.width||f.height!==a.height)){
        throw new Error(`${a.id}: final art must have exactly ${a.provisionalFrameCount} frames at ${a.width}x${a.height}`);
      }
    }else{
      frames=[];
      for(let i=0;i<a.provisionalFrameCount;i++)frames.push({width:a.width,height:a.height,pixels:paint(a,i)});
      provenance={creator:"World-Conquer project",license:"CC0-1.0",source:"procedural wireframe",revision:"1"};
    }
    const bytes=encodeTacticalShape({frames});
    const relative=`${a.category}/${a.id}.SHP`;
    const file=path.join(dir,"files",relative);
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
    if(a.sharedFilenameWith.length===0)fs.writeFileSync(path.join(dir,"game-root",a.engineFilename),bytes);
    // A basic decoder sanity check is cheap and catches package corruption.
    const decoded=decodeTacticalShape(bytes);
    if(decoded.frames.length!==frames.length)throw new Error(`Frame mismatch for ${a.id}`);
    entries.push({id:a.id,engineEnum:a.engineEnum,engineFilename:a.engineFilename,target:relative,
      mountReady:a.sharedFilenameWith.length===0,sharedFilenameWith:a.sharedFilenameWith,
      status:fs.existsSync(finalDir)?"final-art":"wireframe",provenance,
      frames:frames.length,width:a.width,height:a.height,bytes:bytes.length,
      sha256:crypto.createHash("sha256").update(bytes).digest("hex")});
  }
  // The engine loads <building name>MAKE.SHP for construction, independently
  // from FACT.SHP. A complete representative diagnostic must mount both.
  const spec=JSON.parse(fs.readFileSync(path.join(outputRoot,"supplemental-resources.json"),"utf8"));
  if(spec.schemaVersion!==1||spec.id!=="supplemental.fact-buildup"||spec.engineFilename!=="FACTMAKE.SHP"||
      spec.width!==48||spec.height!==48||spec.frames!==24||spec.supportingFor!=="WF-0013"){
    throw new Error("Invalid FACTMAKE supplementary resource contract");
  }
  if(!only||only.has(spec.supportingFor)){
    const finalDir=path.join(outputRoot,spec.finalFrameDirectory);
    let frames,provenance;
    if(fs.existsSync(finalDir)){
      provenance=JSON.parse(fs.readFileSync(path.join(finalDir,"ATTRIBUTION.json"),"utf8"));
      for(const field of ["creator","license","source","revision"]){
        if(typeof provenance[field]!=="string"||!provenance[field].trim())throw new Error(`FACTMAKE: missing ${field} in attribution`);
      }
      frames=importFrames(finalDir,paletteSource).frames;
      if(frames.length!==spec.frames||frames.some(f=>f.width!==spec.width||f.height!==spec.height)){
        throw new Error(`FACTMAKE: final art must have exactly ${spec.frames} frames at ${spec.width}x${spec.height}`);
      }
    }else{
      frames=Array.from({length:spec.frames},(_,frame)=>({width:spec.width,height:spec.height,pixels:factory(frame,true,spec.frames)}));
      provenance={creator:"World-Conquer project",license:"CC0-1.0",source:"procedural buildup animation",revision:"1"};
    }
    const bytes=encodeTacticalShape({frames}), relative="building/FACTMAKE.SHP";
    fs.writeFileSync(path.join(dir,"files",relative),bytes);
    fs.writeFileSync(path.join(dir,"game-root",spec.engineFilename),bytes);
    if(decodeTacticalShape(bytes).frames.length!==spec.frames)throw new Error("FACTMAKE decode frame mismatch");
    entries.push({id:spec.id,supportingFor:spec.supportingFor,engineFilename:spec.engineFilename,
      target:relative,mountReady:true,sharedFilenameWith:[],status:fs.existsSync(finalDir)?"final-art":"wireframe",
      provenance,frames:spec.frames,width:spec.width,height:spec.height,bytes:bytes.length,
      sha256:crypto.createHash("sha256").update(bytes).digest("hex")});
  }
  fs.writeFileSync(path.join(dir,"manifest.json"),JSON.stringify({schemaVersion:1,gameId:"world-conquer-wireframes",assets:entries},null,2)+"\n");
  if(auditedRoster){
    fs.writeFileSync(path.join(dir,"roster.json"),JSON.stringify({schemaVersion:1,assets:auditedRoster.roster},null,2)+"\n");
    fs.writeFileSync(path.join(dir,"contracts.json"),JSON.stringify(auditedRoster.contracts,null,2)+"\n");
  }
  console.log(`Built ${entries.length-1} tactical shape resources${only?" (selected smoke-test roster plus buildup)":" (excluding design-only overlays)"}`);
}
if(require.main===module){
  try{if(process.argv[2]==="generate")generate();
    else if(process.argv[2]==="build"&&process.argv[3]&&(process.argv.length===4||process.argv.length===5&&process.argv[4]==="--representative")){
      build(process.argv[3],process.argv[4]==="--representative"?representativeRoster().map(a=>a.id):undefined);
    }else throw new Error("Usage: node tools/content/wireframes.js generate | build <new-output-directory> [--representative]");
  }catch(err){console.error(err.stack||err);process.exitCode=1;}
}
module.exports={inventory,paint,renderSvg,generate,build,representativeRoster};
