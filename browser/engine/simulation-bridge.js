"use strict";
// One-way native C++ -> HUD projection. Never calculates a movement step or
// sends orders. The C++ contract is the only producer of these snapshots.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCRTS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const VERSION=1,MAP_VERSION=2;
  let current=null,listener=null,history=Object.freeze([]);
  const kinds=new Set(["infantry","vehicle","supply","extraction"]);
  const events=new Set(["command","selection","position","health","pickup","phase","restart",
    "shot","hit","damage","death"]);
  function check(snapshot){
    if(!snapshot||![VERSION,MAP_VERSION].includes(snapshot.version)||!Number.isSafeInteger(snapshot.tick)||snapshot.tick<0)
      throw Error("Unsupported simulation snapshot version or tick");
    const map=snapshot.map;
    if(!map||!Number.isInteger(map.width)||!Number.isInteger(map.height)||
       map.width<8||map.height<8||map.width>32||map.height>24||!Array.isArray(map.terrain)||
       map.terrain.length!==map.width*map.height||
       map.terrain.some(t=>t!==0&&t!==1))throw Error("Invalid snapshot terrain");
    if(snapshot.version===MAP_VERSION){
      const costs=[1,0,2,3,0];
      if(typeof map.id!=="string"||!/^[a-z0-9-]{1,64}$/.test(map.id)||
         !Array.isArray(map.tiles)||!Array.isArray(map.costs)||
         map.tiles.length!==map.width*map.height||map.costs.length!==map.tiles.length||
         map.tiles.some((t,i)=>!Number.isInteger(t)||t<0||t>4||costs[t]!==map.costs[i]||
           (costs[t]===0?1:0)!==map.terrain[i])||
         !Array.isArray(map.resources)||map.resources.length>16||
         !Array.isArray(map.spawns)||map.spawns.length!==2||
         !Array.isArray(map.bases)||map.bases.length!==2||!map.victory)
        throw Error("Invalid versioned native map data");
      const inBounds=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&
        p.x>=0&&p.y>=0&&p.x<map.width&&p.y<map.height;
      const rect=r=>inBounds(r)&&Number.isInteger(r.w)&&Number.isInteger(r.h)&&
        r.w>0&&r.h>0&&r.x+r.w<=map.width&&r.y+r.h<=map.height;
      const contained=(r,p)=>p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.w&&p.y<r.y+r.h;
      if(!rect(map.victory))throw Error("Invalid victory bounds");
      for(let i=0;i<2;i++){
        const base=map.bases[i],zone=map.spawns[i];
        if(!rect(zone)||zone.house!==i+1||!inBounds(base)||base.house!==i+1||
           !contained(zone,base)||map.terrain[base.y*map.width+base.x]!==0)
          throw Error("Invalid native starting bases");
      }
      const seen=new Set();
      for(const item of map.resources){
        if(!inBounds(item)||!Number.isInteger(item.amount)||item.amount<1||item.amount>100000||
           map.terrain[item.y*map.width+item.x]!==0||seen.has(item.y*map.width+item.x))
          throw Error("Invalid native resource node");
        seen.add(item.y*map.width+item.x);
      }
    }
    if(!Array.isArray(snapshot.entities)||!Array.isArray(snapshot.events)||
       !Number.isInteger(snapshot.selectedEntityId)||!Number.isInteger(snapshot.cargo)||
       !["playing","won","lost"].includes(snapshot.phase))throw Error("Invalid snapshot state");
    const seen=new Set();
    for(const e of snapshot.entities){
      if(!e||!Number.isSafeInteger(e.id)||e.id<=0||seen.has(e.id)||!kinds.has(e.kind)||
         !Number.isInteger(e.ownerId)||!Number.isInteger(e.teamId)||
         !Number.isInteger(e.x)||!Number.isInteger(e.y)||
         e.x<0||e.y<0||e.x>=map.width||e.y>=map.height||
         !Number.isInteger(e.hp)||typeof e.active!=="boolean"||
         (e.order!==null&&(!e.order||!Number.isInteger(e.order.x)||!Number.isInteger(e.order.y))))
        throw Error("Invalid or duplicate snapshot entity");
      seen.add(e.id);
    }
    if(!seen.has(snapshot.selectedEntityId))throw Error("Unknown selected entity");
    if(snapshot.commandStates!==undefined){
      const orderKinds=new Set(["move","attack_move","stop","hold","guard","patrol"]);
      const orderStatuses=new Set(["idle","moving","waiting","holding","guarding","patrolling","unreachable","dead"]);
      if(!Array.isArray(snapshot.commandStates)||snapshot.commandStates.some(o=>
        !o||!seen.has(o.entityId)||!orderKinds.has(o.kind)||!orderStatuses.has(o.status)||
        !Number.isInteger(o.x)||!Number.isInteger(o.y)||
        !Number.isInteger(o.queued)||o.queued<0||o.queued>8))
        throw Error("Invalid native command state");
      if(new Set(snapshot.commandStates.map(o=>o.entityId)).size!==snapshot.commandStates.length)
        throw Error("Duplicate native command state");
    }
    for(const e of snapshot.events){
      if(!e||!events.has(e.type)||!Number.isSafeInteger(e.tick)||
         e.tick>snapshot.tick||!Number.isInteger(e.entityId)||
         (e.sourceId!==undefined&&(!Number.isInteger(e.sourceId)||e.sourceId<0))||
         (e.weaponId!==undefined&&(!Number.isInteger(e.weaponId)||e.weaponId<0))||
         typeof e.code!=="string")throw Error("Invalid typed event");
    }
    if(current&&snapshot.tick<current.tick&&
       !snapshot.events.some(e=>e.type==="restart"))throw Error("Snapshot tick regressed without restart");
    return snapshot;
  }
  function freeze(value){
    if(value&&typeof value==="object"){
      Object.keys(value).forEach(key=>freeze(value[key]));
      Object.freeze(value);
    }
    return value;
  }
  function receive(serialized){
    // Runtime adapter passes a JSON string across the WASM boundary.
    const next=check(typeof serialized==="string"?JSON.parse(serialized):serialized);
    current=freeze(next);
    history=freeze([...history,...current.events].slice(-256));
    if(listener)listener(current);
    return current;
  }
  function subscribe(callback){
    if(callback!==null&&typeof callback!=="function")throw Error("Expected snapshot observer");
    listener=callback;
  }
  function latest(){return current;}
  function eventHistory(){return history;}
  function clear(){current=null;history=Object.freeze([]);}
  return {VERSION,MAP_VERSION,receive,subscribe,latest,eventHistory,clear};
});
