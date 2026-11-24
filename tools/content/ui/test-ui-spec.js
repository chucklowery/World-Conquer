"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const p=require("./palette.json");
const {match,menu,generate}=require("./mockups");
const {TERRAIN}=require("../boot-colors");
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
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log("UI design checks passed (proposed palette only; full pack audit pending)");
