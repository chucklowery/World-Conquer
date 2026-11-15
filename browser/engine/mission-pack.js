"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCMissionPack=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const LEGACY="world-conquer-original-mission-v1",PACK="world-conquer-map-pack-v2";
  const types={".":0,"#":1,":":2,"~":3,"^":4};
  const cost=[1,0,2,3,0];
  const bounds=(x,y,w,h,width,height)=>Number.isInteger(x)&&Number.isInteger(y)&&
    Number.isInteger(w)&&Number.isInteger(h)&&x>=0&&y>=0&&w>0&&h>0&&
    x+w<=width&&y+h<=height;
  const contains=(r,p)=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.w&&p.y<r.y+r.h;
  const slug=s=>typeof s==="string"&&s.length>0&&s.length<=64&&/^[a-z0-9-]+$/.test(s);
  const title=s=>typeof s==="string"&&s.length>0&&s.length<=64&&/^[\x20-\x21\x23-\x5b\x5d-\x7e]+$/.test(s);
  function manifestValid(m){
    if(!m||typeof m!=="object")return false;
    if(m.schema===LEGACY)return m.id==="courier-extraction"&&m.width===18&&m.height===11&&
      m.file==="courier-extraction.map"&&/^[0-9a-f]{64}$/.test(m.sha256);
    if(m.schema!==PACK||!slug(m.default)||!Array.isArray(m.maps)||
       m.maps.length<1||m.maps.length>16)return false;
    const seen=new Set();
    for(const entry of m.maps){
      if(!entry||!slug(entry.id)||seen.has(entry.id)||!title(entry.title)||
         !Number.isInteger(entry.width)||entry.width<8||entry.width>32||
         !Number.isInteger(entry.height)||entry.height<8||entry.height>24||
         !["legacy-v1","wc-map-v2"].includes(entry.format)||
         entry.file!==entry.id+".map"||!/^[a-f0-9]{64}$/.test(entry.sha256))return false;
      if(entry.format==="legacy-v1"&&(entry.id!=="courier-extraction"||entry.width!==18||entry.height!==11))return false;
      seen.add(entry.id);
    }
    return seen.has(m.default);
  }
  function parseLegacy(source){
    const rows=source.replace(/\n$/,"").split("\n");
    if(rows.length!==11||rows.some(s=>s.length!==18||/[^.#SRAB12X]/.test(s)))
      throw Error("Invalid mission tile grid");
    const markers={};const tiles=[];
    for(let y=0;y<11;y++)for(let x=0;x<18;x++){
      const symbol=rows[y][x];tiles.push(symbol==="#"?1:0);
      if("SRAB12X".includes(symbol)){
        if(markers[symbol])throw Error("Missing or repeated mission marker "+symbol);
        markers[symbol]={x,y};
      }
    }
    for(const token of "SRAB12X")if(!markers[token])throw Error("Missing or repeated mission marker "+token);
    return {version:1,id:"courier-extraction",title:"Courier Extraction",biome:"temperate",
      width:18,height:11,tiles,costs:tiles.map(t=>cost[t]),markers,resources:[],
      spawns:[{house:1,x:0,y:0,w:5,h:5},{house:2,x:10,y:2,w:8,h:9}],
      bases:[{house:1,x:0,y:0},{house:2,x:17,y:10}],victory:{x:15,y:8,w:3,h:3}};
  }
  function parseV2(source){
    const lines=source.replace(/\n$/,"").split("\n");let index=0;
    const next=()=>lines[index++];
    const expect=s=>{if(next()!==s)throw Error("Invalid map directive: expected "+s);};
    const field=key=>{
      const line=next();
      if(typeof line!=="string"||!line.startsWith(key+" "))throw Error("Missing map "+key);
      const value=line.slice(key.length+1);
      if(!title(value))throw Error("Invalid map "+key);
      return value;
    };
    const nums=(key,n)=>{
      const line=next(),parts=typeof line==="string"?line.split(" "):[];
      if(parts.length!==n+1||parts[0]!==key||parts.slice(1).some(p=>!/^\d{1,6}$/.test(p)))
        throw Error("Invalid map "+key);
      const result=parts.slice(1).map(Number);
      if(result.some(p=>p>100000))throw Error("Out-of-range map "+key);
      return result;
    };
    expect("WC-MAP 2");
    const id=field("id"),name=field("title"),biome=field("biome");
    if(!slug(id))throw Error("Invalid map id");
    const [width,height]=nums("size",2);
    if(width<8||width>32||height<8||height>24)throw Error("Invalid map dimensions");
    expect("terrain");
    const tiles=[];
    for(let y=0;y<height;y++){
      const row=next();
      if(typeof row!=="string"||row.length!==width||![...row].every(c=>c in types))
        throw Error("Invalid map terrain row "+y);
      for(const c of row)tiles.push(types[c]);
    }
    expect("endterrain");
    const passable=({x,y})=>x>=0&&y>=0&&x<width&&y<height&&cost[tiles[y*width+x]]>0;
    const spawns=[1,2].map(house=>{
      const [h,x,y,w,hgt]=nums("spawn",5);
      if(h!==house||!bounds(x,y,w,hgt,width,height))throw Error("Invalid spawn zone");
      return {house,x,y,w,h:hgt};
    });
    const bases=[1,2].map((house,i)=>{
      const [h,x,y]=nums("base",3),p={house,x,y};
      if(h!==house||!passable(p)||!contains(spawns[i],p))throw Error("Invalid starting base");
      return p;
    });
    const markers={};
    for(const [i,label] of [..."SRAB"].entries()){
      const line=next(),parts=typeof line==="string"?line.split(" "):[];
      if(parts.length!==4||parts[0]!=="unit"||parts[1]!==label||
         !parts.slice(2).every(n=>/^\d{1,6}$/.test(n)))throw Error("Invalid unit spawn");
      const p={x:Number(parts[2]),y:Number(parts[3])};
      if(!passable(p)||!contains(spawns[i<2?0:1],p)||
         Object.values(markers).some(o=>o.x===p.x&&o.y===p.y))throw Error("Invalid unit placement");
      markers[label]=p;
    }
    for(const key of ["1","2"]){
      const [number,x,y]=nums("crate",3),p={x,y};
      if(number!==Number(key)||!passable(p)||
         (markers["1"]&&markers["1"].x===x&&markers["1"].y===y))throw Error("Invalid crate");
      markers[key]=p;
    }
    const resources=[];
    while(typeof lines[index]==="string"&&lines[index].startsWith("resource ")){
      const [x,y,amount]=nums("resource",3),p={x,y,amount};
      if(resources.length>=16||!passable(p)||amount<1||amount>100000||
         resources.some(r=>r.x===x&&r.y===y))throw Error("Invalid resource node");
      resources.push(p);
    }
    const [vx,vy,vw,vh]=nums("victory",4),victory={x:vx,y:vy,w:vw,h:vh};
    if(!bounds(vx,vy,vw,vh,width,height))throw Error("Invalid victory bounds");
    const [ex,ey]=nums("exit",2);markers.X={x:ex,y:ey};
    if(!passable(markers.X)||!contains(victory,markers.X))throw Error("Invalid extraction");
    expect("endmap");
    if(index!==lines.length)throw Error("Trailing map directives");
    return {version:2,id,title:name,biome,width,height,tiles,costs:tiles.map(t=>cost[t]),
      markers,resources,spawns,bases,victory};
  }
  function validate(source){
    if(typeof source!=="string"||source.length>65536||source.includes("\r")||source.includes("\0"))
      throw Error("Invalid or oversized mission source");
    return source.startsWith("WC-MAP 2\n")?parseV2(source):parseLegacy(source);
  }
  async function list(base="missions",fetcher=fetch){
    const response=await fetcher(`${base}/manifest.json`);
    if(!response.ok)throw Error("Mission manifest unavailable");
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>8192)throw Error("Mission manifest too large");
    const manifest=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    if(!manifestValid(manifest))throw Error("Invalid mission manifest");
    return manifest.schema===LEGACY?{schema:LEGACY,default:manifest.id,
      maps:[{...manifest,title:"Courier Extraction",format:"legacy-v1"}]}:manifest;
  }
  async function load(base="missions",fetcher=fetch,hash,selected){
    const pack=await list(base,fetcher),id=selected||pack.default;
    const entry=pack.maps.find(item=>item.id===id);
    if(!entry)throw Error("Unknown mission map");
    const response=await fetcher(`${base}/${entry.file}`);
    if(!response.ok)throw Error("Mission map unavailable");
    const bytes=await response.arrayBuffer();
    if(!bytes.byteLength||bytes.byteLength>65536)throw Error("Invalid mission map size");
    const digest=hash?await hash(bytes):Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),
      x=>x.toString(16).padStart(2,"0")).join("");
    if(digest!==entry.sha256)throw Error("Mission map checksum mismatch");
    const map=new TextDecoder("utf-8",{fatal:true}).decode(bytes),parsed=validate(map);
    if(parsed.id!==entry.id||parsed.width!==entry.width||parsed.height!==entry.height||
       (parsed.version===2?"wc-map-v2":"legacy-v1")!==entry.format)
      throw Error("Mission manifest and native map disagree");
    return {manifest:entry,pack,map,parsed};
  }
  return {load,list,manifestValid,validate};
});
