#!/usr/bin/env node
"use strict";
// Validate the actual MIX files emitted by the unified original pack.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process");
const {decodeIconset}=require("./encode-iconset.js");
const {decodeTacticalShape}=require("./encode-shape.js");
const {nativeMixer}=require("./boot-pack.js");
function run(){
  const game=path.resolve(process.argv[2]||"build/browser-engine/data/game");
  const names=["CLEAR1.TEM","W1.TEM","SH34.TEM","S03.TEM",...Array.from({length:12},(_,i)=>"TI"+(i+1)+".TEM"),"T01.TEM"];
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),"wc-m2b-theater-"));
  try{
    const tool=nativeMixer(),contents={};
    for(const archive of ["TEMPERAT.MIX","TEMPICNH.MIX"]){
      const folder=path.join(workspace,archive.replace(".MIX",""));
      fs.mkdirSync(folder);
      const alias=path.join(workspace,archive.toLowerCase());
      fs.copyFileSync(path.join(game,archive),alias);
      const result=cp.spawnSync(tool,["--extract","--directory",folder,
        ...names.flatMap(name=>["--file",name]),alias],{encoding:"utf8"});
      if(result.error||result.status!==0)throw Error("Extract "+archive+": "+(result.error||result.stderr||result.stdout));
      const extracted=new Map(fs.readdirSync(folder).map(name=>[name.toUpperCase(),name]));
      assert.deepEqual([...extracted.keys()].sort(),[...names].sort(),archive+" members");
      for(const name of names){
        const content=fs.readFileSync(path.join(folder,extracted.get(name)));
        if(contents[name])assert.deepEqual(content,contents[name],name+" differs between theater archives");
        contents[name]=content;
      }
    }
    const clear=decodeIconset(contents["CLEAR1.TEM"]);
    assert.equal(clear.width,24);assert.equal(clear.height,24);
    // M5: 16 grass variants, one per Clear_Icon slot (cell.cpp:1772-1777).
    assert.equal(clear.icons.length,16);
    assert.equal(clear.map.length,16,"Clear_Icon references map slots 0..15");
    assert.deepEqual(clear.map,[...Array(16).keys()]);
    const water=decodeIconset(contents["W1.TEM"]);
    assert.equal(water.icons.length,1);
    assert.equal(water.map.length,1);
    // Art follows the engine's land mask (cdata.cpp): SH34 is clear with a
    // water right-hand column; S03 is all rock.
    const {RAMPS}=require("./art/palette.js");
    const inRamp=(p,r)=>p>=RAMPS[r].start&&p<RAMPS[r].start+RAMPS[r].colors.length;
    const share=(icon,test)=>icon.filter(test).length/icon.length;
    const isWater=p=>(p>=32&&p<=38)||inRamp(p,"water");
    const shore=decodeIconset(contents["SH34.TEM"]);
    assert.equal(shore.icons.length,9);
    assert.ok(share(shore.icons[5],isWater)>0.5,"SH34 icon 5 is water");
    assert.ok(share(shore.icons[3],isWater)<0.2,"SH34 icon 3 is land");
    const rock=decodeIconset(contents["S03.TEM"]);
    assert.ok(rock.icons.every(icon=>share(icon,p=>inRamp(p,"rock"))>0.4),"S03 icons are rock");
    for(let i=1;i<=12;i++){
      const shape=decodeTacticalShape(contents["TI"+i+".TEM"]);
      assert.equal(shape.frames.length,16);
      assert.equal(shape.frames[0].width,24);
      assert.equal(shape.frames[0].height,24);
    }
    const tree=decodeTacticalShape(contents["T01.TEM"]);
    assert.equal(tree.frames.length,16);
    assert.equal(tree.frames[0].width,32);assert.equal(tree.frames[0].height,32);
    console.log("PASS: both theater archives contain "+names.length+" identical decoded members; terrain art follows the land mask");
  }finally{fs.rmSync(workspace,{recursive:true,force:true});}
}
run();
