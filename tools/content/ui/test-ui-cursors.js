"use strict";
// UI-D: MOUSE.SHP against the engine cursor table (frame for frame, hotspot
// for hotspot), SELECT.SHP and the TRANS.ICN placement grid.
const assert=require("node:assert/strict");
const c=require("./cursors.js");
const UI=require("./ui-colors.js");
const {decodeShape}=require("../encode-shape.js");
const {encode}=require("./build.js");
const {decodeTacticalShape}=require("../encode-shape.js");

const table=c.cursorTable();
assert.equal(table.length,34,"MOUSE_COUNT entries");
const {frames,unused}=c.mouseFrames();
const need=Math.max(...table.map(t=>t.start+t.count),...table.filter(t=>t.small>=0).map(t=>t.small+t.count));
assert.equal(frames.length,need,"frame count covers the table");
assert(need>=178,"MOUSE_SELL_UNIT 154+24");
// The shipped file decodes to the same frames.
const blob=c.mouseShape();
const decoded=decodeShape(blob);
assert.equal(decoded.frames?decoded.frames.length:decoded.length,need,"MOUSE.SHP frame count");
const allowed=new Set([0,...UI.reserved]);
const used=new Set();
for(const t of table){
  for(const base of [t.start,t.small]){
    if(base<0)continue;
    for(let k=0;k<t.count;k++){
      const i=base+k;used.add(i);
      const f=frames[i];
      assert(f&&f.width===c.CW&&f.height===c.CH,t.name+" frame "+i+" size");
      for(const p of f.pixels)assert(allowed.has(p),t.name+" frame "+i+" index "+p);
      // Hotspot contract: the visual point of the cursor is the hotspot.
      const op=(x,y)=>f.get(x,y)&&f.get(x,y)!==UI.shadow;
      if(t.x===15&&t.y===12){
        let x0=99,y0=99,x1=-1,y1=-1;
        for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)if(op(x,y)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
        const cx=(x0+x1)/2,cy=(y0+y1)/2;
        assert(Math.abs(cx-15)<=3&&Math.abs(cy-12)<=3,t.name+" frame "+i+" centre "+cx+","+cy+" vs hotspot 15,12");
      }else{
        const near=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>op(t.x+dx,t.y+dy));
        assert(near,t.name+" frame "+i+" has no ink at hotspot "+t.x+","+t.y);
      }
    }
    // Animated cursors change from frame to frame.
    if(t.rate>0&&t.count>1&&base>=0){
      let changes=0;for(let k=1;k<t.count;k++)if(frames[base+k].pixels.join()!==frames[base+k-1].pixels.join())changes++;
      assert(changes>0,t.name+" animation is static");
    }
  }
}
for(const i of unused)assert(!used.has(i),"unused index "+i+" is referenced");
// Distinct states read differently: move vs no-move vs attack vs select.
const by=Object.fromEntries(table.map(t=>[t.name,t]));
const sig=name=>frames[by[name].start].pixels.join();
assert.equal(new Set(["MOUSE_NORMAL","MOUSE_CAN_MOVE","MOUSE_NO_MOVE","MOUSE_CAN_ATTACK","MOUSE_CAN_SELECT","MOUSE_ENTER","MOUSE_DEPLOY","MOUSE_REPAIR","MOUSE_SELL_BACK"].map(sig)).size,9);
assert(frames[by.MOUSE_NO_MOVE.start].pixels.includes(UI.red)&&frames[by.MOUSE_CAN_ATTACK.start].pixels.includes(UI.red));
assert(!frames[by.MOUSE_CAN_MOVE.start].pixels.includes(UI.red),"move reticle is not red");
for(const d of ["N","NE","E","SE","S","SW","W","NW"]){
  assert(frames[by["MOUSE_"+d].start].pixels.includes(UI.ice));
  assert(frames[by["MOUSE_NO_"+d].start].pixels.includes(UI.red),"can't-scroll variant "+d);
}

// SELECT.SHP: 3 frames, round trip, wrench overlay.
const g=c.generate();
const sel=g["SELECT.SHP"].map(f=>f.toFrame());
assert.equal(sel.length,3);
const dsel=decodeTacticalShape(encode(g["SELECT.SHP"]));
dsel.frames.forEach((f,i)=>assert.deepEqual(f.pixels,sel[i].pixels));
assert(sel[2].pixels.includes(UI.normal),"repair wrench");

// TRANS.ICN: allowed (0) and blocked (2) differ in geometry, not only hue:
// blocked has a full border and a cross-hatch; both keep the ground visible.
const [ok,,blocked]=c.transIcons();
const border=p=>{let n=0;for(let i=0;i<24;i++){if(p[i])n++;if(p[23*24+i])n++;if(p[i*24])n++;if(p[i*24+23])n++;}return n;};
assert(border(blocked)>=90&&border(ok)<60,"border geometry");
const shareClear=p=>p.filter(v=>v===0).length/576;
assert(shareClear(ok)>0.5&&shareClear(blocked)>0.4,"ground stays visible");
assert(ok.includes(UI.normal)&&!ok.includes(UI.red)&&blocked.includes(UI.red)&&!blocked.includes(UI.normal));
// Monochrome check: with hue removed the two still differ in coverage.
assert(Math.abs(shareClear(ok)-shareClear(blocked))>0.08,"distinct without colour");
console.log("UI cursor, selection and placement checks passed ("+need+" cursor frames)");
