#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const {waitForNativeTicks} = require("./r20-soak-wait");

async function main() {
  let snapshot = {epoch:7,tick:119};
  global.WCRTS = {latest:() => snapshot};
  let calls=0;
  const page = {waitForFunction:async (predicate,arg,options) => {
    ++calls;
    assert.deepEqual(arg,{epoch:7,tick:100,requiredTicks:20});
    assert.deepEqual(options,{timeout:25000});
    assert.equal(predicate(arg),false,"A unit must not be admitted before 20 ticks");
    snapshot={epoch:8,tick:150};
    assert.equal(predicate(arg),false,"A different epoch must not satisfy the wait");
    snapshot={epoch:7,tick:120};
    assert.equal(predicate(arg),true,"Advancing the specified native epoch must satisfy the wait");
    return "ready";
  }};
  assert.equal(await waitForNativeTicks(page,7,100,20,25000),"ready");
  assert.equal(calls,1);
  assert.throws(()=>waitForNativeTicks(page,7,100,0,25000),/Invalid native soak/);
  assert.throws(()=>waitForNativeTicks(page,7,100,20,0),/Invalid native soak/);
  assert.throws(()=>waitForNativeTicks(page,-1,100,20,25000),/Invalid native soak/);
  delete global.WCRTS;
  console.log("PASS: R20 Chromium native tick wait serializes requiredTicks and enforces epoch");
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
