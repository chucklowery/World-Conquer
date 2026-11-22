#!/usr/bin/env node
"use strict";
// Headless stock-path M1 gate. Uses original generated data only.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),zlib=require("node:zlib");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"../../build/browser-engine");
const mime={".html":"text/html",".js":"text/javascript",".wasm":"application/wasm",
  ".json":"application/json",".mix":"application/octet-stream"};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent((req.url||"/").split("?")[0]);
  if(!/^\/[A-Za-z0-9_./-]+$/.test(name)||name.split("/").includes("..")){
    res.writeHead(400);res.end("Invalid path");return;
  }
  fs.readFile(path.join(root,name.slice(1)),(error,data)=>{
    if(error){res.writeHead(404);res.end("Missing");return;}
    res.writeHead(200,{"Content-Type":mime[path.extname(name).toLowerCase()]||"application/octet-stream",
      "Cache-Control":"no-store"});res.end(data);
  });
});
const logs=[],errors=[];
const target=path.join(root,"stock-engine-metrics.json");
function percentile(v,p){const a=[...v].sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];}
function sizes(){
  return [480,1100,1600];
}
async function main(){
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const origin="http://127.0.0.1:"+server.address().port+"/vanillatd.html";
  const metrics={schema:1,sha:process.env.GITHUB_SHA||"local",status:"incomplete",sizes:[],rawBytes:{},gzipBytes:{}};
  for(const name of ["vanillatd.wasm","vanillatd.js"]){
    const bytes=fs.readFileSync(path.join(root,name));
    metrics.rawBytes[name]=bytes.length;
    metrics.gzipBytes[name]=zlib.gzipSync(bytes).length;
  }
  try{
    for(const width of sizes()){
      const page=await browser.newPage({viewport:{width,height:980}});
      page.on("console",m=>logs.push(m.type()+": "+m.text()));
      page.on("pageerror",e=>errors.push(String(e.stack||e)));
      const t0=Date.now();
      await page.goto(origin,{waitUntil:"domcontentloaded",timeout:90000});
      await page.waitForFunction(()=>document.body.dataset.runtime==="ready",null,{timeout:90000});
      const canvas=page.locator("#canvas");
      await page.screenshot({path:path.join(root,"stock-pre-"+width+".png")});
      await page.locator("#play-stock").click();
      try {
        await page.waitForFunction(()=>document.getElementById("log").textContent.includes("[browser-game] menu.enter"),
          null,{timeout:45000});
      } catch (error) {
        const details=await page.evaluate(()=>({
          status:document.getElementById("runtime-state").textContent,
          audit:window.WCAssetAudit,
          recentLog:document.getElementById("log").textContent.slice(-5000)
        }));
        throw Error("Stock menu not reached: "+JSON.stringify(details)+"; "+error.message);
      }
      const timeToMenuMs=Date.now()-t0;
      await page.evaluate(()=>{window.WCWatchdog.maxStallMs=0;window.WCWatchdog.stalls=[];});
      const menu=await canvas.screenshot();
      await page.screenshot({path:path.join(root,"stock-menu-"+width+".png")});
      assert(menu.length>1000,"Menu image is too small or blank");
      await canvas.click({position:{x:Math.max(3,Math.floor((await canvas.boundingBox()).width/2)),
        y:Math.max(3,Math.floor((await canvas.boundingBox()).height/2))}});
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(400);
      const after=await canvas.screenshot();
      assert(!menu.equals(after),"Stock menu did not respond to input at width "+width);
      await page.screenshot({path:path.join(root,"stock-input-"+width+".png")});
      const audit=await page.evaluate(()=>({
        audit:window.WCAssetAudit,watchdog:window.WCWatchdog,
        heapBytes:(window.Module&&window.Module.HEAPU8&&window.Module.HEAPU8.length)||null
      }));
      assert.equal(errors.length,0,"Page errors: "+errors.join("\n"));
      assert.equal(audit.audit.fatal,null,"Engine fatal: "+audit.audit.fatal);
      assert(audit.watchdog.maxStallMs<=1000,"Main-thread stall exceeded 1000ms");
      const req=JSON.parse(fs.readFileSync(path.join(root,"data/boot-requirements.json"),"utf8"));
      // The native lookup layer may report lower-case names or absolute MEMFS paths.
      const assetName=name=>String(name).replace(/\\\\/g,"/").split("/").pop().toUpperCase();
      const required=new Set(req.files.filter(x=>["boot","menu"].includes(x.requiredFor)).map(x=>assetName(x.name)));
      const bad=audit.audit.misses.filter(name=>required.has(assetName(name)));
      assert.deepEqual(bad,[],"Boot/menu asset misses");
      const timings=await page.evaluate(()=>new Promise(resolve=>{
        const deltas=[];let prev=performance.now(),start=prev;
        function tick(now){deltas.push(now-prev);prev=now;if(now-start>=30000)resolve(deltas);
          else requestAnimationFrame(tick);}requestAnimationFrame(tick);
      }));
      // Frame timing samples 30s; memory is sampled a full 60s after menu entry.
      await page.waitForTimeout(30000);
      const endHeap=await page.evaluate(()=>(window.Module&&window.Module.HEAPU8&&window.Module.HEAPU8.length)||null);
      assert.equal(errors.length,0,"Page errors during 60s menu soak: "+errors.join("\\n"));
      const finalAudit=await page.evaluate(()=>({fatal:window.WCAssetAudit.fatal,misses:window.WCAssetAudit.misses,
        maxStallMs:window.WCWatchdog.maxStallMs}));
      assert.equal(finalAudit.fatal,null,"Engine fatal during menu soak: "+finalAudit.fatal);
      assert.deepEqual(finalAudit.misses.filter(name=>required.has(assetName(name))),[],
        "Boot/menu asset misses during menu soak");
      assert(finalAudit.maxStallMs<=1000,"Main-thread stall exceeded 1000ms during menu soak");
      metrics.sizes.push({width,timeToMenuMs,stallMs:audit.watchdog.maxStallMs,
        frameP50Ms:percentile(timings,0.5),frameP95Ms:percentile(timings,0.95),
        heapBytesAtMenu:audit.heapBytes,heapBytesAtEnd:endHeap});
      await page.close();
    }
    metrics.status="pass";
  }catch(error){metrics.status="fail";metrics.error=String(error.stack||error);throw error;
  }finally{
    fs.writeFileSync(target,JSON.stringify(metrics,null,2)+"\n");
    fs.writeFileSync(path.join(root,"stock-engine-audit.log"),logs.concat(errors).join("\n")+"\n");
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
  console.log("Stock engine menu and input acceptance passed",metrics.sizes);
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
