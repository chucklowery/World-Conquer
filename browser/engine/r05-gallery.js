"use strict";
(() => {
  const CELL=24, WIDTH=36, HEIGHT=20;
  const canvas=document.getElementById("field"),ctx=canvas.getContext("2d",{alpha:false});
  const status=document.getElementById("status"),roster=document.getElementById("roster");
  let manifest, pages=[], phase=0, tick=0;
  ctx.imageSmoothingEnabled=false;

  async function verified(path,record){
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)throw new Error(`Missing asset: ${path}`);
    const data=await response.arrayBuffer();
    if(data.byteLength!==record.bytes)throw new Error(`Asset size mismatch: ${path}`);
    const hash=await crypto.subtle.digest("SHA-256",data);
    const hex=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    if(hex!==record.sha256)throw new Error(`Asset hash mismatch: ${path}`);
    return data;
  }

  function sprite(asset,stateName,facing=0,animation=0){
    const state=asset.states.find(s=>s.state===stateName)||asset.states[0];
    const index=state.start+(facing%state.facings)*state.phases+(animation%state.phases);
    return asset.atlas[index];
  }
  function drawAsset(asset,x,y,state,facing=0,step=0,scale=1){
    if(!asset)return;
    const r=sprite(asset,state,facing,step),dx=Math.round(x-r.w*scale/2),dy=Math.round(y-r.h*scale+4*scale);
    ctx.drawImage(pages[r.page],r.x,r.y,r.w,r.h,dx,dy,r.w*scale,r.h*scale);
  }
  function stateFor(asset){
    if(asset.kind==="infantry"||asset.kind==="vehicle")return ["idle","move","attack","damaged","destroyed"][phase];
    if(asset.kind==="building")return ["idle","active","active","critical","destroyed"][phase];
    if(asset.kind==="resource")return ["rich","rich","harvested","harvested","depleted"][phase];
    if(asset.kind==="terrain")return phase>=3?"scorched":"normal";
    return "burst";
  }
  const CELL_POS={
    "aster.hub":[4.5,5.4],"aster.refinery":[9.5,5.4],"aster.power":[14.5,5.4],
    "aster.barracks":[5.5,14.1],"aster.factory":[12,14.1],
    "aster.ranger":[5,10],"aster.harvester":[10,10],"aster.rover":[14,10],
    "forge.hub":[22,5.4],"forge.refinery":[27.5,5.4],"forge.power":[33,5.4],
    "forge.barracks":[23.5,14.1],"forge.factory":[30.5,14.1],
    "forge.ranger":[23.5,10],"forge.harvester":[28.5,10],"forge.rover":[33,10],
    "world.crystal":[17.2,7.5],"world.grove":[19.5,12],"world.rock":[17,14],
    "world.brush":[19,5],"world.crater":[18,17],"world.muzzle":[14.6,8.6],
    "world.impact":[18.2,9.7],"world.smoke":[27.4,3.6]
  };
  function background(){
    ctx.fillStyle="#172729";ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const variation=(x*17+y*29+x*y*3)%13;
      ctx.fillStyle=variation<3?"#223831":variation<8?"#253b35":"#2a3e37";
      ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      if(variation===3||variation===9){ctx.fillStyle="#3b5544";ctx.fillRect(x*CELL+4,y*CELL+13,3,2);}
      ctx.strokeStyle="#081b1c18";ctx.strokeRect(x*CELL+.5,y*CELL+.5,CELL,CELL);
    }
    ctx.fillStyle="#416357";ctx.fillRect(18*CELL-2,0,4,canvas.height);
    ctx.fillStyle="#0d2429d9";ctx.fillRect(0,0,canvas.width,37);
    ctx.font="bold 13px ui-monospace, monospace";
    ctx.fillStyle="#92e5cd";ctx.fillText("ASTER EXPEDITION",19,23);
    ctx.fillStyle="#ffc091";ctx.fillText("FORGE COMPACT",19*CELL,23);
    ctx.font="10px ui-monospace, monospace";ctx.fillStyle="#a2b8aa";
    ctx.fillText("NORTH / RIDGE 03",19,canvas.height-12);
    ctx.fillText("SOUTH / KILN 08",19*CELL,canvas.height-12);
  }
  function draw(){
    if(!manifest)return;
    background();
    for(const a of manifest.assets){
      const pos=CELL_POS[a.id.slice(4)];if(!pos)continue;
      let heading=a.kind==="infantry"?2:a.kind==="vehicle"?6:0;
      if(phase===1&&a.kind==="vehicle")heading=(heading+(tick%8))%8;
      drawAsset(a,pos[0]*CELL,pos[1]*CELL,stateFor(a),heading,tick);
    }
    canvas.dataset.ready="true";canvas.dataset.phase=String(phase);
  }
  function buildCards(){
    for(const a of manifest.assets){
      const card=document.createElement("article");card.className="asset";card.dataset.artId=a.id;
      const preview=document.createElement("canvas");preview.width=52;preview.height=52;
      const info=document.createElement("div"),name=document.createElement("h3"),label=document.createElement("p");
      name.textContent=a.name;label.textContent=`${a.id}\n${a.kind} • ${a.frames} frames`;
      info.append(name,label);card.append(preview,info);roster.append(card);
      const c=preview.getContext("2d");c.imageSmoothingEnabled=false;
      const r=sprite(a,a.states[0].state);
      c.drawImage(pages[r.page],r.x,r.y,r.w,r.h,Math.floor((52-r.w)/2),Math.floor((52-r.h)/2),r.w,r.h);
    }
  }
  async function init(){
    try{
      const response=await fetch("manifest.json",{cache:"no-store"});
      if(!response.ok)throw new Error("R05 manifest missing");
      manifest=await response.json();
      if(manifest.schemaVersion!==1||manifest.namespace!=="r05"||manifest.assets.length!==24||manifest.gameplayCellPixels!==CELL)
        throw new Error("Incompatible R05 manifest");
      const files=new Map(manifest.files.map(f=>[f.target,f]));
      for(let i=0;i<manifest.budgets.pages;i++){
        const path=`atlases/atlas-${i}.png`,record=files.get(path);
        if(!record)throw new Error("Atlas record missing");
        const bytes=await verified(path,record),url=URL.createObjectURL(new Blob([bytes],{type:"image/png"}));
        try{
          const img=new Image();img.src=url;await img.decode();
          if(img.naturalWidth!==manifest.atlasSize||img.naturalHeight!==manifest.atlasSize)throw new Error("Wrong atlas dimensions");
          pages.push(img);
        }finally{URL.revokeObjectURL(url);}
      }
      buildCards();draw();
      status.textContent=`VERIFIED · ${manifest.assets.length} ASSETS · ${manifest.budgets.frames} FRAMES · ${manifest.budgets.actualBytes.toLocaleString()} BYTES`;
      document.getElementById("digest").textContent=`Pack SHA-256: ${manifest.contentSha256.slice(0,16)}…`;
      document.getElementById("count").textContent=`${manifest.assets.length} pieces`;
    }catch(error){status.textContent=`ART LOAD FAILED: ${error.message}`;status.dataset.error="true";canvas.dataset.ready="false";}
  }
  for(const button of document.querySelectorAll("[data-phase]"))button.addEventListener("click",()=>{
    phase=Number(button.dataset.phase);tick++;
    for(const b of document.querySelectorAll("[data-phase]"))b.setAttribute("aria-pressed",String(b===button));
    draw();
  });
  window.__r05Gallery={redraw:()=>{tick++;draw();},getManifest:()=>manifest};
  init();
})();
