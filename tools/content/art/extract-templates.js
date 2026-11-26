#!/usr/bin/env node
"use strict";
// Extracts the engine's terrain template table (tiberiandawn/cdata.cpp) to
// templates.json: name, size, land type and the icons that use the alternate
// land type. The terrain art (terrain.js) is painted from this land mask.
// Run after changing cdata.cpp; test-terrain.js checks the file is current.
const fs=require("node:fs"),path=require("node:path");
// TemplateType enum order (defines.h): the map BIN stores this number.
function enumOrder(defines){
  const m=defines.match(/typedef enum TemplateType[^{]*\{([\s\S]*?)\}\s*TemplateType;/);
  if(!m)throw Error("TemplateType enum not found");
  const names=[];let next=0;const index={};
  for(const raw of m[1].replace(/\/\/[^\n]*/g,"").split(",")){
    const t=raw.trim();if(!t)continue;
    const [name,val]=t.split("=").map(x=>x.trim());
    if(val!==undefined){if(/^-?\d+$/.test(val))next=+val;else if(val in index)next=index[val];else continue;}
    index[name]=next++;names.push(name);
  }
  return index;
}
function extract(source,defines){
  const order=defines?enumOrder(defines):null;
  const arrays={};
  for(const m of source.matchAll(/static\s+char\s+const\s+(\w+)\[\]\s*=\s*\{([^}]*)\}/g))
    arrays[m[1]]=m[2].split(",").map(s=>parseInt(s)).filter(n=>!isNaN(n)&&n>=0);
  const out=[];
  for(const m of source.matchAll(/static TemplateTypeClass const\s+(\w+)\(([^;]*)\);/g)){
    const args=m[2].replace(/\/\/[^\n]*/g,"").split(",").map(s=>s.trim());
    const [enumName,theaters,name,,land,w,h,altLand,alt]=args;
    const key=alt.replace(/\(char const\*\)/,"").trim();
    if(alt!=="NULL"&&!arrays[key])throw Error("Unknown alternate icon list "+alt);
    out.push({name:name.replace(/"/g,""),id:order?order[enumName]:undefined,temperate:theaters.includes("TEMPERATE"),land,w:+w,h:+h,
      altLand,altIcons:alt==="NULL"?[]:arrays[key]});
  }
  if(out.length<100)throw Error("Template table not found");
  return out;
}
const root=path.resolve(__dirname,"../../..");
function current(){return extract(fs.readFileSync(path.join(root,"tiberiandawn/cdata.cpp"),"latin1"),
  fs.readFileSync(path.join(root,"tiberiandawn/defines.h"),"latin1"));}
module.exports={extract,current};
if(require.main===module){
  const table=current();
  fs.writeFileSync(path.join(__dirname,"templates.json"),JSON.stringify(table)+"\n");
  console.log("Templates:",table.length);
}
