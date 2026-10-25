"use strict";
// Asset-free contract tests for the same importer used by the browser shell.
const assert = require("node:assert/strict");
const TD = require("./asset-import.js");
function file(name, relative, bytes = [1,2,3]) {
  return {name, webkitRelativePath: relative || "", size: bytes.length,
          arrayBuffer: async () => Uint8Array.from(bytes).buffer};
}
assert.equal(TD.destination(file("general.mix", "CNC/gdi/general.mix")), "/game/gdi/GENERAL.MIX");
assert.equal(TD.destination(file("Conquer.mix", "CNC/Data/Conquer.mix")), "/game/CONQUER.MIX");
assert.equal(TD.destination(file("general.mix", "CNC/NOD/general.mix")), "/game/nod/GENERAL.MIX");
assert.equal(TD.destination(file("SCG01EA.INI", "MyAssets/GDI/SCG01EA.INI")), "/game/gdi/SCG01EA.INI");
assert.throws(() => TD.destination(file("hi.txt", "safe/../hi.txt")), /Unsafe/);
assert.throws(() => TD.destination(file("bad file.mix")), /Unsupported/);
assert.equal(TD.plan([file("a.mix"), file("A.MIX")]).records.length, 1);
assert.equal(TD.plan([file("a.mix"), file("A.MIX")]).warnings.length, 1);
assert.throws(() => TD.plan([{name:"HUGE.MIX",size:513*1024*1024}]), /limit/);
const contents = new Map();
const dirs = new Set(["/"]);
const fs = {
  analyzePath(p) {
    if (dirs.has(p)) return {exists:true,object:{mode:16384,usedBytes:0}};
    if (contents.has(p)) return {exists:true,object:{mode:32768,usedBytes:contents.get(p).length}};
    return {exists:false};
  },
  isFile: mode => mode === 32768,
  mkdir(p) { dirs.add(p); },
  writeFile(p,b) {contents.set(p, b); },
  chdir(p) {assert(dirs.has(p));}
};
(async () => {
  assert.equal(TD.preflight(fs).ready, false);
  const files=[file("conquer.mix"), file("cclocal.mix"), file("general.mix","CNC/GDI/general.mix")];
  const staged=new Set();
  const r=await TD.stage(fs,files,staged);
  assert.equal(r.count,3);
  assert.equal(r.preflight.ready,true);
  assert(contents.has("/game/gdi/GENERAL.MIX"));
  assert.equal(TD.preflight(fs).looseGdi,false); // mission often packaged in MIX
  const dup=await TD.stage(fs,[file("GENERAL.MIX","CNC/gdi/GENERAL.MIX")],staged);
  assert.equal(dup.count,3);
  assert.equal(dup.warnings.length,1);
  console.log("PASS: path safety, disc layout, duplicate handling, MEMFS staging and preflight");
})().catch(err => {console.error(err);process.exitCode=1;});
