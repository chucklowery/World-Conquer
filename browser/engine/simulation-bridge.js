"use strict";
// One-way native C++ -> HUD projection. Never calculates a movement step or
// sends orders. The C++ contract is the only producer of these snapshots.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCRTS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const VERSION=1,MAP_VERSION=2,WORLD_VERSION=3;
  let current=null,listener=null,history=Object.freeze([]);
  const kinds=new Set(["infantry","vehicle","supply","extraction"]);
  const events=new Set(["command","selection","position","health","pickup","phase","restart",
    "shot","hit","damage","death"]);
  const worldEvents=new Set(["command","spawn","selection","order","position",
    "shot","hit","damage","death","despawn","restart"]);
  const worldRoles=new Set(["infantry","vehicle","structure","resource"]);
  // Reviewed R05 asset bindings: visual keys describe artwork, not gameplay.
  // Keep this mirror in sync with native knownR05Visual() and the R05 roster.
  const worldVisuals=Object.freeze({
    "r05.aster.ranger":["aster","infantry",1,1],
    "r05.aster.rover":["aster","vehicle",1,1],
    "r05.aster.hub":["aster","structure",3,2],
    "r05.forge.ranger":["forge","infantry",1,1],
    "r05.forge.rover":["forge","vehicle",1,1],
    "r05.forge.hub":["forge","structure",3,2],
    "r05.world.crystal":["neutral","resource",1,1]
  });
  const worldCodes=new Set(["accepted","invalid_epoch","invalid_tick","duplicate_sequence",
    "unknown_house","unknown_entity","unknown_definition","not_owned","bad_team",
    "dead","bad_target","blocked","occupied","queue_full","capacity","wrong_faction","unreachable"]);
  function checkWorld(s){
    if(!Number.isInteger(s.epoch)||s.epoch<1||s.epoch>4095||
       s.definitionSchemaVersion!==1||!Number.isSafeInteger(s.tick)||s.tick<0)
      throw Error("Invalid native world epoch or schema");
    const map=s.map;
    if(!map||!Number.isInteger(map.width)||!Number.isInteger(map.height)||
       map.width<8||map.height<8||map.width>128||map.height>128||
       map.width*map.height>4096||!Array.isArray(map.terrain)||
       map.terrain.length!==map.width*map.height||
       map.terrain.some(v=>v!==0&&v!==1))throw Error("Invalid native world map");
    if(map.id!==undefined){
      const cost=[1,0,2,3,0];
      const point=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&
        p.x>=0&&p.y>=0&&p.x<map.width&&p.y<map.height;
      const rect=r=>point(r)&&Number.isInteger(r.w)&&Number.isInteger(r.h)&&
        r.w>0&&r.h>0&&r.x+r.w<=map.width&&r.y+r.h<=map.height;
      if(typeof map.id!=="string"||!/^[a-z0-9-]{1,64}$/.test(map.id)||
         typeof map.title!=="string"||!map.title.length||map.title.length>64||
         typeof map.biome!=="string"||!map.biome.length||map.biome.length>64||
         !Array.isArray(map.tiles)||map.tiles.length!==map.terrain.length||
         !Array.isArray(map.costs)||map.costs.length!==map.terrain.length||
         map.tiles.some((t,i)=>!Number.isInteger(t)||t<0||t>4||
           map.costs[i]!==cost[t]||map.terrain[i]!==Number(cost[t]===0))||
         !Array.isArray(map.resources)||map.resources.length>16||
         !Array.isArray(map.spawns)||map.spawns.length!==2||
         !Array.isArray(map.bases)||map.bases.length!==2||
         !rect(map.victory))throw Error("Invalid native world map metadata");
      for(let i=0;i<2;i++){
        const z=map.spawns[i],b=map.bases[i];
        if(!rect(z)||z.house!==i+1||!point(b)||b.house!==i+1||
           b.x<z.x||b.y<z.y||b.x>=z.x+z.w||b.y>=z.y+z.h||
           map.terrain[b.y*map.width+b.x])throw Error("Invalid native world spawns");
      }
      const resourceCells=new Set();
      for(const r of map.resources){
        const cell=r?.y*map.width+r?.x;
        if(!point(r)||!Number.isInteger(r.amount)||r.amount<1||r.amount>100000||
           map.terrain[cell]||resourceCells.has(cell))
          throw Error("Invalid native world resource");
        resourceCells.add(cell);
      }
    }
    if(!Array.isArray(s.houses)||!s.houses.length||s.houses.length>16||
       !Array.isArray(s.definitions)||!s.definitions.length||s.definitions.length>64||
       !Array.isArray(s.entities)||s.entities.length>256||
       !Array.isArray(s.events)||s.events.length>256||
       !Number.isInteger(s.selectedEntityId)||s.selectedEntityId<0||
       !["playing","won","lost"].includes(s.phase)||s.cargo!==0)
      throw Error("Invalid native world state");
    const houses=new Map(),definitions=new Map(),entities=new Map(),occupied=new Set();
    for(const h of s.houses){
      if(!h||!Number.isInteger(h.id)||h.id<1||h.id>65535||
         !Number.isInteger(h.teamId)||h.teamId<1||h.teamId>65535||
         !["aster","forge"].includes(h.faction)||houses.has(h.id))
        throw Error("Invalid native world house");
      houses.set(h.id,h);
    }
    const key=/^[a-z0-9.-]{1,64}$/;
    for(const d of s.definitions){
      const visual=worldVisuals[d?.visualKey];
      if(!d||typeof d.id!=="string"||!d.id.startsWith("game.")||!key.test(d.id)||
         definitions.has(d.id)||!["aster","forge","neutral"].includes(d.faction)||
         !worldRoles.has(d.role)||d.kind!==d.role||
         typeof d.visualKey!=="string"||!key.test(d.visualKey)||
         !visual||visual[0]!==d.faction||visual[1]!==d.role||
         !Number.isInteger(d.width)||d.width<1||d.width>4||
         !Number.isInteger(d.height)||d.height<1||d.height>4||
         visual[2]!==d.width||visual[3]!==d.height||
         !Number.isInteger(d.maxHp)||d.maxHp<1||d.maxHp>10000||
         (d.faction==="neutral")!==(d.role==="resource"))
        throw Error("Invalid native world definition");
      definitions.set(d.id,d);
    }
    let lastId=0;
    for(const e of s.entities){
      const def=definitions.get(e?.definitionId);
      const house=houses.get(e?.ownerId);
      if(!e||!Number.isInteger(e.id)||e.id<1||e.id>0xffffffff||
         Math.floor(e.id/1048576)!==s.epoch||e.id%1048576===0||
         e.id<=lastId||entities.has(e.id)||!def||
         e.visualKey!==def.visualKey||e.kind!==def.role||
         !Number.isInteger(e.ownerId)||!Number.isInteger(e.teamId)||
         (e.ownerId===0?(e.teamId!==0||def.faction!=="neutral"):
           (!house||house.teamId!==e.teamId||house.faction!==def.faction))||
         !Number.isInteger(e.x)||!Number.isInteger(e.y)||
         e.x<0||e.y<0||e.x+def.width>map.width||e.y+def.height>map.height||
         !Number.isInteger(e.hp)||e.hp<0||e.hp>def.maxHp||
         !["alive","dead","despawned"].includes(e.lifecycle)||
         typeof e.active!=="boolean"||(e.lifecycle==="alive")!==e.active||
         (e.lifecycle==="dead"&&e.hp!==0)||
         (e.order!==null&&(!e.order||!Number.isInteger(e.order.x)||
           !Number.isInteger(e.order.y)||!Number.isInteger(e.order.target)||
           e.order.x<0||e.order.y<0||e.order.x>=map.width||e.order.y>=map.height))||
         (!e.active&&e.order!==null))
        throw Error("Invalid native world entity");
      lastId=e.id;
      if(e.active)for(let y=e.y;y<e.y+def.height;y++)
        for(let x=e.x;x<e.x+def.width;x++){
          const cell=y*map.width+x;
          if(map.terrain[cell]!==0||occupied.has(cell))
            throw Error("Invalid native world occupancy");
          occupied.add(cell);
        }
      entities.set(e.id,e);
    }
    if(s.selectedEntityId!==0&&(!entities.has(s.selectedEntityId)||
       !entities.get(s.selectedEntityId).active))throw Error("Invalid world selection");
    if(s.commandStates!==undefined){
      const kinds=new Set(["move","attack_move","stop","hold","guard","patrol","attack"]);
      const statuses=new Set(["idle","moving","waiting","holding","guarding","patrolling","attacking","unreachable","dead"]);
      const seen=new Set();
      if(!Array.isArray(s.commandStates)||s.commandStates.length>256)
        throw Error("Invalid native world command states");
      for(const c of s.commandStates){
        const actor=entities.get(c?.entityId);
        if(!c||!actor?.active||actor.kind==="resource"||seen.has(c.entityId)||
           !kinds.has(c.kind)||!statuses.has(c.status)||
           !Number.isInteger(c.x)||!Number.isInteger(c.y)||
           c.x<0||c.y<0||c.x>=map.width||c.y>=map.height||
           !Number.isInteger(c.queued)||c.queued<0||c.queued>8||
           (actor.order===null)!==(c.kind==="stop")||
           (actor.order!==null&&(actor.order.x!==c.x||actor.order.y!==c.y))||
           (c.kind==="stop"&&(c.queued!==0||!["idle","unreachable"].includes(c.status)))||
           (c.kind==="attack"&&c.status!=="attacking")||
           (c.kind==="hold"&&c.status!=="holding")||
           (c.kind==="guard"&&!(["guarding","waiting"].includes(c.status)))||
           (c.kind==="patrol"&&!(["patrolling","waiting"].includes(c.status)))||
           (["move","attack_move"].includes(c.kind)&&
             !(["moving","waiting"].includes(c.status))))
          throw Error("Invalid native world command state");
        seen.add(c.entityId);
      }
    }
    for(const event of s.events){
      if(!event||!worldEvents.has(event.type)||event.epoch!==s.epoch||
         !Number.isSafeInteger(event.tick)||event.tick<0||event.tick>s.tick||
         !Number.isSafeInteger(event.sequence)||event.sequence<0||
         !Number.isInteger(event.entityId)||event.entityId<0||
         !Number.isInteger(event.sourceId)||event.sourceId<0||
         !Number.isInteger(event.weaponId)||event.weaponId<0||event.weaponId>65535||
         !Number.isInteger(event.x)||!Number.isInteger(event.y)||
         !Number.isInteger(event.value)||!worldCodes.has(event.code))
        throw Error("Invalid native world event");
    }
    if(current&&current.version===WORLD_VERSION){
      if(s.epoch<current.epoch||
         (s.epoch===current.epoch&&s.tick<current.tick)||
         (s.epoch>current.epoch&&
           (s.epoch!==current.epoch+1||!s.events.some(e=>e.type==="restart"))))
        throw Error("Invalid native world epoch progression");
    }
    return s;
  }
  function check(snapshot,allowWorldV3=false){
    if(snapshot?.version===WORLD_VERSION){
      if(!allowWorldV3)throw Error("Native world v3 requires negotiated consumer support");
      return checkWorld(snapshot);
    }
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
  function receive(serialized,options){
    // Runtime adapter passes a JSON string across the WASM boundary.
    const next=check(typeof serialized==="string"?JSON.parse(serialized):serialized,
      options?.allowWorldV3===true);
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
  return {VERSION,MAP_VERSION,WORLD_VERSION,receive,subscribe,latest,eventHistory,clear};
});
