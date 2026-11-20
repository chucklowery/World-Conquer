#!/usr/bin/env node
// Compare three or more independent, complete R20 Chromium/WASM soak runs on
// the same exact revision. Observational metrics are not acceptance limits.
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");

function summarize(files) {
  assert(files.length >= 3, "At least three independent run artifacts are required");
  const runs = files.map(file => JSON.parse(fs.readFileSync(file, "utf8")));
  const sha = runs[0].sha;
  assert(/^[a-f0-9]{40}$/.test(sha), "A full GitHub candidate SHA is required");
  // A rerun of one workflow is a retry, not an independent browser run.
  const runIds = new Set();
  const epochs = runs[0].maps?.[0]?.epochs;
  assert(Number.isInteger(epochs) && epochs >= 12,
         "Expected at least 12 WASM restart epochs per map");
  for (const run of runs) {
    assert.equal(run.schemaVersion, 3, "Unsupported measurement format");
    assert.equal(run.status, "complete", "Incomplete browser scenario");
    assert.equal(run.sha, sha, "Measurements use different candidate revisions");
    assert(typeof run.runId === "string" && /^[1-9]\d*$/.test(run.runId) &&
           Number.isSafeInteger(Number(run.runId)) &&
           Number.isSafeInteger(run.runAttempt) &&
           run.runAttempt >= 1, "Missing GitHub run identity");
    assert(!runIds.has(run.runId), "Repeated workflow run ID (reruns are not independent)");
    runIds.add(run.runId);
    assert(Array.isArray(run.maps) && run.maps.length === 2,
           "Exactly two map measurements are required");
    assert.deepEqual(run.maps.map(map => map.map).sort(),
                     ["marsh-border", "ridge-pass"]);
    for (const map of run.maps) {
      assert.equal(map.epochs, epochs, "Incomparable epoch counts");
      assert(Number.isSafeInteger(map.requiredSustainedSeconds) &&
             map.requiredSustainedSeconds>=300,
             "Not a sustained five-minute-per-map measurement");
      assert.equal(map.requiredSustainedSeconds, runs[0].maps[0].requiredSustainedSeconds,
                   "Incomparable soak duration requirements");
      assert(Number.isSafeInteger(map.requiredTicksPerEpoch) &&
             map.requiredTicksPerEpoch>=40,
             "Missing sustained native tick target");
      assert(map.elapsedSeconds>=map.requiredSustainedSeconds,
             "Native scenario did not run for the required elapsed duration");
      assert(Number.isSafeInteger(map.sampledTicks) && map.sampledTicks >= epochs * map.requiredTicksPerEpoch,
             "Insufficient sampled native ticks");
      assert(Array.isArray(map.wasmHeapBytes) && map.wasmHeapBytes.length === epochs &&
             map.wasmHeapBytes.every(n => Number.isSafeInteger(n) && n > 0),
             "Missing WASM allocation samples");
      assert.equal(map.postWarmupHeapDeltaBytes,
                   Math.max(...map.wasmHeapBytes.slice(1)) -
                   Math.min(...map.wasmHeapBytes.slice(1)),
                   "Post-warmup allocation delta is inconsistent");
      assert(Number.isSafeInteger(map.animationFrameSamples) && map.animationFrameSamples > 0 &&
             Number.isFinite(map.animationFrameIntervalP95Ms) &&
             map.animationFrameIntervalP95Ms >= 0,
             "Missing animation-frame interval samples");
      assert(Number.isFinite(map.elapsedSeconds) && map.elapsedSeconds > 0,
             "Missing elapsed time");
      assert(Number.isSafeInteger(map.nativeTickTimingSamples) &&
             map.nativeTickTimingSamples >= epochs * map.requiredTicksPerEpoch &&
             map.nativeTickTimingSamples <= 4096 &&
             Number.isFinite(map.nativeTickP95Us) && map.nativeTickP95Us >= 0,
             "Missing native simulation tick timing");
      assert.equal(map.pageErrors, 0, "Browser page errors occurred");
    }
  }
  const maps = ["ridge-pass", "marsh-border"].map(id => {
    const samples = runs.map(run => run.maps.find(map => map.map === id));
    const range = key => [Math.min(...samples.map(m => m[key])),
                          Math.max(...samples.map(m => m[key]))];
    return {map:id, epochs,
      requiredSustainedSeconds:samples[0].requiredSustainedSeconds,
      sampledTicks:range("sampledTicks"),
      elapsedSeconds:range("elapsedSeconds"),
      frameIntervalP95Ms:range("animationFrameIntervalP95Ms"),
      nativeTickP95Us:range("nativeTickP95Us"),
      nativeTickTimingSamples:range("nativeTickTimingSamples"),
      allocatedWasmHeapDeltaBytes:range("postWarmupHeapDeltaBytes")};
  });
  return {sha, independentRuns:runs.length, maps,
    interpretation:"Sustained wall-clock and advancing native ticks are required for both maps. Observed ranges only: native tick p95 includes synchronous simulation, bridge and HUD DOM work, but excludes SDL scene drawing, browser compositing and event-loop scheduling; up to 4096 durations are retained. rAF intervals capture presentation cadence, and allocated WASM memory is not live-object memory. No performance thresholds have been approved."};
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(summarize(process.argv.slice(2)), null, 2));
  } catch (err) {
    console.error("R20 metrics comparison failed: " + err.message);
    process.exitCode = 1;
  }
}
module.exports = {summarize};
