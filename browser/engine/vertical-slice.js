"use strict";
// Original-content, self-contained tactical vertical slice. This is a browser
// gameplay prototype; no proprietary game archives and no C++ mission claims.
(function(root, factory) {
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.WCVerticalSlice=api;
})(typeof globalThis!=="undefined"?globalThis:this, function(){
  const width=18,height=11;
  const walls=new Set(["5,2","5,3","5,4","5,5","5,6","9,5","10,5","11,5","12,5","12,6","12,7","3,8","4,8","5,8"]);
  const key=(x,y)=>`${x},${y}`;
  const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  function start(){
    return {width,height,walls:new Set(walls),selected:0,frame:0,phase:"playing",cargo:0,
      message:"Recover both supply crates, then reach the Courier extraction zone.",
      units:[{id:"scout",x:1,y:2,hp:5,team:"player",label:"Scout",path:[]},
             {id:"ranger",x:2,y:3,hp:6,team:"player",label:"Ranger",path:[]},
             {id:"guard-a",x:10,y:2,hp:3,team:"enemy",label:"Sentry",path:[]},
             {id:"guard-b",x:14,y:6,hp:3,team:"enemy",label:"Sentry",path:[]}],
      crates:[{x:7,y:2,found:false},{x:15,y:4,found:false}],exit:{x:16,y:9}};
  }
  function inside(s,x,y){return x>=0&&y>=0&&x<s.width&&y<s.height&&!s.walls.has(key(x,y));}
  function path(s,origin,target,blocked){
    if(!inside(s,target.x,target.y)||blocked.has(key(target.x,target.y)))return [];
    const source=key(origin.x,origin.y),goal=key(target.x,target.y);
    const queue=[{x:origin.x,y:origin.y}],seen=new Set([source]),previous=new Map();
    for(let n=0;n<queue.length;n++){
      const p=queue[n];if(key(p.x,p.y)===goal)break;
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
        const x=p.x+dx,y=p.y+dy,k=key(x,y);
        if(!inside(s,x,y)||blocked.has(k)||seen.has(k))continue;
        seen.add(k);previous.set(k,key(p.x,p.y));queue.push({x,y});
      }
    }
    if(!seen.has(goal))return [];
    const result=[];let k=goal;
    while(k!==source){const [x,y]=k.split(",").map(Number);result.unshift({x,y});k=previous.get(k);}
    return result;
  }
  function select(s,x,y){
    if(s.phase!=="playing")return false;
    const i=s.units.findIndex(u=>u.team==="player"&&u.hp>0&&u.x===x&&u.y===y);
    if(i>=0){s.selected=i;s.message=`${s.units[i].label} selected. Click a tile to move.`;return true;}
    const u=s.units[s.selected];if(!u||u.hp<=0)return false;
    const blocked=new Set(s.units.filter(v=>v.hp>0&&v!==u).map(v=>key(v.x,v.y)));
    u.path=path(s,u,{x,y},blocked);
    s.message=u.path.length?`${u.label}: moving ${u.path.length} tiles.`:"No clear route to that tile.";
    return u.path.length>0;
  }
  function tick(s){
    if(s.phase!=="playing")return s;
    s.frame++;
    const living=s.units.filter(u=>u.hp>0),players=living.filter(u=>u.team==="player");
    if(!players.length){s.phase="lost";s.message="Squad lost. Restart to retry.";return s;}
    // Player movement takes priority, with occupied tiles protected.
    for(const unit of players){
      const next=unit.path[0];if(!next)continue;
      if(living.some(u=>u!==unit&&u.x===next.x&&u.y===next.y)){unit.path=[];continue;}
      unit.x=next.x;unit.y=next.y;unit.path.shift();
    }
    for(const crate of s.crates){
      if(!crate.found&&players.some(p=>distance(p,crate)<=1)){
        crate.found=true;s.cargo++;s.message=`Supplies recovered (${s.cargo}/2).`;
      }
    }
    // Deterministic, deliberately simple sentry movement and contact combat.
    for(const enemy of living.filter(u=>u.team==="enemy")){
      const targets=players.filter(p=>p.hp>0).sort((a,b)=>distance(a,enemy)-distance(b,enemy));
      const nearest=targets[0];if(!nearest)break;
      if(distance(enemy,nearest)===1){
        if(s.frame%4===0){nearest.hp--;s.message=`${nearest.label} hit by a sentry (${nearest.hp} HP).`;}
      }else if(s.frame%3===0&&distance(enemy,nearest)<=6){
        const occupied=new Set(living.filter(u=>u!==enemy&&u.hp>0).map(u=>key(u.x,u.y)));
        const candidates=[[1,0],[-1,0],[0,1],[0,-1]]
          .map(([dx,dy])=>({x:enemy.x+dx,y:enemy.y+dy}))
          .filter(v=>inside(s,v.x,v.y)&&!occupied.has(key(v.x,v.y)))
          .sort((a,b)=>distance(a,nearest)-distance(b,nearest));
        if(candidates[0]&&distance(candidates[0],nearest)<distance(enemy,nearest))
          Object.assign(enemy,candidates[0]);
      }
    }
    // Adjacent squad members automatically defend against sentries.
    if(s.frame%3===0)for(const p of players.filter(u=>u.hp>0)){
      const enemy=s.units.find(u=>u.team==="enemy"&&u.hp>0&&distance(u,p)===1);
      if(enemy){enemy.hp--;s.message=`${p.label} engaged ${enemy.label}.`;}
    }
    if(!players.some(p=>p.hp>0)){s.phase="lost";s.message="Squad lost. Restart to retry.";}
    else if(s.cargo===2&&players.some(p=>p.hp>0&&distance(p,s.exit)<=1)){
      s.phase="won";s.message="Mission accomplished: both supplies aboard the Courier!";
    }
    return s;
  }
  function render(ctx,s,aircraft){
    const w=ctx.canvas.width,h=ctx.canvas.height,tile=Math.min(w/s.width,h/s.height);
    ctx.clearRect(0,0,w,h);ctx.fillStyle="#101e27";ctx.fillRect(0,0,w,h);
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
      const blocked=s.walls.has(key(x,y));
      ctx.fillStyle=blocked?"#49535c":(x+y)%2?"#304a43":"#345249";
      ctx.fillRect(x*tile+1,y*tile+1,tile-2,tile-2);
      if(blocked){ctx.fillStyle="#6d7a77";ctx.fillRect(x*tile+5,y*tile+5,tile-10,4);}
    }
    ctx.fillStyle="#7eafbb";ctx.fillRect((s.exit.x-1)*tile,(s.exit.y-1)*tile,3*tile,2*tile);
    if(aircraft)ctx.drawImage(aircraft,(s.exit.x-2)*tile,(s.exit.y-2)*tile,4*tile,4*tile);
    else{ctx.fillStyle="#b2dfd4";ctx.fillRect((s.exit.x-.4)*tile,(s.exit.y-.8)*tile,.8*tile,1.6*tile);}
    for(const c of s.crates)if(!c.found){ctx.fillStyle="#eec77a";ctx.fillRect((c.x+.2)*tile,(c.y+.2)*tile,.6*tile,.6*tile);}
    for(const u of s.units)if(u.hp>0){
      const px=(u.x+.5)*tile,py=(u.y+.5)*tile;
      ctx.beginPath();ctx.arc(px,py,tile*.32,0,Math.PI*2);
      ctx.fillStyle=u.team==="player"?"#63e2af":"#e77f78";ctx.fill();
      ctx.lineWidth=s.units[s.selected]===u?4:1.5;
      ctx.strokeStyle=s.units[s.selected]===u?"#ffffff":"#172d36";ctx.stroke();
      ctx.fillStyle="#102020";ctx.font=`bold ${Math.floor(tile*.33)}px sans-serif`;
      ctx.textAlign="center";ctx.fillText(String(u.hp),px,py+tile*.12);
    }
    return tile;
  }
  return {start,inside,path,select,tick,render};
});
