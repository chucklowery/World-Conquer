"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {build,stringTable}=require("./boot-pack.js");
const {encodeFont,verifyFont}=require("./encode-font.js");
const {encodeCPS,decodeCPS}=require("./encode-cps.js");
const {decodeShape}=require("./encode-shape.js");
const {shape}=require("./boot-pack.js");
assert.equal(verifyFont(encodeFont()),true);
assert.equal(decodeCPS(encodeCPS())[0],5);
assert.equal(decodeCPS(encodeCPS()).length,64000);
assert.equal(decodeShape(shape(16,16,16,5)).frames.length,16);
const eng=stringTable();
// tiberiandawn/conquer.h defines TXT_NONE..TXT_INSUFFICIENT_FUNDS (0..756).
assert.equal(eng.readUInt16LE(0),757*2);
assert.ok(eng.readUInt16LE(756*2)<eng.length);
const wordAt=index=>{
  const start=eng.readUInt16LE(index*2);
  const end=eng.indexOf(0,start);
  return eng.toString("ascii",start,end);
};
assert.equal(wordAt(0),"");
assert.equal(wordAt(25),"New Game");
assert.equal(wordAt(53),"Load Game");
assert.equal(wordAt(64),"Exit");
assert.equal(wordAt(33),"Aster");
assert.equal(wordAt(34),"Forge");
assert.equal(wordAt(210),"Multiplayer");
assert.doesNotMatch(eng.toString("ascii"),/\b(?:GDI|Nod|Tiberium|Command & Conquer)\b/i);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"wc-m1-"));
try{
  const a=build(path.join(tmp,"first")),b=build(path.join(tmp,"second"));
  assert.deepEqual(a,b,"manifest must be deterministic");
  for(const file of a.files){
    assert.match(file.path,/^[A-Z0-9_.-]+$/,"all boot assets use canonical uppercase names");
  }
  for(const f of a.files){
    assert.deepEqual(fs.readFileSync(path.join(tmp,"first/game",f.path)),
      fs.readFileSync(path.join(tmp,"second/game",f.path)),f.path+" must be deterministic");
  }
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(tmp,"first/PROVENANCE.json")))).length,a.files.length);
  console.log("Original boot pack determinism and format checks passed");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

// No franchise names or trademarks in player-visible text (AGENT_GUIDE rule 3).
{
  const {stringTable}=require("./boot-pack.js");
  const table=stringTable(),count=table.readUInt16LE(0)/2,banned=[];
  const pattern=/\b(G ?D ?I|N ?O ?D|Kane|Tiberium|Westwood|Command (and|&) Conquer|C&C|Brotherhood|Global Defense|Temple|Obelisk|Orca|Rambo|Ion Cannon|Moebius|Mammoth|Hum-?vee|Mobius)\b/i;
  for(let i=0;i<count;i++){
    const start=table.readUInt16LE(i*2),end=table.indexOf(0,start);
    const text=table.subarray(start,end).toString("latin1");
    if(pattern.test(text))banned.push(i+"="+text);
  }
  if(banned.length)throw Error("Trademark or franchise terms in generated strings: "+banned.join(", "));
  console.log("PASS: generated strings contain no franchise names");
}


// Every object in the type tables has an authored display name, not one
// derived from its enum name (M3: both factions' rosters are named).
{
  const fs=require("node:fs"),path=require("node:path");
  const {hasAuthoredText}=require("./boot-pack.js");
  const root=path.resolve(__dirname,"../..");
  const src=["bdata","udata","idata","adata"].map(f=>fs.readFileSync(path.join(root,"tiberiandawn",f+".cpp"),"latin1")).join("\n");
  const names=[...new Set([...src.matchAll(/\bTXT_[A-Z0-9_]+/g)].map(m=>m[0]))];
  const unnamed=names.filter(n=>!hasAuthoredText(n));
  if(unnamed.length)throw Error("Object types without an authored name: "+unnamed.join(", "));
  console.log("PASS: all "+names.length+" object type names are authored");
}
