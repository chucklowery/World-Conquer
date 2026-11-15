"use strict";
// One-way native C++ -> HUD projection. Never calculates a movement step or
// sends orders. The C++ contract is the only producer of these snapshots.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCRTS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const VERSION=1;
  let current=null,listener=null,history=Object.freeze([]);
  const kinds=new Set(["infantry","vehicle","supply","extraction"]);
  const events=new Set(["command","selection","position","health","pickup","phase","restart",
    "shot","hit","damage","death"]);
  function check(snapshot){
    if(!snapshot||snapshot.version!==VERSION||!Number.isSafeInteger(snapshot.tick)||snapshot.tick<0)
      throw Error("Unsupported simulation snapshot version or tick");
    const map=snapshot.map;
    if(!map||!Number.isInteger(map.width)||!Number.isInteger(map.height)||
       map.width<=0||map.height<=0||!Array.isArray(map.terrain)||
       map.terrain.length!==map.width*map.height||
       map.terrain.some(t=>t!==0&&t!==1))throw Error("Invalid snapshot terrain");
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
  return {VERSION,receive,subscribe,latest,eventHistory,clear};
});
