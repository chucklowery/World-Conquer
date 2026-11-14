"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),child=require("node:child_process");
const path=require("node:path"),game=require("./vertical-slice");
const root=path.resolve(__dirname,"../..");
const mission=path.join(root,"game/content/missions/courier-extraction.map");
const commands=path.join(__dirname,"courier-replay.txt");
const executable=process.argv[2];
if(!executable)throw Error("Usage: node test-replay-parity.js <native-replay-executable>");
const s=game.start(fs.readFileSync(mission,"utf8"));
for(const line of fs.readFileSync(commands,"utf8").split(/\r?\n/)){
  if(!line||line.startsWith("#"))continue;
  const [verb,x,y,...extra]=line.split(" ");
  assert.equal(extra.length,0,"Extra command fields");
  if(verb==="tick"){
    assert.equal(y,undefined);
    for(let n=0;n<Number(x);n++)game.tick(s);
  }else if(verb==="select"||verb==="move"){
    assert.equal(game.select(s,Number(x),Number(y)),true,`Rejected ${line}`);
  }else throw Error(`Unknown command: ${line}`);
}
const snapshot=[s.frame,s.selected,s.cargo,{playing:0,won:1,lost:2}[s.phase],
  ...s.units.flatMap(u=>[u.x,u.y,u.hp]),...s.units.slice(0,2).map(u=>u.destination?1:0)].join(" ");
const native=child.execFileSync(executable,[mission,commands],{encoding:"utf8"}).trim();
assert.equal(native,snapshot,`Native/JS mission state diverged`);
console.log("PASS: identical native C++ and JavaScript command replay states:",snapshot);
