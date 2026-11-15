#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const {Camera,Selection,TILE}=require("./rts-camera.js");

for(const {width,height} of [{width:985,height:875},{width:720,height:387},{width:412,height:730}]){
  const camera=new Camera(18,11);
  camera.setViewport(width,height);
  const canvas=camera.canvasRect();
  assert(Math.abs(canvas.width/canvas.height-18/11)<1e-9,"Nonuniform canvas scale");
  for(const tile of [{x:0,y:0},{x:1,y:2},{x:7,y:2},{x:17,y:10}]){
    const p=camera.worldToScreen((tile.x+.5)*TILE,(tile.y+.5)*TILE);
    assert.deepEqual(camera.screenToTile(p.x,p.y),tile,"Tile transform mismatch");
    const cssX=p.x-canvas.left,cssY=p.y-canvas.top;
    assert(Math.abs(cssX/canvas.width*18-(tile.x+.5))<1e-9);
    assert(Math.abs(cssY/canvas.height*11-(tile.y+.5))<1e-9);
  }
  const anchor={x:width*.4,y:height*.53},before=camera.screenToWorld(anchor.x,anchor.y);
  camera.zoomAt(1.8,anchor.x,anchor.y);
  const after=camera.screenToWorld(anchor.x,anchor.y);
  // Anchoring is limited by clamping while an entire map axis still fits.
  assert(Math.abs(before.x-after.x)<1e-8,"Zoom shifted the horizontal pointer anchor");
  if(canvas.height*1.8>=height)
    assert(Math.abs(before.y-after.y)<1e-8,"Zoom shifted the vertical pointer anchor");
  camera.panBy(-200,-170);
  const view=camera.visibleRect();
  assert(view.x>=0&&view.y>=0&&view.x+view.width<=720+1e-7&&view.y+view.height<=440+1e-7);
  camera.minimapToCenter(360,220,360,220);
  assert(camera.centerX>=360&&camera.centerY>=220,"Minimap recenter did not pan");
  camera.zoomAt(1/100);
  assert.equal(camera.zoom,1,"Camera must not zoom out past fitted map");
  assert.equal(camera.screenToTile(-9999,-9999),null,"Out-of-bounds click hit map");
}

const entities=[
  {id:1001,ownerId:1,kind:"infantry",x:1,y:2,active:true,hp:5},
  {id:1002,ownerId:1,kind:"infantry",x:2,y:3,active:true,hp:6},
  {id:2001,ownerId:2,kind:"infantry",x:10,y:2,active:true,hp:3},
  {id:2002,ownerId:2,kind:"vehicle",x:4,y:3,active:true,hp:8},
  {id:3001,ownerId:0,kind:"supply",x:7,y:2,active:true,hp:0}
];
const snapshot={entities,events:[],selectedEntityId:1001,phase:"playing"};
const selection=new Selection();selection.receive(snapshot);
assert.deepEqual(selection.ids,[1001]);
selection.at({x:2,y:3},true);
assert.deepEqual(selection.ids,[1001,1002],"Shift-add lost prior selection");
selection.assign(3);
selection.set([]);
selection.recall(3);
assert.deepEqual(selection.ids,[1001,1002],"Group recall did not restore both soldiers");
selection.box({x:0,y:0},{x:720,y:440});
assert.deepEqual(selection.ids,[1001,1002],"Box selected enemy or non-unit");
selection.box({x:40,y:70},{x:70,y:110});
assert.deepEqual(selection.ids,[1001],"World-space box selected incorrect soldier");
selection.recall(3);
assert.deepEqual(selection.contextual({x:10,y:2},snapshot).map(c=>[c.kind,c.actor,c.target]),
  [["attack",1001,2001],["attack",1002,2001]],"Contextual enemy order missing actor identity");
assert.deepEqual(selection.contextual({x:4,y:3},snapshot).map(c=>[c.kind,c.actor,c.target]),
  [["attack",1001,2002],["attack",1002,2002]],"Vehicle click was converted to movement before native target filtering");
assert.deepEqual(selection.contextual({x:7,y:2},snapshot).map(c=>[c.kind,c.actor,c.x,c.y]),
  [["move",1001,7,2],["move",1002,7,2]],"Contextual move orders not native-shaped");
assert.deepEqual(selection.contextual({x:7,y:2},snapshot,"attack"),[],"Attack mode accepted empty tile");
selection.receive({...snapshot,events:[],entities:entities.map(e=>e.id===1002?{...e,hp:0,active:false}:e)});
selection.recall(3);assert.deepEqual(selection.ids,[1001],"Dead unit retained in control group");
selection.receive({...snapshot,events:[{type:"restart"}]});
assert.equal(selection.groups.size,0,"Groups persisted across restart");
console.log("PASS: RTS camera transforms, pan/zoom, 3 viewport shapes, box/shift groups, native command mapping");
