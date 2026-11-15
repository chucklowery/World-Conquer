"use strict";
// R01: presentation-only camera, hit testing and local multi-selection.
// Coordinates and owners come from R00 snapshots; orders are issued by the
// caller to the R00 native command bridge. This module never moves units.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCRTSInput=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const TILE=40;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  class Camera {
    constructor(width=18,height=11){
      this.mapWidth=width;this.mapHeight=height;
      this.width=width*TILE;this.height=height*TILE;
      this.viewportWidth=720;this.viewportHeight=440;
      this.centerX=this.width/2;this.centerY=this.height/2;
      this.zoom=1;
    }
    get fit(){return Math.min(this.viewportWidth/this.width,this.viewportHeight/this.height);}
    get scale(){return this.fit*this.zoom;}
    clamp(){
      const halfW=this.viewportWidth/(2*this.scale),halfH=this.viewportHeight/(2*this.scale);
      this.centerX=halfW>=this.width/2?this.width/2:clamp(this.centerX,halfW,this.width-halfW);
      this.centerY=halfH>=this.height/2?this.height/2:clamp(this.centerY,halfH,this.height-halfH);
    }
    setViewport(width,height){
      if(!(width>0&&height>0))return;
      this.viewportWidth=width;this.viewportHeight=height;this.clamp();
    }
    setMap(width,height){
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)
        throw Error("Invalid native map dimensions");
      if(width===this.mapWidth&&height===this.mapHeight)return;
      this.mapWidth=width;this.mapHeight=height;this.width=width*TILE;this.height=height*TILE;
      this.centerX=this.width/2;this.centerY=this.height/2;this.zoom=1;this.clamp();
    }
    worldToScreen(x,y){return {
      x:this.viewportWidth/2+(x-this.centerX)*this.scale,
      y:this.viewportHeight/2+(y-this.centerY)*this.scale
    };}
    screenToWorld(x,y){return {
      x:this.centerX+(x-this.viewportWidth/2)/this.scale,
      y:this.centerY+(y-this.viewportHeight/2)/this.scale
    };}
    screenToTile(x,y){
      const p=this.screenToWorld(x,y),tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
      return tx>=0&&ty>=0&&tx<this.mapWidth&&ty<this.mapHeight?{x:tx,y:ty}:null;
    }
    panBy(dx,dy){this.centerX-=dx/this.scale;this.centerY-=dy/this.scale;this.clamp();}
    centerAt(x,y){this.centerX=x;this.centerY=y;this.clamp();}
    centerOnTile(x,y){this.centerAt((x+.5)*TILE,(y+.5)*TILE);}
    zoomAt(factor,screenX=this.viewportWidth/2,screenY=this.viewportHeight/2){
      const anchor=this.screenToWorld(screenX,screenY);
      this.zoom=clamp(this.zoom*factor,1,3);
      this.centerX=anchor.x-(screenX-this.viewportWidth/2)/this.scale;
      this.centerY=anchor.y-(screenY-this.viewportHeight/2)/this.scale;
      this.clamp();
    }
    visibleRect(){
      const a=this.screenToWorld(0,0),b=this.screenToWorld(this.viewportWidth,this.viewportHeight);
      return {x:clamp(a.x,0,this.width),y:clamp(a.y,0,this.height),
        width:clamp(b.x,0,this.width)-clamp(a.x,0,this.width),
        height:clamp(b.y,0,this.height)-clamp(a.y,0,this.height)};
    }
    minimapToCenter(x,y,width,height){
      this.centerAt(clamp(x/width,0,1)*this.width,clamp(y/height,0,1)*this.height);
    }
    canvasRect(){
      const corner=this.worldToScreen(0,0);
      return {left:corner.x,top:corner.y,width:this.width*this.scale,height:this.height*this.scale};
    }
  }

  class Selection {
    constructor(){this.entities=[];this.ids=[];this.groups=new Map();}
    receive(snapshot){
      this.entities=snapshot.entities.filter(e=>e.kind==="infantry"&&e.ownerId===1&&e.active&&e.hp>0);
      const live=new Set(this.entities.map(e=>e.id));
      this.ids=this.ids.filter(id=>live.has(id));
      for(const [number,ids] of this.groups)this.groups.set(number,ids.filter(id=>live.has(id)));
      if(snapshot.events.some(event=>event.type==="restart")){
        this.ids=[];this.groups.clear();
      }
      if(!this.ids.length&&live.has(snapshot.selectedEntityId))this.ids=[snapshot.selectedEntityId];
      return this.ids;
    }
    owned(id){return this.entities.some(e=>e.id===id);}
    set(ids,add=false){
      const allowed=new Set(this.entities.map(e=>e.id));
      this.ids=[...(add?this.ids:[]),...ids].filter((id,i,all)=>allowed.has(id)&&all.indexOf(id)===i);
      return this.ids;
    }
    at(tile,add=false){
      if(!tile)return this.set([],add);
      const entity=this.entities.find(e=>e.x===tile.x&&e.y===tile.y);
      return this.set(entity?[entity.id]:[],add);
    }
    box(a,b,add=false){
      const minX=Math.min(a.x,b.x),minY=Math.min(a.y,b.y);
      const maxX=Math.max(a.x,b.x),maxY=Math.max(a.y,b.y);
      return this.set(this.entities.filter(e=>{
        const x=(e.x+.5)*TILE,y=(e.y+.5)*TILE;
        return x>=minX&&x<=maxX&&y>=minY&&y<=maxY;
      }).map(e=>e.id),add);
    }
    assign(number){if(number>=1&&number<=9)this.groups.set(number,[...this.ids]);}
    recall(number){return this.set(this.groups.get(number)||[]);}
    center(){
      const units=this.entities.filter(e=>this.ids.includes(e.id));
      if(!units.length)return null;
      return {x:units.reduce((s,e)=>s+(e.x+.5)*TILE,0)/units.length,
        y:units.reduce((s,e)=>s+(e.y+.5)*TILE,0)/units.length};
    }
    contextual(tile,snapshot,mode="context"){
      if(!tile||!this.ids.length||snapshot.phase!=="playing")return [];
      // R03 vehicles are hostile targets too. The C++ weapon mask makes the
      // final acceptance decision (and emits bad_target if a rifle rejects a
      // vehicle); the browser must not silently convert the click to Move.
      const target=snapshot.entities.find(e=>(e.kind==="infantry"||e.kind==="vehicle")&&
        e.ownerId!==1&&e.active&&e.hp>0&&e.x===tile.x&&e.y===tile.y);
      if(mode==="attack"&&!target)return [];
      const kind=mode==="attack"||(mode==="context"&&target)?"attack":"move";
      return this.ids.map(actor=>({kind,actor,x:tile.x,y:tile.y,target:target?target.id:0}));
    }
  }
  return {Camera,Selection,TILE};
});
