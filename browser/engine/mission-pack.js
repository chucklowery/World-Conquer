"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCMissionPack=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const expected={schema:"world-conquer-original-mission-v1",id:"courier-extraction",
    width:18,height:11,file:"courier-extraction.map"};
  function manifestValid(m){
    return m&&Object.entries(expected).every(([k,v])=>m[k]===v)&&/^[0-9a-f]{64}$/.test(m.sha256);
  }
  async function load(base="missions",fetcher=fetch,hash){
    const response=await fetcher(`${base}/manifest.json`);
    if(!response.ok)throw Error("Mission manifest unavailable");
    const manifest=await response.json();
    if(!manifestValid(manifest))throw Error("Invalid mission manifest");
    const mapResponse=await fetcher(`${base}/${manifest.file}`);
    if(!mapResponse.ok)throw Error("Mission map unavailable");
    const bytes=await mapResponse.arrayBuffer();
    const digest=hash?await hash(bytes):Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),
      x=>x.toString(16).padStart(2,"0")).join("");
    if(digest!==manifest.sha256)throw Error("Mission map checksum mismatch");
    const map=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    WCMapValidate(map);
    return {manifest,map};
  }
  function WCMapValidate(map){
    const lines=map.trimEnd().split(/\r?\n/);
    if(lines.length!==11||lines.some(s=>s.length!==18||/[^.#SRAB12X]/.test(s)))
      throw Error("Invalid mission tile grid");
    for(const token of "SRAB12X")if(lines.join("").split(token).length!==2)
      throw Error("Missing or repeated mission marker "+token);
  }
  return {load,manifestValid,validate:WCMapValidate};
});
