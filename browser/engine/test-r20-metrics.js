#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const {summarize} = require("../../scripts/summarize-r20-metrics");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "r20-metrics-"));
try {
  const sha = "a".repeat(40);
  const map = id => ({map:id, epochs:12, sampledTicks:480,
    elapsedSeconds:25, wasmHeapBytes:Array(12).fill(1048576),
    postWarmupHeapDeltaBytes:0, animationFrameSamples:200,
    animationFrameIntervalP95Ms:17.5, nativeTickTimingSamples:490,
    nativeTickP95Us:87.25, pageErrors:0});
  const sample = runId => ({schemaVersion:2, sha, runId, runAttempt:1, status:"complete",
    maps:[map("ridge-pass"), map("marsh-border")]});
  const files = ["a", "b", "c"].map(name => path.join(temp, name + ".json"));
  files.forEach((file, i) => fs.writeFileSync(file, JSON.stringify(sample(String(i+1)))));
  const summary = summarize(files);
  assert.equal(summary.independentRuns, 3);
  assert.equal(summary.maps[0].sampledTicks[0], 480);
  assert.deepEqual(summary.maps[0].nativeTickP95Us,[87.25,87.25]);
  assert.throws(() => summarize(files.slice(0, 2)), /three/);
  const bad = sample("3");
  bad.maps[0].postWarmupHeapDeltaBytes = 42;
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /inconsistent/);
  bad.maps[0].postWarmupHeapDeltaBytes = 0;
  bad.sha = "b".repeat(40);
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /different candidate/);
  bad.sha = sha;
  bad.runId = "2";
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /Repeated artifact/);
  bad.runId = "3";
  bad.status = "incomplete";
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /Incomplete/);
  bad.status = "complete";
  bad.maps[0].nativeTickTimingSamples = 0;
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /native simulation tick timing/);
  bad.maps[0].nativeTickTimingSamples = 5000;
  fs.writeFileSync(files[2], JSON.stringify(bad));
  assert.throws(() => summarize(files), /native simulation tick timing/);
  console.log("PASS: R20 same-SHA three-run metrics and fail-closed validation");
} finally {
  fs.rmSync(temp, {recursive:true, force:true});
}
