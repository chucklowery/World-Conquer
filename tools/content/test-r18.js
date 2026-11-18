"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const source=fs.readFileSync(path.join(root,"game/content/r18/definitions.rts"),"utf8");
const roster=JSON.parse(fs.readFileSync(path.join(root,"game/content/r05/roster.json"),"utf8"));
const rows=source.trimEnd().split(/\r?\n/).map(line=>line.split("|"));
assert.deepEqual(rows.shift(),["RTS-DEFINITIONS","1"]);
const visuals=new Map(),definitions=new Map();
const mapping={infantry:"infantry",vehicle:"vehicle",structure:"building",resource:"resource"};
for(const r of rows){
  if(r[0]==="visual"){
    assert.equal(r.length,6);
    assert(!visuals.has(r[1]));
    const asset=roster.assets.find(a=>a.id===r[1]);
    assert(asset,"R18 visual keys must exist in R05 source roster");
    assert.equal(r[2],asset.faction??"neutral");
    assert.equal(mapping[r[3]],asset.kind);
    assert.deepEqual(r.slice(4).map(Number),asset.footprint);
    visuals.set(r[1],r);
  }else if(r[0]==="def"){
    assert.equal(r.length,8);
    assert(r[1].startsWith("game.")&&!r[1].startsWith("r05."));
    assert(!definitions.has(r[1]));
    definitions.set(r[1],r);
  }else throw Error("Unknown R18 content record");
}
for(const d of definitions.values()){
  const v=visuals.get(d[6]);
  assert(v,"Unknown R18 visual reference");
  assert.deepEqual([d[2],d[3],d[4],d[5]],[v[2],v[3],v[4],v[5]]);
  assert(Number.isInteger(Number(d[7]))&&Number(d[7])>0);
}
assert.equal(visuals.size,11);
assert.equal(definitions.size,11);
assert(definitions.has("game.aster.ranger")&&definitions.has("game.forge.ranger"));
for(const faction of ["aster","forge"]){
  assert.deepEqual(definitions.get(`game.${faction}.harvester`).slice(3,6),["vehicle","1","1"]);
  assert.deepEqual(definitions.get(`game.${faction}.refinery`).slice(3,6),["structure","2","2"]);
}
console.log("PASS: R18 gameplay definitions match eleven immutable, faction-correct R05 visual keys and footprints");
