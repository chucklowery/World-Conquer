"use strict";
// Original-content minimap model. It observes native engine messages; it does
// not simulate gameplay or issue movement orders on behalf of the engine.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCTacticalHUD=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const WIDTH=18,HEIGHT=11;
  const colors=["#254735","#627160","#80694b","#386873","#5c546b"];
  const tokens={S:0,R:1,A:2,B:3};
  function create(source){
    let parsed=null;
    if(typeof source==="string"){
      try{
        const pack=typeof WCMissionPack!=="undefined"?WCMissionPack:require("./mission-pack");
        parsed=pack.validate(source);
      }catch(error){throw Error("Invalid tactical minimap grid: "+error.message);}
    }
    const width=parsed?parsed.width:WIDTH,height=parsed?parsed.height:HEIGHT;
    const units=[{x:1,y:2,hp:5},{x:2,y:3,hp:6},{x:10,y:2,hp:3},{x:14,y:6,hp:3}];
    const crates=[{x:7,y:2},{x:15,y:4}];
    const exit={x:16,y:9};
    const terrain=parsed?parsed.tiles.slice():Array(WIDTH*HEIGHT).fill(0);
    if(!parsed)for(const [x,y] of [[5,2],[5,3],[5,4],[5,5],[5,6],
      [9,5],[10,5],[11,5],[12,5],[12,6],[12,7],[3,8],[4,8],[5,8]])
      terrain[y*WIDTH+x]=1;
    const blocked=new Set(terrain.flatMap((type,i)=>[1,4].includes(type)?[i]:[]));
    if(parsed){
      for(const [name,i] of Object.entries(tokens))units[i]={...units[i],...parsed.markers[name]};
      for(let i=0;i<2;i++)crates[i]={...parsed.markers[String(i+1)]};
      Object.assign(exit,parsed.markers.X);
    }
    const spawn=units.map(u=>({...u}));
    return {width,height,blocked,terrain,resources:parsed?parsed.resources:[],
      bases:parsed?parsed.bases:[],spawns:parsed?parsed.spawns:[],victory:parsed?parsed.victory:null,
      mapId:parsed?parsed.id:"courier-extraction",title:parsed?parsed.title:"Courier Extraction",
      units,spawn,types:["infantry","infantry","infantry","infantry"],crates,collected:[false,false],
      exit,cargo:0,selected:0,inspect:null,lastCombat:null,orderMode:false};
  }
  function reset(model){
    model.units=model.spawn.map(u=>({...u}));
    model.cargo=0;model.collected=[false,false];model.selected=0;model.inspect=null;model.lastCombat=null;
    model.types=["infantry","infantry","infantry","infantry"];
    model.orderMode=false;
  }
  function observe(model,line){
    const value=String(line);
    if(value.includes("[browser-engine-courier] mission restarted")){reset(model);return true;}
    const moved=value.match(/\[browser-engine-courier\] (?:moved|sentry moved) unit=([0-3]) x=(\d+) y=(\d+)/);
    if(moved){
      const index=Number(moved[1]),x=Number(moved[2]),y=Number(moved[3]);
      if(x<model.width&&y<model.height){model.units[index].x=x;model.units[index].y=y;return true;}
    }
    const damage=value.match(/\[browser-engine-courier\] combat unit=([0-3]) hp=(-?\d+)/);
    if(damage){model.units[Number(damage[1])].hp=Number(damage[2]);return true;}
    const cargo=value.match(/\[browser-native-slice\] crates=([0-2])\/2/);
    if(cargo){model.cargo=Number(cargo[1]);return true;}
    const pickup=value.match(/\[browser-engine-courier\] crate collected=([01])/);
    if(pickup){model.collected[Number(pickup[1])]=true;return true;}
    const selected=value.match(/\[browser-engine-courier\] selected unit=([01])/)||
      value.match(/\[browser-native-slice\] click x=\d+ y=\d+ selected=([01])/);
    if(selected){model.selected=Number(selected[1]);return true;}
    return false;
  }
  // R00's native mode takes full authoritative snapshots, never log deltas.
  // The legacy observer above remains for historical standalone diagnostics.
  function applySnapshot(model,snapshot){
    if(!snapshot||![1,2].includes(snapshot.version)||!snapshot.map)
      throw Error("Unsupported tactical snapshot");
    model.width=snapshot.map.width;model.height=snapshot.map.height;
    model.worldMode=false;
    const ids=[1001,1002,2001,2002];
    model.units=ids.map(id=>{
      const u=snapshot.entities.find(entity=>entity.id===id&&
        (entity.kind==="infantry"||(id>=2000&&entity.kind==="vehicle")));
      if(!u)throw Error("Missing native combatant "+id);
      return {x:u.x,y:u.y,hp:u.hp};
    });
    model.types=ids.map(id=>snapshot.entities.find(entity=>entity.id===id).kind);
    model.crates=[3001,3002].map(id=>{
      const e=snapshot.entities.find(entity=>entity.id===id&&entity.kind==="supply");
      if(!e)throw Error("Missing native supply "+id);
      return {x:e.x,y:e.y};
    });
    model.collected=[3001,3002].map(id=>!snapshot.entities.find(e=>e.id===id).active);
    const exit=snapshot.entities.find(e=>e.id===4001&&e.kind==="extraction");
    if(!exit)throw Error("Missing native extraction");
    model.exit={x:exit.x,y:exit.y};
    model.blocked=new Set(snapshot.map.terrain.flatMap((tile,i)=>tile===1?[i]:[]));
    model.terrain=snapshot.map.tiles?snapshot.map.tiles.slice():snapshot.map.terrain.slice();
    model.resources=snapshot.map.resources||[];
    model.bases=snapshot.map.bases||[];model.spawns=snapshot.map.spawns||[];
    model.victory=snapshot.map.victory||null;
    model.mapId=snapshot.map.id||"courier-extraction";
    model.title=snapshot.map.title||"Courier Extraction";
    model.selected=ids.indexOf(snapshot.selectedEntityId);
    if(model.selected<0||model.selected>1)throw Error("Invalid native selection");
    model.cargo=snapshot.cargo;
    if(snapshot.events.some(event=>event.type==="restart")){
      model.inspect=null;model.lastCombat=null;
    }
    model.orderMode=false;
    for(const event of snapshot.events)if(["shot","hit","damage","death"].includes(event.type))
      model.lastCombat={type:event.type,sourceId:event.sourceId,targetId:event.entityId,
        weaponId:event.weaponId,value:event.value,tick:event.tick};
    return model;
  }
  function applyOrdersSnapshot(model,snapshot){
    if(!snapshot||snapshot.version!==1||snapshot.map.width!==WIDTH||
       snapshot.map.height!==HEIGHT||!Array.isArray(snapshot.commandStates))
      throw Error("Unsupported production command snapshot");
    const ids=[1001,1002,1003,1004];
    model.worldMode=false;
    model.units=ids.map(id=>{
      const e=snapshot.entities.find(e=>e.id===id&&e.kind==="infantry");
      if(!e)throw Error("Missing production infantry "+id);
      return {x:e.x,y:e.y,hp:e.hp};
    });
    model.orderMode=true;model.crates=[];model.collected=[];model.cargo=0;
    model.types=["infantry","infantry","infantry","infantry"];
    model.lastCombat=null;
    model.blocked=new Set(snapshot.map.terrain.flatMap((tile,i)=>tile===1?[i]:[]));
    model.terrain=snapshot.map.terrain.slice();
    model.selected=ids.indexOf(snapshot.selectedEntityId);
    if(model.selected<0)throw Error("Invalid production selection");
    return model;
  }
  function applyWorldSnapshot(model,snapshot){
    if(!snapshot||snapshot.version!==3||!snapshot.map||!Array.isArray(snapshot.houses))
      throw Error("Unsupported R18 tactical snapshot");
    model.width=snapshot.map.width;model.height=snapshot.map.height;
    model.worldMode=true;model.orderMode=false;
    const actors=snapshot.entities.filter(e=>e.kind!=="resource");
    model.units=actors.map(e=>({x:e.x,y:e.y,hp:e.hp}));
    model.types=actors.map(e=>e.kind);
    model.teams=actors.map(e=>e.teamId);
    model.unitIds=actors.map(e=>e.id);
    model.selected=model.unitIds.indexOf(snapshot.selectedEntityId);
    model.terrain=(snapshot.map.tiles||snapshot.map.terrain).slice();
    model.blocked=new Set(snapshot.map.terrain.flatMap((t,i)=>t===1?[i]:[]));
    model.resources=snapshot.map.resources||[];
    model.spawns=snapshot.map.spawns||[];
    model.bases=snapshot.map.bases||[];
    model.victory=snapshot.map.victory||null;
    model.mapId=snapshot.map.id||"rts-world";
    model.title=snapshot.map.title||"Native RTS World";
    model.crates=[];model.collected=[];model.cargo=0;
    model.lastCombat=null;
    for(const event of snapshot.events)if(["shot","hit","damage","death"].includes(event.type))
      model.lastCombat={type:event.type,sourceId:event.sourceId,targetId:event.entityId,
        weaponId:event.weaponId,value:event.value,tick:event.tick};
    return model;
  }
  function inspect(model,x,y){
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=model.width||y<0||y>=model.height)return "Outside map";
    model.inspect={x,y};
    const who=model.units.findIndex(u=>u.hp>0&&u.x===x&&u.y===y);
    if(who>=0&&model.worldMode)return `${model.teams[who]===1?"Aster":"Forge"} ${model.types[who]} #${model.unitIds[who]}`;
    if(who>=0)return model.orderMode?("Infantry "+(who+1)):
      model.types[who]==="vehicle"?
      (who===2?"Armored sentry A":"Armored sentry B"):
      ["Scout","Ranger","Sentry A","Sentry B"][who];
    if(model.crates.some((p,i)=>!model.collected[i]&&p.x===x&&p.y===y))return "Supply cache";
    if(model.exit.x===x&&model.exit.y===y)return "Extraction zone";
    if(model.resources.some(r=>r.x===x&&r.y===y))return "Resource node";
    if(model.bases.some(b=>b.x===x&&b.y===y))return "Starting base";
    if(model.blocked.has(y*model.width+x))return "Blocked terrain";
    if(model.terrain[y*model.width+x]===2)return "Rough terrain · cost 2";
    if(model.terrain[y*model.width+x]===3)return "Marsh terrain · cost 3";
    return "Clear terrain";
  }
  function draw(canvas,model,viewport){
    if(!canvas||!model)return;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    const w=canvas.width/model.width,h=canvas.height/model.height;
    ctx.fillStyle="#07130f";ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<model.height;y++)for(let x=0;x<model.width;x++){
      const tile=model.terrain[y*model.width+x];
      ctx.fillStyle=colors[tile]||colors[0];
      ctx.fillRect(x*w+1,y*h+1,w-2,h-2);
    }
    if(!model.orderMode){
      for(const r of model.resources){
        ctx.fillStyle="#b6df70";ctx.fillRect((r.x+.25)*w,(r.y+.25)*h,w*.5,h*.5);
      }
      for(const b of model.bases){
        ctx.strokeStyle=b.house===1?"#6ef1bc":"#ffa379";
        ctx.lineWidth=1;ctx.strokeRect(b.x*w+1,b.y*h+1,w-2,h-2);
      }
      for(const zone of model.spawns){
        ctx.strokeStyle=zone.house===1?"#3b8c71":"#9c5a50";
        ctx.lineWidth=1;
        ctx.strokeRect(zone.x*w+1,zone.y*h+1,zone.w*w-2,zone.h*h-2);
      }
      if(model.victory){
        ctx.strokeStyle="#73b4bb";ctx.lineWidth=2;
        ctx.strokeRect(model.victory.x*w+1,model.victory.y*h+1,
          model.victory.w*w-2,model.victory.h*h-2);
      }
      if(!model.worldMode){
        ctx.fillStyle="#73b4bb";
        ctx.fillRect(model.exit.x*w+2,model.exit.y*h+2,w-4,h-4);
      }
    }
    for(let i=0;!model.orderMode&&!model.worldMode&&i<2;i++)if(!model.collected[i]){
      const p=model.crates[i];ctx.fillStyle="#edbd57";
      ctx.fillRect(p.x*w+w*.25,p.y*h+h*.25,w*.5,h*.5);
    }
    model.units.forEach((u,i)=>{
      if(u.hp<=0)return;
      ctx.fillStyle=model.worldMode?(model.teams[i]===1?"#7aebbc":"#fb7168"):
        model.orderMode?"#7aebbc":i>=2?"#fb7168":"#7aebbc";
      if(model.types[i]==="vehicle")ctx.fillRect((u.x+.18)*w,(u.y+.2)*h,w*.64,h*.6);
      else{ctx.beginPath();ctx.arc((u.x+.5)*w,(u.y+.5)*h,Math.max(3,Math.min(w,h)*.3),0,Math.PI*2);
        ctx.fill();}
      if(i===model.selected){ctx.strokeStyle="#f0f7f0";ctx.lineWidth=2;
        if(model.types[i]==="vehicle")ctx.strokeRect((u.x+.15)*w,(u.y+.15)*h,w*.7,h*.7);
        else ctx.stroke();}
    });
    if(model.inspect){
      ctx.strokeStyle="#ffe3a6";ctx.lineWidth=2;
      ctx.strokeRect(model.inspect.x*w+1,model.inspect.y*h+1,w-2,h-2);
    }
    // R01 camera indicator is presentation-only and uses the native map scale.
    if(viewport){
      ctx.fillStyle="#ddffcb20";ctx.strokeStyle="#e7ffd6";ctx.lineWidth=2;
      const x=viewport.x/40*w,y=viewport.y/40*h;
      const width=viewport.width/40*w,height=viewport.height/40*h;
      ctx.fillRect(x,y,width,height);
      ctx.strokeRect(x+1,y+1,Math.max(0,width-2),Math.max(0,height-2));
    }
  }
  return {create,reset,observe,applySnapshot,applyOrdersSnapshot,applyWorldSnapshot,inspect,draw};
});
