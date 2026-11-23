#!/usr/bin/env node
"use strict";
// M2a: exercise the stock VanillaTD menu with real canvas input. Audit is
// written even when an incomplete original pack prevents scenario startup.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"../../build/browser-engine");
const report=path.join(root,"stock-scenario-audit.json");
const mime={".html":"text/html",".js":"text/javascript",".wasm":"application/wasm",".json":"application/json"};
const server=http.createServer((req,res)=>{
  let name;
  try { name=decodeURIComponent((req.url||"/").split("?")[0]); }catch {res.writeHead(400);res.end();return;}
  if(!/^\/[A-Za-z0-9_./-]+$/.test(name)||name.split("/").includes("..")){
    res.writeHead(400);res.end("Invalid path");return;
  }
  fs.readFile(path.join(root,name.slice(1)),(err,data)=>{
    if(err){res.writeHead(404);res.end("Missing");return;}
    res.writeHead(200,{"Content-Type":mime[path.extname(name).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
});
const audit={schema:1,pathDecision:"Skirmish (default; pending runtime confirmation)",status:"incomplete",
  stage:"startup",misses:[],fatal:null,lastGameLines:[],lastEventLines:[],
  pageErrors:[],screenshots:[],input:[],ciSha:process.env.GITHUB_SHA||"local"};
const seen=new Map();
function parse(line){
  const stage=line.match(/^\[browser-game\] (menu\.enter|menu\.choice|scenario\.request|scenario\.loaded|scenario\.failed)/);
  if(stage)audit.stage=stage[1];
  if(line.startsWith("[browser-game]"))audit.lastGameLines.push(line);
  if(line.startsWith("[browser-event]"))audit.lastEventLines.push(line);
  if(audit.lastGameLines.length>60)audit.lastGameLines.shift();
  if(audit.lastEventLines.length>60)audit.lastEventLines.shift();
  const miss=line.match(/^\[asset-miss\] (\S+)/);
  if(miss&&!seen.has(miss[1])){const entry={name:miss[1],firstSeenStage:audit.stage};seen.set(miss[1],entry);audit.misses.push(entry);}
  const fatal=line.match(/^\[browser-game\] fatal=(.*)/);
  if(fatal)audit.fatal=fatal[1];
}
async function main(){
  let browser,page;
  const pending=[];
  try{
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
    page=await browser.newPage({viewport:{width:1100,height:980}});
    page.on("console",msg=>{for(const line of msg.text().split(/\r?\n/))parse(line);});
    page.on("pageerror",err=>audit.pageErrors.push(String(err.stack||err)));
    await page.goto("http://127.0.0.1:"+server.address().port+"/vanillatd.html",
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
      const log=await page.evaluate(m=>document.getElementById("log").textContent.slice(m),marker);
      audit.input.push({label,target:[x,y],observed:log.match(/\[browser-input\] mouse-down x=(-?\d+) y=(-?\d+)/)?.slice(1)||null});
    }
    // Coordinates derive from the 640x400 menu layout:
    // menus.cpp Main_Menu D_MULTI_{X,Y,W,H}, mplayer.cpp
    // Select_MPlayer_Game d_modemserial_*, nulldlg.cpp d_ok_*.
    await clickGame(320,151,"Multiplayer");
    await page.waitForTimeout(1500);
    await screenshot("multiplayer");
    await clickGame(320,91,"Skirmish");
    await page.waitForTimeout(2000);
    await screenshot("scenario-dialog");
    // The first pack intentionally contains no SCM scenario. This click
    // tests the real scenario dialog and records missing input/asset data.
    await clickGame(126,349,"Scenario dialog OK");
    await page.waitForTimeout(7000);
    await screenshot("after-confirm");
    audit.pathDecision="Skirmish";
    audit.status=audit.lastGameLines.some(x=>x.includes("scenario.request="))?"scenario-request":"blocked-before-scenario";
    if(audit.status!=="scenario-request"&&process.env.STOCK_SCENARIO_REPORT_ONLY!=="1")
      throw Error("Stock scenario.request not reached; inspect "+report);
    if(audit.fatal&&process.env.STOCK_SCENARIO_REPORT_ONLY!=="1")
      throw Error("Stock engine fatal: "+audit.fatal);
  }catch(error){
    audit.error=String(error.stack||error);
    audit.status="error";
    if(process.env.STOCK_SCENARIO_REPORT_ONLY!=="1")process.exitCode=1;
  }finally{
    // Read the text log too: redirected printf may be displayed in the page
    // before Chrome's console dispatch reaches the Playwright event handler.
    if(page){try{
      const lines=(await page.locator("#log").textContent()).split(/\r?\n/);
      for(const line of lines)parse(line);
      if(audit.screenshots.length===0){
        await page.screenshot({path:path.join(root,"stock-scenario-failure.png")});
        audit.screenshots.push("stock-scenario-failure.png");
      }
    }catch(e){audit.captureError=String(e);}}
    // Deduplicate names after the final DOM log pass.
    audit.misses=[...new Map(audit.misses.map(x=>[x.name,x])).values()];
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(report,JSON.stringify(audit,null,2)+"\n");
    if(page)await page.close();
    if(browser)await browser.close();
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
  console.log("Stock scenario audit:",audit.status,"stage:",audit.stage,"misses:",audit.misses.length);
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
