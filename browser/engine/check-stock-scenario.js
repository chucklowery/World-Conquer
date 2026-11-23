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
const audit={schema:1,pathDecision:"pending (Skirmish candidate)",status:"incomplete",
  stage:"startup",misses:[],fatal:null,lastGameLines:[],lastEventLines:[],
  pageErrors:[],screenshots:[],input:[],ciSha:process.env.GITHUB_SHA||"local"};
const consoleLines=[];
function parse(rawLine){
  const line=rawLine.replace(/^\[error\]\s*/,"");
  const stage=line.match(/^\[browser-game\] (menu\.enter|menu\.choice|scenario\.request|scenario\.loaded|scenario\.failed)/);
  if(stage)audit.stage=stage[1];
  if(line.startsWith("[browser-game]"))audit.lastGameLines.push(line);
  if(line.startsWith("[browser-event]"))audit.lastEventLines.push(line);
  if(audit.lastGameLines.length>60)audit.lastGameLines.shift();
  if(audit.lastEventLines.length>60)audit.lastEventLines.shift();
  const miss=line.match(/^\[asset-miss\] (\S+)/);
  if(miss&&!audit.misses.some(x=>x.name===miss[1]))audit.misses.push({name:miss[1],firstSeenStage:audit.stage});
  const fatal=line.match(/^\[browser-game\] fatal=(.*)/);
  if(fatal)audit.fatal=fatal[1];
}
async function main(){
  let browser,page;
  try{
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
    page=await browser.newPage({viewport:{width:1100,height:980}});
    page.on("console",msg=>{consoleLines.push(...msg.text().split(/\r?\n/));});
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
    await clickGame(126,359,"Scenario dialog OK");
    await page.waitForTimeout(7000);
    await screenshot("after-confirm");
  }catch(error){
    audit.error=String(error.stack||error);
    audit.status="error";
    if(process.env.STOCK_SCENARIO_REPORT_ONLY!=="1")process.exitCode=1;
  }finally{
    // DOM log is authoritative: parse one chronological stream exactly once.
    let lines=consoleLines;
    if(page){try{
      lines=(await page.locator("#log").textContent()).split(/\r?\n/);
      if(audit.screenshots.length===0){
        const filename="stock-scenario-failure.png";
        await page.screenshot({path:path.join(root,filename)});
        audit.screenshots.push(filename);
      }
    }catch(e){audit.captureError=String(e);}}
    audit.misses=[];audit.fatal=null; audit.lastGameLines=[];audit.lastEventLines=[];audit.stage="startup";
    for(const line of lines)parse(line);
    const reached=audit.lastGameLines.some(x=>x.includes("scenario.request="));
    if(reached)audit.pathDecision="Skirmish (scenario.request observed)";
    if(!audit.error)audit.status=reached?"scenario-request":"blocked-before-scenario";
    if(process.env.STOCK_SCENARIO_REPORT_ONLY!=="1"&&
        (!reached||audit.fatal||audit.pageErrors.length||audit.error)){
      audit.error=audit.error||("Scenario probe failed: stage="+audit.stage+
        " fatal="+audit.fatal+" pageErrors="+audit.pageErrors.length);
      audit.status="error";
      process.exitCode=1;
    }
    fs.mkdirSync(root,{recursive:true});
    fs.writeFileSync(report,JSON.stringify(audit,null,2)+"\n");
    if(page)await page.close();
    if(browser)await browser.close();
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
  console.log("Stock scenario audit:",audit.status,"stage:",audit.stage,"misses:",audit.misses.length);
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
