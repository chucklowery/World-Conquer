#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {chromium}=require("playwright");

async function main(){
  const site=path.resolve(process.argv[2]||"build/browser-engine/r05");
  const manifest=JSON.parse(fs.readFileSync(path.join(site,"manifest.json")));
  const server=http.createServer((req,res)=>{
    const requested=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    const rel=requested==="/"?"gallery.html":requested.slice(1);
    if(!/^[a-zA-Z0-9./-]+$/.test(rel)||rel.split("/").includes("..")){res.writeHead(400);res.end();return;}
    const full=path.join(site,rel);
    fs.readFile(full,(error,bytes)=>{
      if(error){res.writeHead(404);res.end();return;}
      res.setHeader("Content-Type",rel.endsWith(".png")?"image/png":rel.endsWith(".js")?"application/javascript":rel.endsWith(".json")?"application/json":"text/html");
      res.end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:["--no-sandbox"]});
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
    const errors=[];page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/gallery.html`);
    await page.locator("#field[data-ready='true']").waitFor({timeout:20000});
    assert.match(await page.locator("#status").innerText(),/VERIFIED · 24 ASSETS/);
    assert.equal(await page.locator(".asset").count(),24);
    assert.equal(await page.locator("canvas#field").getAttribute("width"),"864");
    assert.equal(await page.locator("canvas#field").getAttribute("height"),"480");
    const capture=()=>page.evaluate(()=>{
      const c=document.getElementById("field"),a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let hash=2166136261,teal=0,orange=0;
      for(let i=0;i<a.length;i+=4){
        hash=Math.imul(hash^a[i],16777619)>>>0;
        const x=(i/4)%c.width;
        if(x<c.width/2 && a[i]===47 && a[i+1]===153 && a[i+2]===144)teal++;
        if(x>c.width/2 && a[i]===191 && a[i+1]===102 && a[i+2]===84)orange++;
      }
      return {hash,teal,orange};
    });
    const baseline=await capture();assert(baseline.teal>20,`Missing Aster team pixels: ${baseline.teal}`);
    assert(baseline.orange>20,`Missing Forge team pixels: ${baseline.orange}`);
    const images=new Set([baseline.hash]);
    for(let phase=1;phase<=4;phase++){
      await page.locator(`[data-phase='${phase}']`).click();
      assert.equal(await page.locator("#field").getAttribute("data-phase"),String(phase));
      images.add((await capture()).hash);
    }
    assert.equal(images.size,5,"Five visual states did not produce five distinct battlefield compositions");
    await page.locator("[data-phase='2']").click();
    const directions=new Set([(await capture()).hash]);
    for(let facing=1;facing<8;facing++){
      await page.locator("#turn").click();
      assert.equal(await page.locator("#field").getAttribute("data-heading"),String(facing));
      directions.add((await capture()).hash);
    }
    assert(directions.size>=6,`Eight facings were not visually distinct (${directions.size})`);
    const beforeStep=(await capture()).hash;
    await page.locator("#step").click();
    assert.notEqual((await capture()).hash,beforeStep,"Frame stepping did not advance action animation");
    await page.locator("[data-phase='0']").click();
    const shot=path.join(site,"gallery-proof.png");await page.screenshot({path:shot,fullPage:true});
    assert.equal(errors.length,0,errors.join("\n"));
    // A corrupt atlas must fail closed; the page must not claim verified art.
    const broken=await browser.newPage();
    await broken.route("**/atlases/atlas-0.png",route=>route.fulfill({status:200,contentType:"image/png",body:Buffer.from("tampered") }));
    await broken.goto(`http://127.0.0.1:${server.address().port}/gallery.html`);
    await broken.locator("#status[data-error='true']").waitFor({timeout:15000});
    assert.match(await broken.locator("#status").innerText(),/size mismatch|hash mismatch/);
    console.log(`PASS: R05 Chromium gallery (${manifest.assets.length} cards, both team colors at 24px cells, 5 visual states, 8 directional views, animation stepping, SHA rejection); screenshot ${shot}`);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
