#!/usr/bin/env node
"use strict";
// M2a: exercise the stock VanillaTD menu with real canvas input. Audit is
// written even when an incomplete original pack prevents scenario startup.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
// WC_BROWSER selects the engine: chromium (default), firefox or webkit (M4).
const playwright=require("playwright");
const browserName=process.env.WC_BROWSER||"chromium";
if(!["chromium","firefox","webkit"].includes(browserName))throw Error("WC_BROWSER must be chromium, firefox or webkit");
const browserType=playwright[browserName];
const launchOptions={headless:true,args:browserName==="chromium"?["--no-sandbox"]:[]};
const root=path.resolve(__dirname,"../../build/browser-engine");
const report=path.join(root,"stock-scenario-audit.json");
// The site to serve (default: the build directory) and the page to open.
// Results are always written to build/browser-engine, never into the site.
const site=path.resolve(process.env.STOCK_SCENARIO_SITE||root);
const pagePath=process.env.STOCK_SCENARIO_PAGE||"vanillatd.html";
if(!/^[A-Za-z0-9_.-]+\.html(\?[A-Za-z0-9_=&-]*)?$/.test(pagePath))throw Error("Invalid STOCK_SCENARIO_PAGE");
const mime={".html":"text/html",".js":"text/javascript",".wasm":"application/wasm",".json":"application/json"};
const server=http.createServer((req,res)=>{
  let name;
  try { name=decodeURIComponent((req.url||"/").split("?")[0]); }catch {res.writeHead(400);res.end();return;}
  if(!/^\/[A-Za-z0-9_./-]+$/.test(name)||name.split("/").includes("..")){
    res.writeHead(400);res.end("Invalid path");return;
  }
  fs.readFile(path.join(site,name.slice(1)),(err,data)=>{
    if(err){res.writeHead(404);res.end("Missing");return;}
    res.writeHead(200,{"Content-Type":mime[path.extname(name).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
});
// Rendered colours of the generated grass tile (theater.js, TERRAIN):
// 8-bit palette value -> 6-bit .PAL -> SDL presents 6-bit << 2.
const {rgbPalette,TERRAIN}=require("../../tools/content/boot-colors.js");
const shown=i=>rgbPalette()[i].map(v=>(v>>2)<<2);
const GRASS=[shown(TERRAIN.grass),shown(TERRAIN.grassEdge)];
// Analyse the battlefield inside the canvas screenshot (in the page, so no
// image library is needed). The tactical view is everything below the 16px
// tab bar (640x400 game coordinates) and left of the sidebar when it is open.
async function battlefieldStats(page,png,sidebarOpen){
  return page.evaluate(async ({data,grass,sidebarOpen})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");
    g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400;
    const x0=0,y0=Math.ceil(16*sy),x1=Math.floor((sidebarOpen?480:640)*sx),y1=img.height;
    const d=g.getImageData(x0,y0,x1-x0,y1-y0).data;
    let total=0,nonBlack=0,object=0;
    const near=(r,gg,b,[R,G,B])=>Math.abs(r-R)<=8&&Math.abs(gg-G)<=8&&Math.abs(b-B)<=8;
    for(let i=0;i<d.length;i+=4){
      total++;
      const r=d[i],gg=d[i+1],b=d[i+2];
      if(r+gg+b<=48)continue;
      nonBlack++;
      if(!grass.some(col=>near(r,gg,b,col))&&!(gg>r&&gg>b&&r<120&&b<60))object++;
    }
    return {total,nonBlackShare:nonBlack/total,objectShare:object/total};
  },{data:png.toString("base64"),grass:GRASS,sidebarOpen});
}
// The hi-res sidebar occupies x 480..639 (sidebar.h SIDE_X doubled); cameo
// slots are 64x48 (OBJECT_WIDTH/HEIGHT x2) in two columns.
async function sidebarStats(page,png){
  return page.evaluate(async ({data})=>{
    const img=new Image();img.src="data:image/png;base64,"+data;await img.decode();
    const c=new OffscreenCanvas(img.width,img.height),g=c.getContext("2d");
    g.drawImage(img,0,0);
    const sx=img.width/640,sy=img.height/400;
    const share=(x,y,w,h)=>{
      const d=g.getImageData(Math.floor(x*sx),Math.floor(y*sy),Math.max(1,Math.floor(w*sx)),Math.max(1,Math.floor(h*sy))).data;
      let lit=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>48)lit++;
      return lit/(d.length/4);
    };
    let cameoSlotsDrawn=0;
    for(const x of [496,566])for(let y=180;y<380;y+=48)if(share(x,y,60,44)>0.3)cameoSlotsDrawn++;
    return {nonBlackShare:share(480,16,160,384),cameoSlotsDrawn};
  },{data:png.toString("base64")});
}
const audit={schema:1,pathDecision:"pending (Skirmish candidate)",status:"incomplete",
  stage:"startup",misses:[],fatal:null,lastGameLines:[],lastEventLines:[],
  pageErrors:[],screenshots:[],input:[],requiredMisses:[],optionalMisses:[],unclassifiedMisses:[],
  drawn:[],drawnBySource:{},wireframeDrawn:[],
  ciSha:process.env.GITHUB_SHA||"local"};
const consoleLines=[];
function parse(rawLine){
  const line=rawLine.replace(/^\[error\]\s*/,"");
  const stage=line.match(/^\[browser-game\] (menu\.enter|menu\.choice|scenario\.request|scenario\.loaded|scenario\.failed)/);
  if(stage)audit.stage=stage[1];
  if(line.startsWith("[browser-game]"))audit.lastGameLines.push(line);
  // Credit changes are frequent; the full log keeps them.
  if(line.startsWith("[browser-event]")&&!line.startsWith("[browser-event] credits "))audit.lastEventLines.push(line);
  if(audit.lastGameLines.length>60)audit.lastGameLines.shift();
  if(audit.lastEventLines.length>60)audit.lastEventLines.shift();
  // M5: every file drawn at least once ([asset-draw], common/ccfile.cpp).
  const drawn=line.match(/^\[asset-draw\] (\S+)/);
  if(drawn&&!audit.drawn.includes(drawn[1]))audit.drawn.push(drawn[1]);
  const miss=line.match(/^\[asset-miss\] (\S+)/);
  if(miss&&!audit.misses.some(x=>x.name===miss[1]))audit.misses.push({name:miss[1],firstSeenStage:audit.stage});
  const fatal=line.match(/^\[browser-game\] fatal=(.*)/);
  if(fatal)audit.fatal=fatal[1];
  // A WebAssembly trap or abort stops the game but does not always raise a
  // page error; treat it as fatal.
  const trap=line.match(/(RuntimeError: .*|Aborted\(.*)$/);
  if(trap&&!audit.fatal)audit.fatal="engine crashed: "+trap[1];
}
// Phase 9: a scripted match with real input only. Positions come from the
// engine's guarded test logs ([browser-event] sidebar-add / sidebar-scroll /
// sidebar-buttons / centered), never from fixed guesses.
async function playMatch(page,{clickGame,screenshot,logText,playerHouse,canvas}){
  const t0=Date.now();
  const steps=audit.gameplay={steps:[]};
  const step=(name,data={})=>{steps.steps.push({step:name,seconds:Math.round((Date.now()-t0)/1000),...data});};
  const lastMatch=(text,re)=>{let m=null;for(const x of text.matchAll(re))m=x;return m;};
  const waitFor=async(source,timeout,since=0)=>page.waitForFunction(([src,m])=>
    new RegExp(src).test(document.getElementById("log").textContent.slice(m)),[source,since],{timeout});
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  async function slot(name){
    const text=await logText();
    const add=lastMatch(text,new RegExp("\\[browser-event\\] sidebar-add strip=(\\d+) index=(\\d+) name="+esc(name)+" x=(\\d+) y=(\\d+) w=(\\d+) h=(\\d+)","g"));
    if(!add)return null;
    const [strip,index,x,y,w,h]=add.slice(1).map(Number);
    const scroll=lastMatch(text,new RegExp("\\[browser-event\\] sidebar-scroll strip="+strip+" top=(\\d+)","g"));
    const buttons=lastMatch(text,new RegExp("\\[browser-event\\] sidebar-buttons strip="+strip+" up=(\\d+),(\\d+) down=(\\d+),(\\d+) w=(\\d+) h=(\\d+)","g"));
    return {strip,index,x,y,w,h,top:scroll?Number(scroll[1]):0,buttons:buttons&&buttons.slice(1).map(Number)};
  }
  // Click a cameo, scrolling its strip first when the slot is out of view
  // (four slots are visible, sidebar.h MAX_VISIBLE).
  async function clickCameo(name,label){
    for(let tries=0;tries<20;tries++){
      const s=await slot(name);
      if(!s)throw Error("Sidebar has no "+name);
      if(s.index>=s.top&&s.index<s.top+4){
        await clickGame(s.x+s.w/2,s.y+(s.index-s.top)*s.h+s.h/2,label);
        return;
      }
      if(!s.buttons)throw Error("Sidebar scroll buttons were not reported");
      const [ux,uy,dx,dy,bw,bh]=s.buttons;
      const since=(await logText()).length;
      if(s.index<s.top)await clickGame(ux+bw/2,uy+bh/2,"Scroll up");
      else await clickGame(dx+bw/2,dy+bh/2,"Scroll down");
      await waitFor("\\[browser-event\\] sidebar-scroll strip="+s.strip,5000,since).catch(()=>{});
    }
    throw Error("Could not bring "+name+" into view");
  }
  // Cells around the yard in rings of growing radius, the side facing the
  // map centre first (the classic map spans cells 1-62; centre 31,31).
  function placementOffsets(cell){
    const sx=Math.sign(31-cell[0])||1,sy=Math.sign(31-cell[1])||1,out=[];
    for(let r=2;r<=5;r++){
      const ring=[];
      for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)if(Math.max(Math.abs(dx),Math.abs(dy))===r)ring.push([dx,dy]);
      ring.sort((a,b)=>(b[0]*sx+b[1]*sy)-(a[0]*sx+a[1]*sy));
      out.push(...ring);
    }
    return out;
  }
  async function centreOn(key,name){
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
    const since=(await logText()).length;
    await page.keyboard.press("Home");
    await waitFor("\\[browser-event\\] centered name="+name+" x=",5000,since);
    const m=(await logText()).slice(since).match(new RegExp("\\[browser-event\\] centered name="+name+" x=(-?\\d+) y=(-?\\d+) cell=(\\d+),(\\d+)"));
    return [Number(m[1]),Number(m[2]),[Number(m[3]),Number(m[4])]];
  }
  async function waitEvent(source,timeout,since){
    return waitFor(source,timeout,since).then(()=>true,()=>false);
  }
  // Build a structure through the sidebar and place it next to the yard.
  async function buildStructure(name,readyTimeout){
    const since=(await logText()).length;
    await clickCameo(name,"Build "+name);
    if(!await waitEvent("\\[browser-event\\] ready name="+name+" house="+playerHouse,readyTimeout,since))
      throw Error(name+" did not finish building");
    const [yx,yy,yardCell]=await centreOn("h","FACT");
    await clickCameo(name,"Place "+name);           // enters placement mode
    await page.waitForTimeout(500);
    let tried=0;
    for(const [cx,cy] of placementOffsets(yardCell)){
      const x=yx+cx*24,y=yy+cy*24;
      if(x<12||x>468||y<28||y>388)continue;
      tried++;
      const at=(await logText()).length;
      await clickGame(x,y,"Place "+name+" at "+cx+","+cy);
      if(await waitEvent("\\[browser-event\\] placed name="+name+" house="+playerHouse,1200,at)){
        step("placed",{object:name,offset:[cx,cy],tried});
        return;
      }
    }
    throw Error("Could not find a legal place for "+name);
  }
  const credits=async()=>{const m=lastMatch(await logText(),new RegExp("\\[browser-event\\] credits house="+playerHouse+" value=(\\d+)","g"));return m?Number(m[1]):null;};

  // Build times vary with the start position and harvester income; the
  // vehicle factory took 180-230 s locally, so allow 8 minutes per step.
  const STEP_MS=480000;
  await buildStructure("NUKE",STEP_MS);
  const harvestSince=(await logText()).length;
  const creditsBeforeHarvest=await credits();
  await buildStructure("PROC",STEP_MS);             // the refinery brings a harvester
  await buildStructure("PYLE",STEP_MS);
  // Infantry from the barracks (units strip).
  let since=(await logText()).length;
  await clickCameo("E1","Train E1");
  if(!await waitEvent("\\[browser-event\\] produced name=E1 house="+playerHouse,STEP_MS,since))throw Error("E1 was not produced");
  step("produced",{object:"E1"});
  // One harvester load must arrive and raise the balance.
  if(!await waitEvent("\\[browser-event\\] harvest-unload house="+playerHouse,STEP_MS,harvestSince))
    throw Error("The harvester did not deliver a load");
  const unload=lastMatch((await logText()).slice(harvestSince),new RegExp("\\[browser-event\\] harvest-unload house="+playerHouse+" value=(\\d+)","g"));
  step("harvest-unload",{value:Number(unload[1])});
  // A vehicle from the vehicle factory.
  await buildStructure("WEAP",STEP_MS);
  since=(await logText()).length;
  const vehicle=(await slot("JEEP"))?"JEEP":(await slot("MTNK"))?"MTNK":null;
  if(!vehicle)throw Error("No vehicle is buildable after the vehicle factory");
  await clickCameo(vehicle,"Build "+vehicle);
  if(!await waitEvent("\\[browser-event\\] produced name="+vehicle+" house="+playerHouse,STEP_MS,since))throw Error(vehicle+" was not produced");
  step("produced",{object:vehicle});
  steps.creditsBeforeHarvest=creditsBeforeHarvest;
  steps.creditsAfterHarvest=await credits();
  // Command units: box-select the tactical view, then move and force-fire.
  const field0=await canvas.screenshot();
  const box=await canvas.boundingBox();
  const at=(x,y)=>[box.x+x/640*box.width,box.y+y/400*box.height];
  await page.mouse.move(...at(8,24));await page.mouse.down();
  await page.mouse.move(...at(470,390),{steps:8});await page.mouse.up();
  await page.waitForTimeout(500);
  await clickGame(120,120,"Move selection");
  await page.waitForTimeout(3000);
  await page.keyboard.down("Control");
  await clickGame(160,300,"Force-fire on ground");
  await page.keyboard.up("Control");
  await page.waitForTimeout(3000);
  const field1=await canvas.screenshot();
  if(field0.equals(field1))throw Error("Orders did not change the battlefield");
  step("commanded");
  // Scroll with the keyboard and with the screen edge (M1 deferred this).
  let before=await canvas.screenshot();
  await page.keyboard.down("ArrowRight");await page.waitForTimeout(1200);await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(400);
  if(before.equals(await canvas.screenshot()))throw Error("Keyboard scrolling did not move the view");
  step("scroll-keyboard");
  before=await canvas.screenshot();
  await page.mouse.move(...at(1,200));await page.waitForTimeout(2000);await page.mouse.move(...at(240,200));
  await page.waitForTimeout(400);
  if(before.equals(await canvas.screenshot()))throw Error("Edge scrolling did not move the view");
  step("scroll-edge");
  await screenshot("base");
  // Let the match run, then record metrics.
  await page.evaluate(()=>{window.WCWatchdog.maxStallMs=0;});
  const heapStart=await page.evaluate(()=>(window.Module&&window.Module.HEAPU8&&window.Module.HEAPU8.length)||null);
  const frames=await page.evaluate(()=>new Promise(resolve=>{
    const d=[];let prev=performance.now(),start=prev;
    function tick(now){d.push(now-prev);prev=now;if(now-start>=120000)resolve(d);else requestAnimationFrame(tick);}
    requestAnimationFrame(tick);}));
  const pct=(v,p)=>{const a=[...v].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];};
  const heapEnd=await page.evaluate(()=>(window.Module&&window.Module.HEAPU8&&window.Module.HEAPU8.length)||null);
  const stall=await page.evaluate(()=>window.WCWatchdog.maxStallMs);
  if(stall>1000)throw Error("Main-thread stall during play: "+stall+"ms");
  await screenshot("after-2-minutes");
  // Pack size as served (raw and gzip), for the M4 size budget.
  const zlib=require("node:zlib"),packDir=path.join(root,"data","game");
  let packRaw=0,packGzip=0;
  for(const f of fs.readdirSync(packDir)){const b=fs.readFileSync(path.join(packDir,f));packRaw+=b.length;packGzip+=zlib.gzipSync(b).length;}
  steps.metrics={schema:1,sha:process.env.GITHUB_SHA||"local",timeToMatchStartMs:audit.timeToMatchStartMs,
    frameP50Ms:pct(frames,0.5),frameP95Ms:pct(frames,0.95),maxStallMs:stall,
    heapBytesAtStart:heapStart,heapBytesAfter2Min:heapEnd,packBytes:packRaw,packGzipBytes:packGzip,
    steps:steps.steps};
  fs.writeFileSync(path.join(root,"stock-scenario-metrics.json"),JSON.stringify(steps.metrics,null,2)+"\n");
  step("ran-2-minutes");
}

// M3 automated win (STOCK_SCENARIO_WIN=1). The engine declares a win only
// when the computer has no buildings or units left. The CI-only test hook
// (browser/engine/test_hooks.cpp, enabled by --browser-test-hooks) removes
// all of the computer's forces but one building and stops it selling; the player's own
// starting units then destroy it with real selection and attack orders, and
// the engine's defeat check, win screen and restart run as in normal play.
async function winMatch(page,{clickGame,screenshot,logText,playerHouse,canvas}){
  const t0=Date.now();
  const steps=audit.win={steps:[]};
  const step=(name,data={})=>{steps.steps.push({step:name,seconds:Math.round((Date.now()-t0)/1000),...data});};
  const mark=async()=>(await logText()).length;
  const seen=(src,timeout,from)=>page.waitForFunction(([re,m])=>
    new RegExp(re).test(document.getElementById("log").textContent.slice(m)),[src,from],{timeout}).then(()=>true,()=>false);
  const grab=async(src,from)=>(await logText()).slice(from).match(new RegExp(src));
  async function request(n){
    const result=await page.evaluate(n=>typeof Module._Browser_Test_Request==="function"?
      Module._Browser_Test_Request(n):-1,n);
    if(result!==1)throw Error("Test hook request "+n+" was refused ("+result+"); is --browser-test-hooks passed?");
  }
  const box=await canvas.boundingBox();
  const at=(x,y)=>[box.x+x/640*box.width,box.y+y/400*box.height];
  async function selectVisibleUnits(label){
    await page.mouse.move(...at(8,24));await page.mouse.down();
    await page.mouse.move(...at(470,390),{steps:8});await page.mouse.up();
    await page.waitForTimeout(400);
    step("select",{where:label});
  }
  // 1. Let the computer player start its base (the kept building must be
  //    one it placed, not its construction yard).
  let placed=0;
  for(const deadline=Date.now()+10*60000;Date.now()<deadline;await page.waitForTimeout(5000)){
    placed=[...(await logText()).matchAll(/\[browser-event\] placed name=\S+ house=(\S+)/g)]
      .filter(m=>m[1]!==playerHouse).length;
    if(placed>=2)break;
  }
  if(placed<2)throw Error("The computer player placed "+placed+" buildings in 10 minutes");
  step("computer-built",{placed});
  // 2. Remove all of the computer's forces but one building.
  let from=await mark();
  await request(1);
  if(!await seen("\\[browser-event\\] test-reduced ",10000,from))throw Error("The test hook did not run");
  const reduced=await grab("\\[browser-event\\] test-reduced removed=(\\d+) target=(\\S+) house=(\\S+) cell=(\\d+),(\\d+)",from);
  if(!reduced)throw Error("The computer player had no building to keep");
  const target=reduced[2],aiHouse=reduced[3];
  step("reduced",{removed:Number(reduced[1]),target,house:aiHouse,cell:[Number(reduced[4]),Number(reduced[5])]});
  await screenshot("win-reduced");
  // 3. Select the player's starting units where they are (they start around
  //    the MCV's spawn cell, which the deploy step may have moved away from),
  //    and check that the box selection took.
  from=await mark();
  await request(3);
  if(!await seen("\\[browser-event\\] test-units ",10000,from))throw Error("The test hook did not report the player's units");
  const units=await grab("\\[browser-event\\] test-units total=(\\d+) visible=(\\d+)",from);
  if(Number(units[2])<1)throw Error("None of the player's "+units[1]+" units are on screen to select");
  await selectVisibleUnits("units");
  from=await mark();
  await page.keyboard.press("Home");
  await page.waitForTimeout(1000);
  const selected=((await logText()).slice(from).match(/\[browser-event\] centered name=/g)||[]).length;
  if(selected<1)throw Error("Box selection picked none of the "+units[2]+" visible units");
  step("selected",{units:Number(units[1]),visible:Number(units[2]),selected});
  // 4. Centre on the target and order the attack with a normal click; repeat
  //    while units travel, reselecting the ones that have arrived.
  const wonRe="\\[browser-event\\] match-end result=won";
  for(let attempt=1;attempt<=24&&!(await seen(wonRe,1,0));attempt++){
    from=await mark();
    await request(2);
    if(!await seen("\\[browser-event\\] test-target name=",10000,from))throw Error("The test hook did not report the target");
    const shown=await grab("\\[browser-event\\] test-target name=(\\S+) x=(-?\\d+) y=(-?\\d+)",from);
    if(!shown){
      // The building is gone; clear anything the computer still has (for
      // example a unit that was inside a building) so its defeat registers.
      step("target-destroyed",{attempt});
      await request(1);
      await seen(wonRe,30000,0);
      break;
    }
    const x=Number(shown[2]),y=Number(shown[3]);
    if(attempt>1)await selectVisibleUnits("target");
    await clickGame(x,y,"Attack "+target);
    step("attack-order",{attempt,at:[x,y]});
    if(attempt===1)await screenshot("win-attack");
    if(await seen(wonRe,45000,0))break;
    if(attempt%4===0){from=await mark();await request(1);}
  }
  const text=await logText();
  const sold=text.match(new RegExp("\\[browser-event\\] sold name="+target+" house="+aiHouse));
  if(sold)throw Error("The computer sold its last "+target+" instead of losing it to the player");
  if(!new RegExp(wonRe).test(text))throw Error("The match was not won: "+JSON.stringify(steps.steps.slice(-6)));
  const killed=text.match(new RegExp("\\[browser-event\\] killed name="+target+" house="+aiHouse+" by=(\\S+)"));
  if(!killed||killed[1]!==playerHouse)throw Error("The last building was not destroyed by the player: "+(killed?killed[0]:"no kill event"));
  step("won",{target,killedBy:killed[1]});
}

async function main(){
  let browser,page;
  try{
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await browserType.launch(launchOptions);
    page=await browser.newPage({viewport:{width:1100,height:980}});
    page.on("console",msg=>{consoleLines.push(...msg.text().split(/\r?\n/));});
    page.on("pageerror",err=>audit.pageErrors.push(String(err.stack||err)));
    // Record the stack of any uncaught error (WebAssembly traps included).
    await page.addInitScript(()=>{
      window.addEventListener("error",e=>{
        if(e.error&&e.error.stack)console.log("[browser-error] "+e.error.stack.replace(/\n/g," | "));
      });
    });
    const winMode=process.env.STOCK_SCENARIO_WIN==="1";
    if(winMode)await page.addInitScript(()=>{window.WCTestArgs=["--browser-test-hooks"];});
    await page.goto("http://127.0.0.1:"+server.address().port+"/"+pagePath,
      {waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(()=>document.body.dataset.runtime==="ready",null,{timeout:90000});
    async function screenshot(name){
      const filename="stock-scenario-"+name+".png";
      await page.screenshot({path:path.join(root,filename)});
      audit.screenshots.push(filename);
    }
    await screenshot("launcher");
    await page.locator("#play-stock").click();
    await page.waitForFunction(()=>document.getElementById("log").textContent.includes("[browser-game] menu.enter"),
      null,{timeout:45000});
    await screenshot("menu");
    const canvas=page.locator("#canvas");
    async function clickGame(x,y,label){
      const box=await canvas.boundingBox();
      if(!box)throw Error("Stock canvas has no visible bounds");
      const marker=await page.evaluate(()=>document.getElementById("log").textContent.length);
      await canvas.click({position:{x:x/640*box.width,y:y/400*box.height}});
      await page.waitForFunction(m=>/\[browser-input\] mouse-down x=(-?\d+) y=(-?\d+)/.test(
        document.getElementById("log").textContent.slice(m)),marker,{timeout:5000});
      const log=await page.evaluate(m=>document.getElementById("log").textContent.slice(m),marker);
      audit.input.push({label,target:[x,y],observed:log.match(/\[browser-input\] mouse-down x=(-?\d+) y=(-?\d+)/)?.slice(1)||null});
    }
    // NEWMENU (defines.h): Multiplayer center y=119, not the Intro row y=151.
    // Select_MPlayer_Game uses the Skirmish row; nulldlg OK center y=359.
    await clickGame(320,119,"Multiplayer");
    await page.waitForFunction(()=>document.getElementById("log").textContent.includes("[browser-game] menu.choice"),
      null,{timeout:12000});
    await page.waitForTimeout(400);
    await screenshot("multiplayer");
    await clickGame(320,91,"Skirmish");
    await page.waitForTimeout(2000);
    await screenshot("scenario-dialog");
    // The first pack intentionally contains no SCM scenario. This click
    // tests the real scenario dialog and records missing input/asset data.
    // M3: pick a map by its row in the skirmish dialog's list (rows are
    // ordered by scenario number: SCM94EA, SCM95EA, SCM96EA, ...).
    const mapRow=Number(process.env.STOCK_SCENARIO_MAP_ROW||0);
    if(mapRow>0){
      await clickGame(192,Math.round(88+mapRow*17.5),"Select map row "+mapRow);
      await page.waitForTimeout(800);
      await screenshot("map-selected");
    }
    const confirmAt=Date.now();
    await clickGame(126,359,"Scenario dialog OK");
    page.waitForFunction(()=>document.getElementById("log").textContent.includes("[browser-game] scenario.loaded="),
      null,{timeout:60000}).then(()=>{audit.timeToMatchStartMs=Date.now()-confirmAt;},()=>{});
    await page.waitForTimeout(7000);
    await screenshot("after-confirm");
    // Phase 7 gate: the battlefield must actually be drawn (terrain plus
    // units/resources), not just loaded. Thresholds come from good runs. A
    // start slot at the map edge leaves much of the view outside the map:
    // run 45551864057 drew a correct battlefield at 8.1% non-black from cell
    // 31,8, so the floor is 5%; the object check still requires units.
    await page.evaluate(()=>{window.WCWatchdog.maxStallMs=0;});
    await page.waitForTimeout(3000);
    const field=await battlefieldStats(page,await canvas.screenshot(),false);
    audit.battlefield=field;
    audit.matchStallMs=await page.evaluate(()=>window.WCWatchdog.maxStallMs);
    if(field.nonBlackShare<0.05)throw Error("Battlefield is mostly black: "+JSON.stringify(field));
    if(field.objectShare<0.002)throw Error("No units or resources visible on the battlefield: "+JSON.stringify(field));
    if(audit.matchStallMs>1000)throw Error("Main-thread stall after match start: "+audit.matchStallMs+"ms");

    // Phase 8: deploy the MCV with real input, as a player would.
    const logText=()=>page.evaluate(()=>document.getElementById("log").textContent);
    audit.map=((await logText()).match(/\[browser-event\] scenario-start name=(\S+)/)||[])[1]||null;
    const expectedMap=process.env.STOCK_SCENARIO_EXPECT_MAP;
    if(expectedMap&&audit.map!==expectedMap)throw Error("Expected map "+expectedMap+" but "+audit.map+" started");
    const playerHouse=((await logText()).match(/\[browser-event\] unit name=\S+ house=(\S+)/)||[])[1];
    if(!playerHouse)throw Error("No player units were reported at match start");
    audit.playerHouse=playerHouse;
    // KeyBase (H, options.cpp) selects the player's MCV and centres on it;
    // Center_Map applies next frame, so then press Home (KeyHome1) for the
    // settled screen position of the selection ([browser-event] centered).
    async function centreOnMcv(){
      await page.keyboard.press("h");
      await page.waitForTimeout(1000);
      const before=(await logText()).length;
      await page.keyboard.press("Home");
      await page.waitForFunction(m=>/\[browser-event\] centered name=MCV x=-?\d+ y=-?\d+/.test(
        document.getElementById("log").textContent.slice(m)),before,{timeout:5000});
      const c=(await logText()).slice(before).match(/\[browser-event\] centered name=MCV x=(-?\d+) y=(-?\d+) cell=(\d+),(\d+)/);
      return [Number(c[1]),Number(c[2]),Number(c[3]),Number(c[4])];
    }
    const deployedRe=new RegExp("\\[browser-event\\] deployed name=MCV into=FACT house="+playerHouse+"\\b");
    // Starting units spawn around the MCV and can block the yard's footprint
    // (Try_To_Deploy, unit.cpp). If a deploy does not happen, drive the MCV
    // to fresh ground and try again.
    // Moves head towards the map centre (the scenario map spans cells 1-62 of
    // the classic 64-cell grid), away from edges and the spawn cluster.
    const moves=[[0,0],[5,5],[-5,5],[5,-5],[-6,-3]];
    audit.deployAttempts=[];
    for(const [mx,my] of moves){
      let [x,y,cx,cy]=await centreOnMcv();
      const sx=Math.sign(31-cx)||1,sy=Math.sign(31-cy)||1;
      if(mx||my){
        const tx=x+sx*Math.abs(mx)*24,ty=y+sy*Math.abs(my)*24+(mx<0?-24*sy:0);
        await clickGame(Math.min(470,Math.max(10,tx)),Math.min(390,Math.max(24,ty)),"Move MCV");
        // Deploying needs a stationary MCV (Try_To_Deploy: no NavCom), so
        // wait until it reports the same cell twice in a row.
        let last="";
        for(let t=0;t<12;t++){
          await page.waitForTimeout(2500);
          [x,y,cx,cy]=await centreOnMcv();
          if(last===cx+","+cy)break;
          last=cx+","+cy;
        }
      }
      await clickGame(x,y,"Deploy MCV");
      const ok=await page.waitForFunction(re=>new RegExp(re).test(document.getElementById("log").textContent),
        deployedRe.source,{timeout:12000}).then(()=>true,()=>false);
      audit.deployAttempts.push({at:[x,y],cell:[cx,cy],deployed:ok});
      if(ok)break;
    }
    if(!audit.deployAttempts.some(a=>a.deployed))throw Error("The MCV could not be deployed: "+JSON.stringify(audit.deployAttempts));
    await page.waitForTimeout(4000);
    await screenshot("deployed");
    const sidebar=await sidebarStats(page,await canvas.screenshot());
    audit.sidebar=sidebar;
    if(sidebar.nonBlackShare<0.25)throw Error("Sidebar did not appear after deploying: "+JSON.stringify(sidebar));
    if(sidebar.cameoSlotsDrawn<2)throw Error("Sidebar shows no buildable cameos: "+JSON.stringify(sidebar));
    // The hooks must be off unless this test asked for them.
    const hooksOn=(await logText()).includes("[browser-test] test hooks enabled");
    if(hooksOn!==winMode)throw Error("Test hooks are "+(hooksOn?"on":"off")+" but STOCK_SCENARIO_WIN is "+(winMode?"set":"not set"));
    if(process.env.STOCK_SCENARIO_SKIP_GAMEPLAY!=="1")await playMatch(page,{clickGame,screenshot,logText,playerHouse,canvas});
    if(winMode)await winMatch(page,{clickGame,screenshot,logText,playerHouse,canvas});
    // M5: sound plays after the first click. The page wraps every Web Audio
    // context the engine's OpenAL creates (shell.html, WCAudio); by now the
    // match has played effects and COMMS lines.
    audit.audio=await page.evaluate(()=>window.WCAudio?{...window.WCAudio.stats,
      states:window.WCAudio.contexts.map(c=>c.state)}:null);
    if(process.env.STOCK_SCENARIO_REQUIRE_AUDIO==="1"){
      const a=audit.audio;
      if(!a||!a.contexts||!a.running||a.sourcesStarted<1||a.secondsQueued<=0)
        throw Error("No sound played after the first click: "+JSON.stringify(a));
    }
    // M3: let the match run with no further player input and record what the
    // computer players do (STOCK_SCENARIO_OBSERVE_MINUTES, default off).
    const observe=Number(process.env.STOCK_SCENARIO_OBSERVE_MINUTES||0);
    const ended=()=>page.evaluate(()=>/\[browser-event\] match-end result=(\w+)/.exec(document.getElementById("log").textContent));
    for(let m=1;m<=observe&&!(await ended());m++){
      for(let s=0;s<12&&!(await ended());s++)await page.waitForTimeout(5000);
      if(!(await ended())&&(m%5===0||m===observe))await screenshot("observe-"+m+"m");
    }
    const end=await ended();
    if(observe&&process.env.STOCK_SCENARIO_REQUIRE_END==="1"){
      if(!end)throw Error("The match did not end within "+observe+" minutes");
      // The computer player must have played: built a base, harvested and
      // fought (guarded engine events; the human player idles).
      const text=await logText();
      const others=re=>[...text.matchAll(re)].filter(m=>m[1]!==playerHouse&&m[1]!=="none").length;
      const ai={placed:others(/\[browser-event\] placed name=\S+ house=(\S+)/g),
        harvestUnloads:others(/\[browser-event\] harvest-unload house=(\S+)/g),
        kills:others(/\[browser-event\] killed name=\S+ house=\S+ by=(\S+)/g)};
      audit.computerPlayer=ai;
      if(ai.placed<3||ai.harvestUnloads<1||ai.kills<1)
        throw Error("The computer player did not build, harvest and attack: "+JSON.stringify(ai));
    }
    if(end){
      // The end-of-match score screen (score.cpp Multi_Score_Presentation)
      // waits for a click, then the game returns to the main menu.
      audit.matchEnd={result:end[1]};
      if(winMode&&end[1]!=="won")throw Error("Expected a win but the match ended: "+end[1]);
      for(let t=1;t<=12;t++){
        await page.waitForTimeout(5000);
        if(t%3===0)await screenshot("score-"+t*5+"s");
      }
      const score=await battlefieldStats(page,await canvas.screenshot(),true);
      audit.matchEnd.scoreScreen=score;
      if(score.nonBlackShare<0.25)throw Error("End-of-match score screen is not drawn: "+JSON.stringify(score));
      if(/Error - out of memory/.test(await logText()))throw Error("End-of-match screen failed: out of memory");
      // After the score screen the game returns to the skirmish setup dialog
      // (Do_Lose/Do_Win set GameActive=false); OK starts a fresh match.
      const starts=async()=>(await logText()).split("[browser-event] scenario-start").length;
      const before=await starts();
      await clickGame(320,200,"Dismiss score screen");
      await page.waitForTimeout(5000);
      await screenshot("restart-dialog");
      await clickGame(126,359,"Restart: scenario dialog OK");
      await page.waitForFunction(n=>document.getElementById("log").textContent.split("[browser-event] scenario-start").length>n,
        before,{timeout:60000});
      audit.matchEnd.restarted=true;
      await page.waitForTimeout(5000);
      await screenshot("after-match");
    }
  }catch(error){
    audit.error=String(error.stack||error);
    if(page){try{
      await page.screenshot({path:path.join(root,"stock-scenario-error.png")});
      audit.screenshots.push("stock-scenario-error.png");
    }catch(e){}}
    audit.status="error";
    if(process.env.STOCK_SCENARIO_REPORT_ONLY!=="1")process.exitCode=1;
  }finally{
    // DOM log is authoritative: parse one chronological stream exactly once.
    let lines=consoleLines;
    if(page){try{
      lines=(await page.locator("#log").textContent()).split(/\r?\n/)
        .concat(consoleLines.filter(l=>l.startsWith("[browser-error]")));
      if(audit.screenshots.length===0){
        const filename="stock-scenario-failure.png";
        await page.screenshot({path:path.join(root,filename)});
        audit.screenshots.push(filename);
      }
    }catch(e){audit.captureError=String(e);}}
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(path.join(root,"stock-scenario-log.txt"),lines.join("\n")+"\n");
    audit.misses=[];audit.fatal=null; audit.lastGameLines=[];audit.lastEventLines=[];audit.stage="startup";
    for(const line of lines)parse(line);
    // Per-house activity, from the guarded engine events.
    audit.houses={};
    const house=h=>audit.houses[h]||(audit.houses[h]={placed:[],produced:{},harvestUnloads:0,harvested:0,killed:0,kills:0,deployed:0});
    for(const line of lines){
      let m;
      if((m=line.match(/\[browser-event\] placed name=(\S+) house=(\S+)/)))house(m[2]).placed.push(m[1]);
      else if((m=line.match(/\[browser-event\] produced name=(\S+) house=(\S+)/))){const p=house(m[2]).produced;p[m[1]]=(p[m[1]]||0)+1;}
      else if((m=line.match(/\[browser-event\] harvest-unload house=(\S+) value=(\d+)/))){house(m[1]).harvestUnloads++;house(m[1]).harvested+=Number(m[2]);}
      else if((m=line.match(/\[browser-event\] killed name=\S+ house=(\S+) by=(\S+)/))){house(m[1]).killed++;if(m[2]!=="none")house(m[2]).kills++;}
      else if((m=line.match(/\[browser-event\] deployed name=\S+ into=\S+ house=(\S+)/)))house(m[1]).deployed++;
    }
    // Classification is contract-driven. Unknown requests stay unclassified
    // (and fail strict mode); do not silently call them optional.
    const requirements=JSON.parse(fs.readFileSync(path.resolve(__dirname,
      "../../game/content/pack/requirements.json"),"utf8"));
    const stages=new Map(requirements.files.map(entry=>[
      entry.name.toUpperCase(),entry.requiredFor]));
    // Documented engine probes for optional data (requirements.json
    // optionalPatterns, each with its reason and code reference).
    const optionalPatterns=(requirements.optionalPatterns||[]).map(p=>new RegExp(p.pattern,"i"));
    for(const miss of audit.misses){
      const name=path.basename(miss.name.replace(/\\/g,"/")).toUpperCase();
      const stage=stages.get(name)||(optionalPatterns.some(re=>re.test(name))?"optional":undefined);
      miss.requiredFor=stage||"unclassified";
      if(stage==="optional")audit.optionalMisses.push(miss);
      else if(stage)audit.requiredMisses.push(miss);
      else audit.unclassifiedMisses.push(miss);
    }
    // M5 exit gate: no wireframe placeholder may be drawn. PROVENANCE.json
    // names the generator of every archive member.
    try{
      const prov=JSON.parse(fs.readFileSync(path.join(root,"data","PROVENANCE.json"),"utf8"));
      const source=new Map();
      for(const members of Object.values(prov.members||{}))
        for(const [name,info] of Object.entries(members))source.set(name.toUpperCase(),info.generator);
      for(const name of audit.drawn){
        const gen=source.get(name.toUpperCase())||"unknown";
        (audit.drawnBySource[gen]=audit.drawnBySource[gen]||[]).push(name);
        if(/wireframes\.js$/.test(gen))audit.wireframeDrawn.push(name);
      }
    }catch(e){audit.drawnBySource.error=[String(e.message)];}
    const reached=audit.lastGameLines.some(x=>x.includes("scenario.request="));
    if(reached)audit.pathDecision="Skirmish (scenario.request observed)";
    if(!audit.error)audit.status=reached?"scenario-request":"blocked-before-scenario";
    if(process.env.STOCK_SCENARIO_REPORT_ONLY!=="1"&&
        (!audit.lastGameLines.some(x=>x.includes("scenario.loaded="))||
          audit.requiredMisses.length||audit.unclassifiedMisses.length||
          (process.env.STOCK_SCENARIO_ALLOW_WIREFRAMES!=="1"&&audit.wireframeDrawn.length)||
          audit.fatal||audit.pageErrors.length||audit.error)){
      audit.error=audit.error||("Scenario probe failed: stage="+audit.stage+
        " fatal="+audit.fatal+" pageErrors="+audit.pageErrors.length+
        (audit.wireframeDrawn.length?" wireframes drawn="+audit.wireframeDrawn.join(","):""));
      audit.status="error";
      process.exitCode=1;
    }
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(report,JSON.stringify(audit,null,2)+"\n");
    if(page)await page.close();
    if(browser)await browser.close();
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
  if(audit.map)console.log("Map:",audit.map);
  console.log("Stock scenario audit:",audit.status,"stage:",audit.stage,"misses:",audit.misses.length,
    "required:",audit.requiredMisses.length,"unclassified:",audit.unclassifiedMisses.length,
    "optional:",audit.optionalMisses.length);
  // Put the failure and progress in the job log itself; the artifact is not
  // always reachable from where the log is read.
  console.log("Drawn files by source:",JSON.stringify(audit.drawnBySource));
  if(audit.audio!==undefined)console.log("Audio:",JSON.stringify(audit.audio));
  if(audit.error)console.log("Error:",audit.error);
  if(audit.gameplay)console.log("Gameplay steps:",JSON.stringify(audit.gameplay.steps));
  if(audit.error){
    // The last game events explain most failures (destroyed buildings,
    // production state, harvests); print them with the error.
    const recent=audit.lastEventLines.filter(l=>!/\] credits /.test(l)).slice(-25);
    console.log("Recent events:\n"+recent.join("\n"));
  }
  if(audit.deployAttempts)console.log("Deploy attempts:",JSON.stringify(audit.deployAttempts));
  if(audit.houses)console.log("Houses:",JSON.stringify(audit.houses));
  if(audit.matchEnd)console.log("Match end:",JSON.stringify(audit.matchEnd));
  if(audit.computerPlayer)console.log("Computer player:",JSON.stringify(audit.computerPlayer));
  if(audit.win)console.log("Win steps:",JSON.stringify(audit.win.steps));
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
