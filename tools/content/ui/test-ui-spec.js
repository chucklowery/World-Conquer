"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const p=require("./palette.json");
const {match,menu,generate}=require("./mockups");
const {TERRAIN,rgbPalette}=require("../boot-colors");
const t=require("./design-tokens.json");
const {colors:sourceColors}=require("../../../game/content/source/placeholder.palette.json");
const rgb=s=>s.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255);
const linear=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
const lum=v=>v.reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0);
const contrast=(a,b)=>(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
const matrices=[
 [[1,0,0],[0,1,0],[0,0,1]],
 [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
 [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]
];
const seen=new Set();
for(const [name,{index,rgb:hex}] of Object.entries(p.colors)){
 assert(Number.isInteger(index)&&index>=0&&index<=255,name);
 assert(!seen.has(index),"duplicate index "+index);seen.add(index);
 assert(!p.excluded.some(([a,b])=>index>=a&&index<=b),"excluded "+index);
 assert(!Object.values(TERRAIN).includes(index),"terrain collision");
 assert(/^#[0-9a-f]{6}$/i.test(hex),name);
}
for(const [a,b] of p.textPairs){
 const ratio=contrast(lum(rgb(p.colors[a].rgb).map(linear)),lum(rgb(p.colors[b].rgb).map(linear)));
 assert(ratio>=4.5,a+"/"+b+" contrast "+ratio);
}
// Mirror the existing pack.js nearest-colour translation, without changing the pack.
const game=rgbPalette();
const textIndices=new Set([16,25,202,209,233,234,235,236,237]);
const translated=sourceColors.slice(1).map(hex=>{
 const source=rgb(hex).map(x=>Math.round(x*255));
 let best=16,dist=Infinity;
 for(let j=16;j<256;j++){
  if(j>=176&&j<=191||j>=32&&j<=38||textIndices.has(j))continue;
  const d=source.reduce((sum,v,k)=>sum+(v-game[j][k])**2,0);
  if(d<dist){dist=d;best=j;}
 }
 return best;
});
for(const index of translated)assert(!seen.has(index),"existing wireframe index "+index);
const ratio=(a,b)=>contrast(lum(rgb(a).map(linear)),lum(rgb(b).map(linear)));
for(const [a,b] of [
 [t.text.primary,t.background.surface2],[t.text.muted,t.background.surface3],
 [t.text.button,t.accent.primary],[t.text.button,t.accent.deep],
 [t.accent.cyan,t.background.surface2],[t.accent.ice,t.background.surface2]
])assert(ratio(a,b)>=t.minimumTextContrast,"design text contrast "+a+" / "+b);
for(const a of [t.accent.hover,t.accent.cyan,t.statusColors.success,t.statusColors.warning,t.statusColors.danger])
 assert(ratio(a,t.background.app)>=t.minimumMeaningfulNonTextContrast,"design signal contrast "+a);
assert.equal(Object.values(t.chromeAreaTargets).reduce((a,b)=>a+b,0),100);
const states=Object.values(p.states);
assert.equal(new Set(states.map(s=>s.pattern)).size,states.length);
for(const m of matrices){
 const values=states.map(s=>lum(m.map(row=>Math.max(0,Math.min(1,row.reduce((sum,k,i)=>sum+k*rgb(p.colors[s.color].rgb).map(linear)[i],0))))));
 for(let i=1;i<values.length;i++)assert(values[i-1]-values[i]>=0.12,"state luminance separation "+values);
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wc-ui-"));
try{
 generate(dir);
 assert.equal(fs.readdirSync(dir).length,6);
 for(const scale of [1,2])for(const name of ["aster","forge","menu"]){
  const actual=fs.readFileSync(path.join(dir,name+"-"+scale+"x.svg"),"utf8");
  assert.equal(actual,name==="menu"?menu(scale):match(name,scale));
  assert(actual.includes('width="'+640*scale+'" height="'+400*scale+'"'));
  assert(actual.includes('viewBox="0 0 640 400"'));
  assert(!/<image|<script|foreignObject/i.test(actual));
 }
 assert.notEqual(match("aster"),match("forge"));
 for(const power of Object.keys(p.states)){
  const preview=match("aster",1,power);
  assert(preview.includes(p.colors[p.states[power].color].rgb));
  assert.equal(preview,match("aster",1,power));
 }
 assert.notEqual(match("aster",1,"low"),match("aster",1,"critical"));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log("UI design checks passed (target contrast, provisional palette and wireframe translation; full pack audit pending)");
