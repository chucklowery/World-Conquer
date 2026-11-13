"use strict";

// Project-owned, deterministic, palette-indexed concept art for every catalog
// slot not covered by the source-audited representative-animation module.
// The small identity pips are intentional review markers, not final artwork.
const ARCHETYPES = {
  aircraft: ["fixed-wing", "rotorcraft", "transport"],
  building: ["wall", "road", "defense", "airfield", "industrial", "power", "civilian", "service"],
  effect: ["fire", "smoke", "explosion", "flash", "projectile-impact", "crate-glow", "creature-fall", "signal"],
  infantry: ["civilian", "trooper", "engineer", "commando", "specialist"],
  overlay: ["road", "wall", "resource", "crate", "decal"],
  projectile: ["rocket", "ballistic", "energy", "flame", "melee"],
  terrain: ["rock", "tree", "crystal", "scrub"],
  vehicle: ["armor", "light-wheeled", "hover", "naval", "harvester", "creature", "support"]
};
function archetype(item) {
  const name = item.engineEnum.toUpperCase();
  const is = regex => regex.test(name);
  switch (item.category) {
  case "vehicle":
    if (is(/RAPT|STEG|TREX|TRIC|VICE/)) return "creature";
    if (is(/GUNBOAT/)) return "naval";
    if (is(/HOVER/)) return "hover";
    if (is(/HARVESTER/)) return "harvester";
    if (is(/BIKE|BUGGY|JEEP/)) return "light-wheeled";
    if (is(/MCV|MHQ|APC/)) return "support";
    return "armor";
  case "aircraft": return is(/A10/) ? "fixed-wing" : is(/CARGO|TRANSPORT/) ? "transport" : "rotorcraft";
  case "infantry":
    if (is(/_C\d+$/)) return "civilian";
    if (is(/CHAN|MOEBIUS/)) return "engineer";
    if (is(/RAMBO|DELPHI/)) return "commando";
    return is(/_E\d+$/) ? "trooper" : "specialist";
  case "building":
    if (is(/WALL/)) return "wall";
    if (is(/ROAD/)) return "road";
    if (is(/ATOWER|GTOWER|TURRET|SAM|OBELISK|EYE|TEMPLE/)) return "defense";
    if (is(/AIRSTRIP|HELIPAD/)) return "airfield";
    if (is(/POWER/)) return "power";
    if (is(/REFINERY|PUMP|STORAGE|TANKER|WEAP/)) return "industrial";
    if (is(/_V\d+$/)) return "civilian";
    return "service";
  case "terrain": return is(/ROCK/) ? "rock" : is(/BLOSSOM/) ? "crystal" : is(/CLUMP/) ? "scrub" : "tree";
  case "overlay": return is(/ROAD|CONCRETE/) ? "road" : is(/WALL/) ? "wall" : is(/TIBERIUM/) ? "resource" : is(/CRATE/) ? "crate" : "decal";
  case "projectile": return is(/LASER|CHEM/) ? "energy" : is(/FLAME|NAPALM/) ? "flame" : is(/BITE|HEADBUTT/) ? "melee" : is(/_BULLET$|APDS|SNIPER|SPREADFIRE|GRENADE|_HE$/) ? "ballistic" : "rocket";
  case "effect":
    if (is(/CRATE/)) return "crate-glow";
    if (is(/SMOKE/)) return "smoke";
    if (is(/FIRE|FLAME|BURN|NAPALM/)) return "fire";
    if (is(/_DIE/)) return "creature-fall";
    if (is(/MUZZLE|PIFF|GUN_|ROT_GUN|MOVE_FLASH/)) return "flash";
    if (is(/BEACON|FLAG|LZ_/)) return "signal";
    if (is(/CHEM_|SAM_|GRENADE|FRAG|RAPID/)) return "projectile-impact";
    return "explosion";
  default: throw Error(`Unsupported art category ${item.category}`);
  }
}
function seedFor(item) {
  let v=2166136261;
  for(const c of item.engineEnum){v^=c.charCodeAt(0);v=Math.imul(v,16777619);}
  return v>>>0;
}
function draw(item,frame=0) {
  if(!Number.isInteger(frame)||frame<0||frame>=item.provisionalFrameCount)throw Error(`${item.id}: invalid art frame ${frame}`);
  const {width:w,height:h}=item, pixels=new Uint8Array(w*h), seed=seedFor(item), kind=archetype(item);
  const mid=w/2, phase=frame%16, ca=(frame%32)*Math.PI/16;
  const plot=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<w&&y<h)pixels[y*w+x]=c;};
  const rect=(x,y,sw,sh,c)=>{for(let yy=Math.floor(y);yy<y+sh;yy++)for(let xx=Math.floor(x);xx<x+sw;xx++)plot(xx,yy,c);};
  const line=(x1,y1,x2,y2,c,t=1)=>{const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)*2));for(let i=0;i<=n;i++)for(let dy=0;dy<t;dy++)for(let dx=0;dx<t;dx++)plot(x1+(x2-x1)*i/n+dx,y1+(y2-y1)*i/n+dy,c);};
  const disk=(x,y,r,c)=>{for(let dy=-Math.ceil(r);dy<=r;dy++)for(let dx=-Math.ceil(r);dx<=r;dx++)if(dx*dx+dy*dy<=r*r)plot(x+dx,y+dy,c);};
  const ellipse=(x,y,rx,ry,c)=>{for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++)if(dx*dx/(rx*rx)+dy*dy/(ry*ry)<=1)plot(x+dx,y+dy,c);};
  const local=(x,y,angle=ca)=>[mid+x*Math.cos(angle)-y*Math.sin(angle),h/2+x*Math.sin(angle)+y*Math.cos(angle)];
  const ll=(x1,y1,x2,y2,c,t=1,a=ca)=>line(...local(x1,y1,a),...local(x2,y2,a),c,t);
  const box=(cx,cy,rx,ry,c,a=ca)=>{const co=Math.cos(a),si=Math.sin(a);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xx=x-mid,yy=y-h/2,px=xx*co+yy*si,py=-xx*si+yy*co;if(Math.abs(px-cx)<=rx&&Math.abs(py-cy)<=ry)plot(x,y,c);}};
  const wobble=phase%4, accent=(seed%3)+3, variant=(seed>>>8)%5;
  if(item.category==="vehicle") {
    if(kind==="creature"){
      ellipse(mid,17,9+variant%3,5,3);ellipse(mid+7,13,4,3,5);
      line(mid-8,17,mid-15,10+wobble,6,2);line(mid+8,15,mid+12,10,7,2);
      for(let i=0;i<2;i++)line(mid-5+i*9,20,mid-7+i*11+(wobble%2)*3,28,6,3);
      for(let i=0;i<3+variant%3;i++)disk(mid-7+i*4,13-((i+variant)%3),1,7);
      plot(mid+9,12,1);
    }else if(kind==="naval"){
      ll(-10,7,10,7,5,4);box(0,1,6,4,3);box(0,-3,3,3,5);
      ll(0,-3,0,-12,7,2);ll(-11,10,11,10,4,1);
    }else if(kind==="light-wheeled"){
      box(0,0,5+variant%3,8,3);box(0,-2,3,4,5);
      for(let y of [-7,7])for(let x of [-6,6]){const p=local(x,y);disk(...p,2,6);}
      if(nameHas(item,"BIKE"))ll(0,-6,0,-11,7,2);
    }else{
      const hover=kind==="hover", support=kind==="support", harvester=kind==="harvester";
      box(-7,0,2,9,hover?4:6);box(7,0,2,9,hover?4:6);
      box(0,0,support?8:7,10,2);box(0,-2,5,7,3);
      if(harvester){ll(-5,-8,5,-8,6,2);for(let i=-4;i<=4;i+=2)ll(i,-8,i,-12,7,1);}
      else if(support){box(0,-3,5,4,5);ll(-5,5,5,5,7,2);}
      else {box(0,0,4,4,5);ll(0,-2,0,-12,7,2);}
      if(hover)ll(-11,10,11,10,4,2);
      if(nameHas(item,"ARTY"))ll(0,-2,0,-15,7,3);
      else if(nameHas(item,"FTANK")){box(-4,4,2,7,6);box(4,4,2,7,6);ll(0,-6,0,-12,7,3);}
      else if(nameHas(item,"HTANK")){ll(-3,-3,-3,-14,7,2);ll(3,-3,3,-14,7,2);}
      else if(nameHas(item,"LTANK")){box(0,2,3,5,5);ll(0,-5,0,-11,7,2);}
      else if(nameHas(item,"STANK")){ll(-8,8,0,-13,4,2);ll(8,8,0,-13,4,2);}
      else if(nameHas(item,"MLRS")){
        for(let y of [-5,-1])for(let x of [-4,1])box(x,y,1,2,7);
      }else if(nameHas(item,"MSAM")){box(-4,-4,2,5,5);box(4,-4,2,5,5);ll(-4,-4,-7,-12,7,2);ll(4,-4,7,-12,7,2);}
      else if(nameHas(item,"MCV")){ll(-5,6,8,-11,7,2);ll(8,-11,2,-12,7,1);}
      else if(nameHas(item,"MHQ")){ll(0,-3,0,-14,7,2);ll(-5,-10,5,-10,6,1);}
      else if(nameHas(item,"APC"))for(let y=-5;y<8;y+=4)box(5,y,1,1,7);
      if(kind==="armor"&&frame>=32&&frame<64){
        pixels.fill(0);disk(mid,h/2,5,5);
        if(nameHas(item,"HTANK")){ll(-3,-3,-3,-14,7,2);ll(3,-3,3,-14,7,2);}
        else if(nameHas(item,"MLRS"))for(let x=-4;x<=4;x+=3)ll(x,-2,x,-10,7,2);
        else ll(0,0,0,-12,7,2);
      }
    }
  }else if(item.category==="infantry"){
    const civilian=kind==="civilian", specialist=kind==="engineer"||kind==="commando";
    const walking=frame%64>=8&&frame%64<56, bob=walking?1+phase%2:0, stride=walking?Math.round(4*Math.sin(phase*Math.PI/4)):0;
    disk(mid,5+bob,3,civilian?7:6);rect(mid-3,9+bob,6,8,civilian?accent:3);
    if(specialist)rect(mid-2,10+bob,4,3,5);
    line(mid-2,16+bob,mid-4-stride,21,6,2);line(mid+2,16+bob,mid+4+stride,21,6,2);
    line(mid-3,12+bob,mid-7,16,5,2);
    if(!civilian){line(mid+3,12+bob,mid+9,10+bob,7,2);if(frame%8===5)disk(mid+10,9+bob,2,6);}
    else line(mid+3,12+bob,mid+7+(variant%2),17,5,2);
    if(kind==="commando")rect(mid-3,2,6,2,2);
  }else if(item.category==="aircraft"){
    ll(0,-12,0,12,3,5);ll(-11,-1,11,-1,5,kind==="fixed-wing"?4:2);
    ll(-11,-1,-3,-9,4,2);ll(11,-1,3,-9,4,2);
    ll(-6,10,6,10,5,2);ll(0,-9,0,-4,7,2);
    if(kind==="rotorcraft"||kind==="transport"){
      ll(-13,0,13,0,6,1,(frame%4)*Math.PI/4);
      box(0,1,4,6,2);if(kind==="transport")box(0,7,6,3,3);
    }
    if(frame>=32&&frame<64){ll(-4,10,-4,15,6,2);ll(4,10,4,15,6,2);}
  }else if(item.category==="building"){
    if(kind==="wall"||kind==="road"){
      rect(3,mid-4,w-6,8,kind==="wall"?2:3);
      for(let x=4;x<w-4;x+=7)rect(x,mid-4+(frame%2),2,7,6);
      if(kind==="road")rect(mid-2,mid-2,4,4,7);
    }else if(kind==="airfield"){
      rect(6,15,w-12,26,2);rect(9,18,w-18,20,3);
      rect(mid-4,10,8,26,5);for(let y=14;y<36;y+=8)rect(mid-1,y+frame%2,2,4,7);
      if(variant%2)rect(12,24,9,10,4);
    }else{
      const height=kind==="defense"?26:18+variant*2, roof=40-height;
      rect(7,roof,w-14,height,2);rect(10,roof+3,w-20,height-7,3);
      if(kind==="power"||kind==="industrial"){
        rect(12,roof-9,6,16,6);rect(27,roof-5,7,11,5);ellipse(32,roof-3,5,3,7);
      }else if(kind==="defense"){
        rect(mid-5,roof-5,10,11,5);line(mid,roof-3,mid+((frame%8)-4),roof-11,7,2);
      }else if(kind==="civilian"){
        for(let i=0;i<3;i++)rect(12+i*9,roof+5,4,5,5);
        rect(mid-3,31,6,9,6);
      }else{
        rect(13,roof+4,8,7,5);rect(27,roof+4,8,7,5);rect(20,32,8,8,6);
      }
      if(frame>=Math.floor(item.provisionalFrameCount/2))line(10,roof+4,31,37,6,2);
    }
  }else if(item.category==="terrain"){
    if(kind==="rock"){
      ellipse(mid,24,8+variant,4+variant%3,2);ellipse(mid-4,20,6,5,5);line(mid-10,25,mid+10,25,6,2);
      line(mid-4,17,mid+4,20,7,1);
    }else if(kind==="scrub"){
      for(let i=0;i<4;i++){const x=7+i*5;line(x,26,x-2+variant%3,14+i%3*3,3,2);disk(x,17+i%2*4,3,5);}
    }else{
      rect(mid-2,18,5,12,6);ellipse(mid,14,10+variant%3,8,kind==="crystal"?4:3);
      disk(mid-5,10,5,5);disk(mid+5,13,4,7);
      if(kind==="crystal")for(let i=0;i<3;i++)line(mid-5+i*5,12,mid-3+i*5,4,7,2);
      if(frame>0)line(10,15,22,18,6,1);
    }
  }else if(item.category==="overlay"){
    if(kind==="resource"){
      for(let i=0;i<5;i++){const x=5+(i*7+variant)%16,y=7+(i*5+variant)%14;line(x,y+5,x+2,y-1-frame%3,4,3);plot(x+1,y-1-frame%3,7);}
    }else if(kind==="crate"){
      rect(5,5,14,14,6);rect(7,7,10,10,2);line(6,6,18,18-frame%2,7);line(18,6,6,18,7);
    }else if(kind==="road"||kind==="wall"){
      const c=kind==="wall"?2:3,joins=frame%16;
      rect(9,9,7,7,c);
      if(joins&1)rect(10,1,5,10,c);if(joins&2)rect(14,10,9,5,c);
      if(joins&4)rect(10,14,5,9,c);if(joins&8)rect(1,10,10,5,c);
      rect(11,11,3,3,7);
    }else{rect(4,9,16,8,3);line(4,9,20,17+frame%3,7);}
  }else if(item.category==="projectile"){
    const a=(frame%16)*Math.PI/8;
    if(kind==="melee")disk(mid,mid,3,7);
    else if(kind==="flame"){ll(0,5,0,-5,6,3,a);ll(-2,3,1,-4,7,2,a);}
    else if(kind==="energy")ll(0,6,0,-6,4,3,a);
    else {ll(0,5,0,-7,6,3,a);ll(0,-5,0,-8,7,2,a);if(kind==="rocket")ll(-3,5,3,5,5,2,a);}
  }else if(item.category==="effect"){
    const r=3+(frame%12), c=kind==="smoke"?5:kind==="fire"?6:7;
    if(kind==="signal"){
      line(mid,7,mid,25,6,2);line(mid,7,mid+9,11+phase%3,7,2);
      disk(mid,6,2,4);
    }else if(kind==="crate-glow"){
      rect(mid-5,mid-5,11,11,6);rect(mid-3,mid-3,7,7,2);
      disk(mid,mid,2+phase%3,7);
    }else if(kind==="creature-fall"){
      ellipse(mid+phase%3,mid+5,10,3,3);line(mid-8,mid+5,mid+8,mid+5,6,2);
    }else if(kind==="smoke"){
      for(let i=0;i<4;i++)disk(mid+((i*7+variant)%13)-6,mid+4-i*4-phase%3,3+i%2,5);
    }else if(kind==="fire"){
      for(let i=0;i<4;i++)line(mid-8+i*5,mid+10,mid-6+i*5,mid-1-(phase+i)%6,i%2?6:7,3);
      ellipse(mid,mid+9,9,3,2);
    }else{
      if(kind==="flash")disk(mid,mid,2+phase%3,c);
      else disk(mid,mid,2+phase%3,6);
      for(let a=0;a<8;a++){const theta=a*Math.PI/4+frame/18;
        line(mid+Math.cos(theta)*3,mid+Math.sin(theta)*3,mid+Math.cos(theta)*r,mid+Math.sin(theta)*r,a%2?c:6,2);}
    }
  }
  // Distinguishable tiny color glyph for art review and manifest collision
  // testing. Original assets retain the same glyph at every animation frame.
  if(item.category==="vehicle"&&(kind==="creature"||kind==="naval")&&frame%32>=8&&frame%32<24){
    for(let y=0;y<h;y++)for(let x=0;x<Math.floor(w/2);x++){
      const left=y*w+x,right=y*w+(w-1-x),temp=pixels[left];pixels[left]=pixels[right];pixels[right]=temp;
    }
  }
  const idNumber=Number(item.id.slice(3))-1;
  for(let i=0;i<4;i++)rect(2+i*3,2,2,2,2+(Math.floor(idNumber/6**i)%6));
  return [...pixels];
}
function nameHas(item,value){return item.engineEnum.includes(value);}
module.exports={draw,archetype,ARCHETYPES};
