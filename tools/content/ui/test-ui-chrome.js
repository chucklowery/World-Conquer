"use strict";
// UI-B: frame contracts, palette discipline and state legibility of the
// generated command-bar chrome. Contracts: docs/browser/UI_SPEC.md.
const assert=require("node:assert/strict");
const chrome=require("./chrome.js");
const {encode}=require("./build.js");
const {decodeTacticalShape}=require("../encode-shape.js");
const {screen}=require("./compose.js");
const UI=require("./ui-colors.js");
const req=require("../../../game/content/pack/requirements.json");

const g=chrome.generate();
const allowed=new Set([0,UI.black,...UI.reserved]);
const frames=name=>g[name].map(f=>f.toFrame());
const count=(f,set)=>f.pixels.filter(p=>set.includes(p)).length;
const hamming=(a,b)=>a.pixels.reduce((n,p,i)=>n+(p!==b.pixels[i]),0);

// Every UI file matches its recorded contract and decodes back exactly.
for(const [name,value] of Object.entries(g)){
  const entry=req.files.find(e=>e.name===name);
  assert(entry,"requirements.json lists "+name);
  assert.equal(entry.generator,"ui",name);
  const c=entry.contract;
  assert.equal(value.length,c.frames,name+" frames");
  assert(value.every(f=>f.width===c.width),name+" width");
  assert(Math.max(...value.map(f=>f.height))===c.height,name+" height");
  const decoded=decodeTacticalShape(encode(value));
  assert.equal(decoded.frames.length,value.length);
  decoded.frames.forEach((f,i)=>assert.deepEqual(f.pixels,value[i].pixels,name+" frame "+i+" round trip"));
  for(const f of value)for(const p of f.pixels)assert(allowed.has(p),name+" uses unreserved index "+p);
}

// Sidebar halves meet at the engine seam and are fully opaque.
assert.equal(g["HSIDE1.SHP"][0].height+g["HSIDE2.SHP"][0].height,400-158);
for(const n of Object.keys(g).filter(n=>n.startsWith("HSIDE")))assert(!frames(n)[0].pixels.includes(0),n+" opaque");

// UI-F: per-faction sets and the one-row filler. SIDE3 repeats seamlessly:
// its first row is the slot-separator row and the channel pattern has a
// 48-row period; the faction sets differ from neutral only in trim.
{
  const comp=chrome.sidebarComposite();
  const row=(r,y)=>Array.from({length:160},(_,x)=>r.get(x,y));
  const filler=g["HSIDE3.SHP"][0];
  assert.equal(filler.height,48);
  assert.deepEqual(row(filler,0),row(comp,chrome.FILLER_Y),"filler starts on a separator row");
  for(const x of [20,60,90,130])for(let y=0;y<48;y++)
    assert.equal(comp.get(x,chrome.FILLER_Y+y),comp.get(x,chrome.FILLER_Y+48+y),"channel period at "+x+","+y);
  for(const sfx of ["GDI","NOD"]){
    for(const n of ["HSIDE1.","HSIDE2.","HSIDE3."]){
      const a=frames(n+"SHP")[0],b=frames(n+sfx)[0];
      const diff=hamming(a,b);
      assert(diff>0&&diff<0.05*a.pixels.length,n+sfx+" differs from neutral only in trim ("+diff+")");
    }
  }
  assert(frames("HSIDE1.GDI")[0].pixels.includes(UI.teal)&&frames("HSIDE1.NOD")[0].pixels.includes(UI.red),"faction trim");
}
// Command buttons: no overlap, on screen, above the strips (y<181).
const L=chrome.layout,xs=Object.values(L.buttons).sort((a,b)=>a-b);
for(let i=1;i<xs.length;i++)assert(xs[i-1]+L.buttonW<=xs[i],"buttons overlap");
assert(xs[xs.length-1]+L.buttonW<=640,"MAP off screen");
assert(L.buttonY+L.buttonH<=L.stripY,"buttons overlap strips");
// Up / on / disabled differ in shape (not only hue): the sunk frame moves the
// pictogram, the disabled frame drops it to a low-contrast ink.
for(const kind of ["REPAIR","SELL","MAP"]){
  const [up,on,off]=frames("H"+kind+".SHP");
  assert(hamming(up,on)>40&&hamming(up,off)>40&&hamming(on,off)>40,kind+" states distinct");
  assert(count(on,[UI.deep])>count(up,[UI.deep])+200,kind+" on frame lit crimson");
  assert(count(up,[UI.white])>10&&count(off,[UI.white])===0,kind+" disabled drops bright ink");
}

// Radar: 42 frames; 0 (no facility) and 41 (offline) differ; shutters open
// monotonically over 1..21 and close over 23..40; frame 22 leaves the inset
// clear of shutters so the engine's map shows through.
for(const house of Object.keys(chrome.FACTION)){
  const r=frames("HRADAR."+house);
  const shutter=f=>{let n=0;for(let y=L.insetY;y<L.insetY+L.insetH;y++)for(let x=L.insetX;x<L.insetX+L.insetW;x++)if(f.pixels[y*f.width+x]===UI.steel)n++;return n;};
  assert.equal(shutter(r[22]),0,house+" active inset clear");
  assert(hamming(r[0],r[41])>100,house+" offline differs from no-radar");
  for(let i=2;i<=21;i++)assert(shutter(r[i])<=shutter(r[i-1]),house+" opening "+i);
  for(let i=24;i<=40;i++)assert(shutter(r[i])>=shutter(r[i-1]),house+" closing "+i);
  assert(shutter(r[1])>shutter(r[21])&&shutter(r[40])>shutter(r[23]));
  for(const f of r)assert(!f.pixels.includes(0),house+" housing opaque");
}
assert.notDeepEqual(frames("HRADAR.GDI")[22].pixels,frames("HRADAR.NOD")[22].pixels,"faction tint");

// Power gauge: 8 frames, 100 px upper and 124 px lower pieces; the three
// fill states differ in dominant colour *and* pattern.
const pw=frames("HPWRBAR.SHP");
pw.forEach((f,i)=>{
  assert.equal(f.height,124,"PWRBAR frame "+i+" height");
  const opaqueRows=Array.from({length:124},(_,y)=>f.pixels.slice(y*16,y*16+16).some(p=>p)).filter(Boolean).length;
  assert.equal(opaqueRows,i%2?124:100,"PWRBAR frame "+i+" drawn rows");
});
const track=f=>{const s=new Set();for(let y=0;y<f.height;y++)for(let x=3;x<=12;x++)s.add(f.pixels[y*16+x]);return s;};
const normal=track(pw[2]),low=track(pw[4]),crit=track(pw[6]);
assert(normal.has(UI.normal)&&!normal.has(UI.amber)&&!normal.has(UI.critical));
assert(low.has(UI.amber)&&!low.has(UI.normal));
assert(crit.has(UI.critical)&&crit.has(UI.red)&&!crit.has(UI.amber));
// Pattern continuity across the y=276 seam.
for(const state of ["normal","low","critical"])for(let x=3;x<=12;x++)
  assert.equal(chrome.gaugePixel(state,x,99)!=null,chrome.gaugePixel(state,x,100)!=null);
// Drain marker tip on row 4, visible on both edges.
const m=frames("HPOWER.SHP")[0];
assert.equal(m.pixels[4*16+0],UI.button);assert.equal(m.pixels[4*16+15],UI.button);

// Arrows: three distinct states.
for(const n of ["HSTRIPUP.SHP","HSTRIPDN.SHP"]){const a=frames(n);assert(hamming(a[0],a[1])>20&&hamming(a[0],a[2])>20,n);}
assert(hamming(frames("HSTRIPUP.SHP")[0],frames("HSTRIPDN.SHP")[0])>10,"up/down chevrons differ");

// Composed screen: probe the spec coordinates used by check-stock-scenario.
const s=screen({house:"GDI"});
const at=(x,y)=>s.get(x,y);
assert.equal(at(500+30,181+5),UI.coal,"strip logo bay");
assert.equal(at(480+16+64,15+6+64),UI.shadow,"radar glass (behind engine map)");
assert.equal(at(L.buttons.MAP,L.buttonY+9),UI.edge,"MAP button outline");
assert.equal(at(L.buttons.REPAIR+4,L.buttonY+L.buttonH-3),UI.primary,"REPAIR action mark");
const on=screen({repair:true});
assert.equal(on.get(L.buttons.REPAIR+24,L.buttonY+4),UI.deep,"REPAIR on lit");
console.log("UI chrome checks passed ("+Object.keys(g).length+" files)");
