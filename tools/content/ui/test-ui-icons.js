"use strict";
// UI-C: cameos, build clock, pips, fonts and the strings they must print.
const assert=require("node:assert/strict");
const icons=require("./icons.js");
const fonts=require("./fonts.js");
const UI=require("./ui-colors.js");
const {encode}=require("./build.js");
const {decodeTacticalShape}=require("../encode-shape.js");
const {stringTable}=require("../boot-pack.js");
const req=require("../../../game/content/pack/requirements.json");

const g=icons.generate();
const frame=f=>f.toFrame();
const hamming=(a,b)=>a.pixels.reduce((n,p,i)=>n+(p!==b.pixels[i]),0);

// Every cameo the engine can request is generated at 64x48 and shows an
// object silhouette (pixels outside the backdrop shades), never a bare plate.
const backdropShades=new Set([0,UI.coal,UI.plate,UI.subtle,UI.bevel,UI.edge,UI.shadow]);
const cameos=req.files.filter(e=>/ICNH\.(SHP|TEM)$/.test(e.name));
assert(cameos.length>=100,"cameo inventory "+cameos.length);
for(const e of cameos){
  const v=g[e.name];assert(v&&v.length===1,e.name);
  const f=frame(v[0]);
  assert.equal(f.width,64);assert.equal(f.height,48);
  const ink=f.pixels.filter(p=>!backdropShades.has(p)).length;
  assert(ink>=40,e.name+" has no readable silhouette ("+ink+" px)");
  assert(!f.pixels.includes(0),e.name+" opaque");
  const d=decodeTacticalShape(encode(v)).frames[0];
  assert.deepEqual(d.pixels,f.pixels,e.name+" round trip");
}
// Distinct objects get distinct cameos.
const sig=new Map();
for(const e of cameos.filter(e=>e.name.endsWith(".SHP"))){
  const k=frame(g[e.name][0]).pixels.join(",");
  if(sig.has(k)&&!/^C\d+ICNH/.test(e.name)&&!/^C\d+ICNH/.test(sig.get(k)))assert.fail(e.name+" duplicates "+sig.get(k));
  sig.set(k,e.name);
}

// Clock: 109 frames, opaque dither only (no ghost ink 3, whose LTGREY target
// would lighten the cameo); remaining-time coverage falls monotonically and
// never exceeds about half the cameo, so the silhouette stays visible.
const clock=g["HCLOCK.SHP"].map(frame);
assert.equal(clock.length,109);
const cover=f=>f.pixels.filter(p=>p===UI.shadow).length;
for(const f of clock){assert(!f.pixels.includes(3),"ghost ink in clock");assert(cover(f)<=0.51*64*48,"clock hides silhouette");}
for(let i=2;i<clock.length;i++)assert(cover(clock[i])<=cover(clock[i-1]),"clock coverage monotonic at "+i);
assert(cover(clock[1])>0.45*64*48&&cover(clock[108])<0.03*64*48,"clock sweeps from full to empty");
assert(hamming(clock[0],clock[1])>200,"unavailable differs from stage 0");

// Pips: 8 frames (defines.h); READY and HOLD differ in ink and glyph.
const pips=g["HPIPS.SHP"].map(frame);
assert.equal(pips.length,8);
assert(pips[3].pixels.includes(UI.normal)&&!pips[3].pixels.includes(UI.amber),"READY lime");
assert(pips[4].pixels.includes(UI.amber)&&!pips[4].pixels.includes(UI.normal),"HOLD amber");
assert(hamming(pips[3],pips[4])>40,"READY/HOLD shapes differ");
for(const i of [1,5,6,7])assert(hamming(pips[i],pips[0])>4,"cargo pip "+i+" differs from empty");
// Primary marker is drawn top-left aligned (techno.cpp:4489).
assert(pips[2].pixels.slice(0,7).some(p=>p)||pips[2].pixels.slice(42*3,42*3+7).some(p=>p),"primary at left");

// Fonts: every slot decodes; every printable character has its own glyph
// with a blank right column (advance = ink + 1); every character the
// strings table uses is covered.
const table=stringTable();
const count=table.readUInt16LE(0)/2;
const used=new Set();
for(let i=0;i<count;i++){
  const start=table.readUInt16LE(i*2);let end=start;while(table[end])end++;
  for(const c of table.slice(start,end))used.add(c);
}
for(const name of Object.keys(fonts.SLOTS)){
  const blob=fonts.font(name,name.startsWith("GRAD")||name==="SCOREFNT.FNT"?14:name.startsWith("12")?4:1);
  assert.equal(blob.readUInt16LE(0),blob.length,name+" size field");
  assert.equal(blob[18],fonts.HEIGHT,name+" height unchanged");
  const q=fonts.decodeGlyph(blob,"?".charCodeAt(0)).rows.join("/");
  for(const c of used){
    assert(c>=32&&c<127,"strings table uses non-ASCII "+c);
    const gl=fonts.decodeGlyph(blob,c);
    assert(gl.width>=2||c===32,name+" glyph "+String.fromCharCode(c));
    if(c!==63&&c!==32)assert.notEqual(gl.rows.join("/"),q,name+" falls back for "+String.fromCharCode(c));
    assert(gl.rows.every(r=>r[r.length-1]==="."),name+" glyph "+String.fromCharCode(c)+" lacks spacing column");
  }
  for(let c=32;c<127;c++)assert(fonts.decodeGlyph(blob,c).width>0,name+" printable "+c);
}
// Tabular digits: one advance for all ten (credits counter, timers).
{const b=fonts.font("12GRNGRD.FNT",4);const w=new Set([..."0123456789"].map(c=>fonts.decodeGlyph(b,c.charCodeAt(0)).width));assert.equal(w.size,1,"tabular digits");}
// Requirements record the verified contracts.
for(const n of ["HCLOCK.SHP","HPIPS.SHP"]){const e=req.files.find(x=>x.name===n);assert.equal(e.generator,"ui");assert.equal(e.contract.frames,g[n].length);}
console.log("UI icon, clock, pip and font checks passed ("+cameos.length+" cameos, "+used.size+" characters)");
