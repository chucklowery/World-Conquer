#!/usr/bin/env node
"use strict";

// Source-anchored frame-index inventory for the six-class browser roster.
// These are engine lookup rules, not approval of the procedural animations.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const base = path.join(root, "game/content/wireframes");
const jsonPath = path.join(base, "representative-contracts.json");
const docPath = path.join(root, "docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
function reference(file, exact) {
  const content = read(file), index = content.indexOf(exact);
  if (index < 0) throw new Error(`Engine frame rule changed: ${file}: ${exact}`);
  return {source: file, line: content.slice(0, index).split("\n").length, evidence: exact};
}
function infantryStates() {
  const enumSource = read("tiberiandawn/defines.h");
  const enumBody = enumSource.match(/typedef enum DoType[\s\S]*?DO_NOTHING = -1,([\s\S]*?)DO_COUNT,/);
  assert(enumBody, "DoType enumeration missing");
  const names = [...enumBody[1].matchAll(/^\s*(DO_[A-Z0-9_]+)(?:\s*=\s*\d+)?\s*,/gm)].map(m => m[1]);
  const source = read("tiberiandawn/idata.cpp");
  const tableBody = source.match(/int\s+MiniGunnerDos\[DO_COUNT\]\[3\]\s*=\s*\{([\s\S]*?)\};/);
  assert(tableBody, "Minigunner choreography table missing");
  const rows = [...tableBody[1].matchAll(/^\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\s*,?\s*\/\/\s*(DO_[A-Z0-9_]+)/gm)];
  assert.equal(rows.length, names.length, "Minigunner table and DoType count differ");
  const states = rows.map((m, i) => {
    const [start, count, facingStride] = m.slice(1, 4).map(Number);
    assert.equal(m[4], names[i], `DoType order mismatch at ${i}`);
    assert(start >= 0 && count >= 0 && facingStride >= 0, `Invalid action ${m[4]}`);
    return {action: m[4], start, count, facingStride, facings: facingStride ? 8 : 1,
      lastFrame: count ? start + (facingStride ? 7 * facingStride : 0) + count - 1 : null};
  });
  return states;
}
function buildContracts() {
  const catalog = JSON.parse(fs.readFileSync(path.join(base, "catalog.json"), "utf8")).assets;
  const roster = JSON.parse(fs.readFileSync(path.join(base, "representative-roster.json"), "utf8")).assets;
  const e1States = infantryStates();
  const requiredE1 = 1 + Math.max(...e1States.map(s => s.lastFrame ?? 0));
  const files = {
    "WF-0185": {confidence: "frame-index-audited", minimumFrames: requiredE1, diagnosticActionFrame:64,
      probes: [0, 16, 64, 192, 418, 531],
      renderSources: [reference("tiberiandawn/idata.cpp", "int MiniGunnerDos[DO_COUNT][3]"),
        reference("tiberiandawn/infantry.cpp", "shapenum += facenum * Class->DoControls[doit].Jump;")],
      stateRules: e1States,
      dependencies: [],
      remaining: ["Create real animation art for all enabled DO actions and eight-facing sequences", "Verify body pivot, muzzle/impact offsets and shadow in gameplay"]},
    "WF-0289": {confidence: "frame-index-audited", minimumFrames: 64, diagnosticActionFrame:32,
      probes: [0, 31, 32, 63],
      renderSources: [reference("tiberiandawn/udata.cpp", "static UnitTypeClass const UnitMTank(UNIT_MTANK"),
        reference("tiberiandawn/unit.cpp", "shapenum = TechnoClass::BodyShape[tfacing] + 32;")],
      stateRules: [{action: "body 32 headings", start: 0, count: 32, lastFrame: 31},
        {action: "turret 32 headings", start: 32, count: 32, lastFrame: 63}],
      dependencies: [],
      remaining: ["Make body and turret distinct compositing layers in the shared SHP", "Verify turret pivot, recoil, damage and remap pixels"]},
    "WF-0004": {confidence: "frame-index-audited", minimumFrames: 64, diagnosticActionFrame:32,
      probes: [0, 31, 32, 63],
      renderSources: [reference("tiberiandawn/aadata.cpp", "OrcaHeli(AIRCRAFT_ORCA"),
        reference("tiberiandawn/aircraft.cpp", "if (*this == AIRCRAFT_ORCA && Get_Speed() >= MPH_MEDIUM_FAST)")],
      stateRules: [{action: "normal 32 headings", start: 0, count: 32, lastFrame: 31},
        {action: "high-speed 32 headings", start: 32, count: 32, lastFrame: 63}],
      dependencies: [],
      remaining: ["Verify conditional door-state frame selection and aircraft shadow", "Check altitude, orientation, muzzle and rotors at native tactical scale"]},
    "WF-0013": {confidence: "partial", minimumFrames: 1, diagnosticActionFrame:0, probes: [0],
      renderSources: [reference("tiberiandawn/bdata.cpp", "ClassConst(STRUCT_CONST"),
        reference("tiberiandawn/building.cpp", "shapefile = Class->Get_Buildup_Data();"),
        reference("tiberiandawn/bdata.cpp", "sprintf(buffer, \"%sMAKE\", building.IniName);")],
      stateRules: [{action: "normal building state", start: 0, count: null, lastFrame: null}],
      dependencies: ["FACTMAKE.SHP"],
      remaining: ["Inventory BState frame starts, frame counts and rates", "Author separate FACTMAKE construction/deconstruction SHP", "Verify 3×2 foundation occupancy and bib/selection offsets"]},
    "WF-0256": {confidence: "partial", minimumFrames: 2, diagnosticActionFrame:1, probes: [0, 1],
      renderSources: [reference("tiberiandawn/tdata.cpp", "Tree1Class(TERRAIN_TREE1"),
        reference("tiberiandawn/terrain.cpp", "if (IsCrumbling || Class->IsTransformable)"),
        reference("tiberiandawn/terrain.cpp", "if (Strength < 2)")],
      stateRules: [{action: "normal", start: 0, count: 1, lastFrame: 0},
        {action: "near-destruction", start: 1, count: 1, lastFrame: 1},
        {action: "crumbling stage", start: null, count: null, lastFrame: null}],
      dependencies: ["theater palette and SHP variant"],
      remaining: ["Map all crumbling frames and stage rate", "Verify winter/temperate variants and cell footprint and base offset"]},
    "WF-0072": {confidence: "partial", minimumFrames: 1, diagnosticActionFrame:0, probes: [0],
      renderSources: [reference("tiberiandawn/adata.cpp", "ArtExp1(ANIM_ART_EXP1"),
        reference("tiberiandawn/anim.cpp", "int shapenum = Class->Start + Fetch_Stage();")],
      stateRules: [{action: "animation start + dynamic stage", start: 0, count: null, lastFrame: null}],
      dependencies: ["VOC_XPLOSML2 sound asset"],
      remaining: ["ArtExp1 declares Stages=-1 so runtime derives count from SHP; choose authored effect length intentionally", "Verify frame rate, one-shot disposal, crater and sound timing"]}
  };
  assert.equal(roster.length, Object.keys(files).length);
  const contracts = roster.map(a => {
    const asset = catalog.find(c => c.id === a.id);
    const spec = files[a.id];
    if (!asset || !spec || asset.engineFilename !== a.engineFilename || asset.category !== a.category ||
        spec.minimumFrames > asset.provisionalFrameCount || spec.probes.some(p => p >= asset.provisionalFrameCount)) {
      throw new Error(`Unmet frame contract ${a.id}`);
    }
    return {id:a.id, engineEnum:a.engineEnum, engineFilename:a.engineFilename, category:a.category,
      placeholderFrames:asset.provisionalFrameCount, placeholderCanvas:[asset.width,asset.height], ...spec};
  });
  return {schemaVersion:1, meaning:"C++-observed index requirements; final art layouts still need review", assets:contracts};
}
function renderDoc(doc) {
  const lines = ["# Six-class tactical frame contracts", "",
    "These are source-audited rendering rules for the [representative roster](../../game/content/wireframes/representative-roster.json), not finished animation specifications. Frame counts and dimensions for generated wireframes remain provisional. Each asset's source lines and uncertain conditions are recorded below.", "",
    "| Slot | Resource | Frame minimum | Placeholder frames | Confidence |", "|---|---|---:|---:|---|"];
  for(const a of doc.assets)lines.push(`| [${a.id}](#${a.id.toLowerCase()}) | \`${a.engineFilename}\` | ${a.minimumFrames} | ${a.placeholderFrames} | ${a.confidence} |`);
  for(const a of doc.assets){
    lines.push("",`## ${a.id}`,"",`**Engine enum:** \`${a.engineEnum}\` · **Canvas:** ${a.placeholderCanvas.join("×")} (provisional) · **Diagnostic frame probes:** ${a.probes.join(", ")}. **Browser action frame:** ${a.diagnosticActionFrame}.`,"",
      "**Source evidence:**", "");
    for(const ref of a.renderSources)lines.push(`- [\`${ref.source}:${ref.line}\`](../../${ref.source}#L${ref.line}) — \`${ref.evidence}\``);
    lines.push("", "**Frame indexing rules:**", "", "| Action | Start | Frames/action | Facing stride | Last frame |", "|---|---:|---:|---:|---:|");
    for(const s of a.stateRules)lines.push(`| \`${s.action}\` | ${s.start??"dynamic"} | ${s.count??"dynamic"} | ${s.facingStride??"—"} | ${s.lastFrame??"dynamic/unused"} |`);
    lines.push("",`**Separate dependencies:** ${a.dependencies.length?a.dependencies.map(v=>`\`${v}\``).join(", "):"None identified in this pass"}.`,"", "**Still required before final art sign-off:**", "");
    for(const next of a.remaining)lines.push(`- [ ] ${next}`);
  }
  lines.push("", "Validation: run `node tools/content/test-representative-contracts.js` and build with `--representative`; these checks reject truncated frame sets but cannot certify art direction, true frame timing, supplementary resources or mission startup.","");
  return lines.join("\n");
}
function generate() {
  const result=buildContracts();
  fs.writeFileSync(jsonPath,JSON.stringify(result,null,2)+"\n");
  fs.writeFileSync(docPath,renderDoc(result));
  console.log(`Generated indexed frame contracts for ${result.assets.length} representative assets`);
}
if(require.main===module){
  try{if(process.argv[2]==="generate")generate();else throw Error("Usage: node tools/content/representative-contracts.js generate");}
  catch(err){console.error(err.stack||err);process.exitCode=1;}
}
module.exports={buildContracts,renderDoc,generate};
