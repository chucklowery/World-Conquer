#!/usr/bin/env node
"use strict";
// Deterministic, source-owned boot placeholders. Generated data must not be committed.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),cp=require("node:child_process");
const {encodePalette}=require("./encode-palette.js");
const {encodeShape}=require("./encode-shape.js");
const {encodeFont,verifyFont}=require("./encode-font.js");
const {TITLE_BACKGROUND}=require("./boot-colors.js");
const {encodeCPS,decodeCPS}=require("./encode-cps.js");
const {encodePCX,verifyPCX}=require("./encode-pcx.js");
const {rgbPalette,toHex}=require("./boot-colors.js");
const ROOT=path.resolve(__dirname,"../..");
const REQUIREMENTS=path.join(ROOT,"game/content/pack/boot-requirements.json");
// Generate a placeholder for every stock TXT_* index from compiled headers,
// not from proprietary language files. All human-facing words are original.
// Glyph colour index per font file. Plain fonts use 1 (the engine swaps in
// the text colour). The engine colours gradient fonts through fixed tables:
// - 12GRNGRD and 12GREEN: tab labels use _textfontpal row 11 (dialog.cpp),
//   which fills entries 1-5, and the score screen's palettes fill 2-8 but
//   print with a transparent colour 1 (score.cpp). Entry 4 is in both.
// - GRAD6FNT and SCOREFNT: dialog gradient rows fill 1 and 11-15; plain
//   gradient text fills 4-15. Entry 14 is in both.
const FONT_INK={"12GRNGRD.FNT":4,"12GREEN.FNT":4,"GRAD6FNT.FNT":14,"SCOREFNT.FNT":14};
const LABELS={
  TXT_NONE:"",
  TXT_CREDIT_FORMAT:"Credits: %d",
  TXT_START_NEW_GAME:"New Game",
  TXT_LOAD_MISSION:"Load Game",
  TXT_SAVE_MISSION:"Save Game",
  TXT_MULTIPLAYER_GAME:"Multiplayer",
  TXT_INTRO:"Replay Intro",
  TXT_JUST_INTRO:"Replay Intro",
  TXT_EXIT_GAME:"Exit",
  TXT_NEW_MISSIONS:"Extra Missions",
  TXT_BONUS_MISSIONS:"Extra Missions",
  TXT_OK:"OK",
  TXT_CANCEL:"Cancel",
  TXT_YES:"Yes",
  TXT_NO:"No",
  TXT_GDI:"Aster",
  TXT_NOD:"Forge",
  // UI-C: player-visible messages and labels in the COMMS voice: short,
  // clipped, original. Format specifiers match the engine's sprintf calls
  // (house.cpp:2144,2181,4117; event.cpp:430; conquer.cpp:1312).
  TXT_PLAYER_DEFEATED:"%s eliminated.",
  TXT_HAS_ALLIED:"%s allied with %s.",
  TXT_AT_WAR:"%s hostile to %s.",
  TXT_SPECIAL_WARNING:"%s changed rules.",
  TXT_FROM:"%s: %s",
  TXT_FROM_COMPUTER:"Intercept:",
  TXT_COMP_MSG1:"Perimeter breached.",TXT_COMP_MSG2:"We have your signal.",TXT_COMP_MSG3:"Grid failing.",
  TXT_COMP_MSG4:"Hold if you can.",TXT_COMP_MSG5:"Next wave inbound.",TXT_COMP_MSG6:"Your harvest is ours.",
  TXT_COMP_MSG7:"Recalculating.",TXT_COMP_MSG8:"Stand down.",TXT_COMP_MSG9:"Nothing escapes the net.",
  TXT_COMP_MSG10:"Too slow.",TXT_COMP_MSG11:"Lights out soon.",TXT_COMP_MSG12:"Run the numbers.",
  TXT_COMP_MSG13:"Signal jammed.",
  TXT_LOW_POWER:"Power low.",
  TXT_INSUFFICIENT_FUNDS:"Funds short.",
  TXT_BUILD_DEST:"Structure lost.",
  TXT_UNIT_DEST:"Unit lost.",
  TXT_QUEUE_FULL:"Queue full.",
  TXT_READY:"Ready",
  TXT_HOLDING:"Hold",
  TXT_YOU:"You",
  TXT_ENEMY:"Hostile",
  TXT_COMPUTER:"Computer",
  TXT_UNKNOWN:"Unknown",
  TXT_NAME_COLON:"Name:",
  TXT_KILLS_COLON:"Kills:",
  TXT_POWER_OUTPUT:"Power output",
  TXT_POWER_OUTPUT_LOW:"Power output low",
  TXT_SIDE_COLON:"Side:",
  TXT_COLOR_COLON:"Colour:",
  TXT_SCENARIO_COLON:"Map:",
  TXT_START_CREDITS_COLON:"Credits:",
  TXT_BASES_COLON:"Bases:",
  TXT_TIBERIUM_COLON:"Crystal:",
  TXT_CRATES_COLON:"Crates:",
  TXT_AI_PLAYERS_COLON:"AI players:",
  TXT_REPAIR:"Repair",TXT_SELL:"Sell",TXT_MAP:"Map",
  // Side names in the skirmish dialog (nulldlg.cpp:348-349).
  TXT_G_D_I:"Aster",
  TXT_N_O_D:"Forge",
  // Original display names instead of franchise-specific ones.
  TXT_RAMBO:"Commando",
  TXT_ORCA:"Gunship",
  TXT_COMMAND:"Comms Center",
  TXT_OBELISK:"Beam Tower",
  TXT_HAND:"Training Hall",
  TXT_TEMPLE:"Citadel",
  TXT_ION_CANNON:"Orbital Strike",
  TXT_NUKE_STRIKE:"Warhead Strike",
  TXT_MOEBIUS:"Scientist",
  // Readable names for the M2 playable slice.
  TXT_E1:"Rifle Squad",
  TXT_E2:"Grenadier",
  TXT_E3:"Rocket Squad",
  TXT_E4:"Flamer",
  TXT_E5:"Hazmat Trooper",
  TXT_MCV:"Mobile Base",
  TXT_ARTY:"Artillery",
  TXT_MSAM:"Rocket Launcher",
  TXT_APC:"Carrier",
  TXT_POWER:"Power Plant",
  TXT_ADVANCED_POWER:"Advanced Power",
  TXT_FIX_IT:"Repair Bay",
  TXT_CONST_YARD:"Construction Yard",
  TXT_CHOOSE_SIDE:"Choose a Faction",
  TXT_OPTIONS:"Options",
  TXT_GAME_CONTROLS:"Controls",
  TXT_SOUND_CONTROLS:"Audio",
  TXT_VISUAL_CONTROLS:"Video",
  TXT_QUIT_MISSION:"Quit Mission",
  TXT_RESUME_MISSION:"Resume Mission",
  TXT_FAME:"Records",
  TXT_SCENARIO_WON:"Victory",
  TXT_SCENARIO_LOST:"Defeat",
  TXT_TIBERIUM:"Crystal",
  TXT_TIBERIUM_ON:"Crystal On",
  TXT_TIBERIUM_OFF:"Crystal Off",
  // Top tabs (tab.cpp:116-117).
  TXT_TAB_BUTTON_CONTROLS:"Options",
  TXT_TAB_SIDEBAR:"Sidebar",
  // End-of-match score screen prompt (score.cpp Multi_Score_Presentation).
  TXT_MAP_CLICK2:"Continue",
  // Original display names for every object in the type tables
  // (bdata.cpp, udata.cpp, idata.cpp, adata.cpp), both factions.
  TXT_EYE:"Uplink Center",
  TXT_WEAPON_FACTORY:"Vehicle Factory",
  TXT_GUARD_TOWER:"Guard Tower",
  TXT_AGUARD_TOWER:"Heavy Guard Tower",
  TXT_TURRET:"Gun Turret",
  TXT_REFINERY:"Refinery",
  TXT_STORAGE:"Crystal Silo",
  TXT_HELIPAD:"Helipad",
  TXT_SAM:"Missile Site",
  TXT_AIRSTRIP:"Airstrip",
  TXT_HOSPITAL:"Field Hospital",
  TXT_BIO_LAB:"Research Lab",
  TXT_BARRACKS:"Barracks",
  TXT_TANKER:"Tanker",
  TXT_ROAD:"Road",
  TXT_PUMP:"Water Pump",
  TXT_CIVMISS:"Mission House",
  TXT_SANDBAG_WALL:"Sandbag Wall",
  TXT_CYCLONE_WALL:"Chain Fence",
  TXT_BRICK_WALL:"Concrete Wall",
  TXT_BARBWIRE_WALL:"Wire Fence",
  TXT_WOOD_WALL:"Wooden Fence",
  TXT_PRISON:"Detention Center",
  TXT_CIVILIAN_BUILDING:"Civilian Building",
  TXT_VISCEROID:"Mutant",
  TXT_FTANK:"Flame Tank",
  TXT_STANK:"Stealth Tank",
  TXT_LTANK:"Light Tank",
  TXT_MTANK:"Battle Tank",
  TXT_HTANK:"Siege Tank",
  TXT_MHQ:"Mobile HQ",
  TXT_HOVER:"Hovercraft",
  TXT_HARVESTER:"Harvester",
  TXT_JEEP:"Scout Car",
  TXT_DUNE_BUGGY:"Raider Buggy",
  TXT_BIKE:"Recon Bike",
  TXT_MLRS:"Rocket Battery",
  TXT_GUNBOAT:"Gunboat",
  TXT_TRIC:"Horned Beast",
  TXT_TREX:"Great Beast",
  TXT_RAPT:"Swift Beast",
  TXT_STEG:"Plated Beast",
  TXT_E7:"Specialist",
  TXT_DELPHI:"Agent",
  TXT_CHAN:"Researcher",
  TXT_CIVILIAN:"Civilian"
};
// Families of numbered civilian types share one name.
const FAMILIES=[[/^TXT_CIV\d+$/,"Civilian Building"],[/^TXT_C\d+$/,"Civilian"]];
function authoredText(name){
  if(Object.prototype.hasOwnProperty.call(LABELS,name))return LABELS[name];
  const family=FAMILIES.find(([re])=>re.test(name));
  return family?family[1]:null;
}
const hasAuthoredText=name=>authoredText(name)!==null;
function originalText(name) {
  const authored=authoredText(name);
  if(authored!==null)return authored;
  // Internal names such as TXT_MAP_GDISTAT0 embed the side names.
  return name.slice(4).replace(/GDI/g,"ASTER").replace(/NOD/g,"FORGE").split("_").map(part=>({
    GDI:"Aster",NOD:"Forge",TIB:"Crystal",TIBERIUM:"Crystal",
    CNC:"World",CONQUER:"World",WESTWOOD:"Studio",EA:"World",
    CHOAM:"Market",JURASSIC:"Ancient"
  }[part]||part.toLowerCase().replace(/^./,letter=>letter.toUpperCase()))).join(" ");
}
function stringTable() {
  const header=fs.readFileSync(path.join(ROOT,"tiberiandawn/conquer.h"),"utf8");
  const definitions=[...header.matchAll(/^\s*#define\s+(TXT_[A-Z0-9_]+)\s+(\d+)\b/gm)];
  if(definitions.length<500)throw Error("Stock TXT_* table is missing or incomplete");
  const count=Math.max(...definitions.map(match=>Number(match[2])))+1;
  if(count*2>=65536)throw Error("Stock string offset table exceeds 16-bit limits");
  const words=Array.from({length:count},()=>"?");
  for(const [,name,index] of definitions)words[Number(index)]=originalText(name);
  const pieces=words.map(value=>Buffer.from(value+"\0","ascii"));
  const table=Buffer.alloc(count*2);
  let offset=table.length;
  for(let i=0;i<count;i++){
    if(offset>0xFFFF)throw Error("Stock string table exceeds 16-bit offsets");
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
  // lowercase on POSIX. Ask vanillamix to list it *before* renaming because
  // its reader applies the same normalization to its path argument.
  const emitted=path.join(game,name.toLowerCase());
  const source=fs.existsSync(emitted)?emitted:dest;
  if(!fs.existsSync(source))throw Error("MIX output not found: "+name);
  const listing=cp.spawnSync(tool,["--list",source],{encoding:"utf8"});
  if(listing.error||listing.status!==0)throw Error("MIX list "+name+" failed");
  if(source!==dest)fs.renameSync(source,dest);
}
function build(outdir,options={}) {
  const requirements=JSON.parse(fs.readFileSync(REQUIREMENTS,"utf8"));
  const revision=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8"}).trim();
  const game=path.join(outdir,"game"),stage=path.join(outdir,"_m1stage");
  fs.mkdirSync(game,{recursive:true});
  fs.mkdirSync(stage,{recursive:true});
  const indexedColors=rgbPalette();
  const palette=encodePalette({colors:indexedColors.map(toHex)});
  // UI-C typeface (tools/content/ui/fonts.js) for every engine font slot.
  const uiFonts=require("./ui/fonts.js");
  const font=uiFonts.font("8POINT.FNT",1);verifyFont(font);
  const cps=encodeCPS(TITLE_BACKGROUND);if(decodeCPS(cps).length!==64000)throw Error("CPS round-trip failed");
  const pcx=encodePCX(640,400,TITLE_BACKGROUND,indexedColors);verifyPCX(pcx);
  const mouse=shape(16,16,16,15),texture=shape(64,20,20,10);
  const strings=stringTable();
  const fontNames=["3POINT.FNT","6POINT.FNT","8POINT.FNT","6POINT.FNT",
    "LED.FNT","VCR.FNT","GRAD6FNT.FNT","8FAT.FNT","12GREEN.FNT","12GRNGRD.FNT","SCOREFNT.FNT"];
  const fonts=[...new Set(fontNames)];
  // Font colour per file: see FONT_INK; plain fonts use ink 1.
  for(const name of fonts){const f=uiFonts.font(name,FONT_INK[name]||1);verifyFont(f);write(stage,name,f);}
  write(stage,"MOUSE.SHP",mouse);
  write(stage,"BTEXTURE.SHP",texture);
  write(stage,"PREPICK.CPS",cps);
  write(stage,"TITLE.CPS",cps);
  write(stage,"HTITLE.PCX",pcx);
  write(stage,"CONQUER.ENG",strings);
  write(stage,"WCBOOT.DAT",Buffer.from("World-Conquer original boot placeholder\n"));
  const tool=nativeMixer();
  // init.cpp:268 fetches MOUSE.SHP before CONQUER.MIX is registered; only
  // the local font archives are searchable at that point.
  archive(tool,stage,game,"CCLOCAL.MIX",[...fonts,"MOUSE.SHP"]);
  archive(tool,stage,game,"LOCAL.MIX",[...fonts,"MOUSE.SHP"]);
  // The engine loads game shapes with MFCD::Retrieve, which only searches
  // registered MIX archives (common/mixfile.h), never loose files. Content
  // generated by pack.js is therefore placed inside the cached CONQUER.MIX.
  const extra=options.conquerExtra||{dir:null,files:[]};
  for(const name of extra.files)fs.copyFileSync(path.join(extra.dir,name),path.join(stage,name));
  archive(tool,stage,game,"CONQUER.MIX",[...new Set(["MOUSE.SHP","CONQUER.ENG",...extra.files])].sort());
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
module.exports={build,stringTable,shape,nativeMixer,originalText,hasAuthoredText};
