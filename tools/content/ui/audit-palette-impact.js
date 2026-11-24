"use strict";
// Design-only simulation: never writes or changes the runtime palette/pack.
const assert=require("node:assert/strict");
const {rgbPalette,toHex}=require("../boot-colors");
const {encodePalette}=require("../encode-palette");
const {tables}=require("../fading");
const {wireframeTranslation}=require("../pack");
const p=require("./palette.json");
const {colors:source}=require("../../../game/content/source/placeholder.palette.json");
const rgb=h=>h.slice(1).match(/../g).map(v=>parseInt(v,16));
const reserved=new Set(Object.values(p.colors).map(c=>c.index));
const base=rgbPalette(),candidate=base.map(a=>a.slice());
for(const c of Object.values(p.colors))candidate[c.index]=rgb(c.rgb);
const fixed=new Set([16,25,202,209,233,234,235,236,237]);
function translate(palette,protect){
 return source.slice(1).map(hex=>{
  const v=rgb(hex);let best=16,dist=Infinity;
  for(let j=16;j<256;j++){
   if(j>=176&&j<=191||j>=32&&j<=38||fixed.has(j)||(protect&&reserved.has(j)))continue;
   const d=v.reduce((sum,c,k)=>sum+(c-palette[j][k])**2,0);
   if(d<dist){dist=d;best=j;}
  }
  return best;
 });
}
const original=wireframeTranslation().slice(1,source.length);
const unprotected=translate(candidate,false),protectedTranslation=translate(candidate,true);
const oldPal=encodePalette({colors:base.map(toHex)}),newPal=encodePalette({colors:candidate.map(toHex)});
const oldTables=tables(oldPal,"T"),newTables=tables(newPal,"T");
const changes=Object.keys(oldTables).map(name=>({
 name,changedBytes:[...oldTables[name]].filter((v,i)=>v!==newTables[name][i]).length,
 totalBytes:oldTables[name].length
}));
const linear=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
const luminance=k=>{
 const index=p.colors[k].index;
 return [0,1,2].reduce((s,i)=>s+[0.2126,0.7152,0.0722][i]*linear(newPal[index*3+i]/63),0);
};
const contrasts=p.textPairs.map(([a,b])=>{
 const x=luminance(a),y=luminance(b);
 return {foreground:a,background:b,ratio:(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
});
const report={status:"simulation-only",original,unprotected,protectedTranslation,
 translationStableWithProtection:JSON.stringify(original)===JSON.stringify(protectedTranslation),
 contrasts,changes};
if(require.main===module){
 console.log(JSON.stringify(report,null,2));
 assert(report.translationStableWithProtection,"protecting proposed UI indices must preserve existing translations");
 for(const pair of contrasts)assert(pair.ratio>=4.5,"quantized contrast: "+JSON.stringify(pair));
 for(const index of reserved)assert(!(index>=74&&index<=85)&&index<240,"resource/fading range collision");
 // Changed fading entries are reported for UI-B review, not silently accepted.
}
module.exports=report;
