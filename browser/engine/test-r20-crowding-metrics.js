#!/usr/bin/env node
"use strict";
// Strict structural validation for FND-003 host congestion evidence.
// Host microsecond latencies are recorded, not treated as approved budgets.
const assert = require("node:assert/strict");
const fs = require("node:fs");

function validate(data) {
  assert.equal(data.schemaVersion, 1, "Unsupported FND-003 metrics schema");
  assert.equal(data.scenario, "R20-24-actor-native");
  assert.equal(data.hostTimingIsAcceptance, false,
    "Host timing must not be misrepresented as an approved acceptance budget");
  assert(Array.isArray(data.maps) && data.maps.length === 2, "Expected both R04 maps");
  assert.deepEqual(data.maps.map(m => m.map).sort(), ["marsh-border","ridge-pass"]);
  for (const m of data.maps) {
    assert.equal(m.actors, 24);
    assert.equal(m.ticks, 480);
    assert.equal(m.replays, 2);
    assert(typeof m.deterministicHash === "string" &&
      /^[1-9][0-9]*$/.test(m.deterministicHash), "Missing deterministic replay hash");
    assert.equal(m.arrived, 24, "All commanded destinations must be reached");
    assert(Number.isSafeInteger(m.finallyParked) && m.finallyParked >= 0 &&
      m.finallyParked <= 24, "Invalid final parking count");
    for (const key of ["unreachable","congested","waitingAtEnd","pendingAt480"]) {
      assert.equal(m[key], 0, "Unexpected native congestion or remaining order: " + key);
    }
    for (const key of ["peakPendingOrders","pendingAt240"]) {
      assert(Number.isSafeInteger(m[key]) && m[key] >= 0 && m[key] <= 24,
        "Invalid pending-order backlog: " + key);
    }
    assert(m.pendingAt240 <= m.peakPendingOrders,
      "Intermediate pending backlog exceeds reported peak");
    assert(Number.isSafeInteger(m.peakSearchesPerTick) &&
      m.peakSearchesPerTick >= 0 && m.peakSearchesPerTick <= 2,
      "Native path search budget exceeded");
    const cells = m.map === "ridge-pass" ? 160 : 336;
    assert(Number.isSafeInteger(m.peakExpandedCellsPerTick) &&
      m.peakExpandedCellsPerTick >= 0 &&
      m.peakExpandedCellsPerTick <= 2*Math.min(cells,512),
      "Native expanded-cell budget exceeded");
    for (const key of ["totalSearches","totalExpandedCells"]) {
      assert(Number.isSafeInteger(m[key]) && m[key] >= 0,
        "Invalid cumulative path work: " + key);
    }
    assert(Array.isArray(m.p95HostTickUs) && m.p95HostTickUs.length === 2 &&
      m.p95HostTickUs.every(x => Number.isSafeInteger(x) && x >= 0),
      "Missing host p95 samples for two independent replays");
  }
  return {maps:data.maps.map(m => ({
    map:m.map, arrived:m.arrived, finallyParked:m.finallyParked,
    p95HostTickUs:m.p95HostTickUs,
    peakPendingOrders:m.peakPendingOrders, pendingAt240:m.pendingAt240,
    pendingAt480:m.pendingAt480, peakSearchesPerTick:m.peakSearchesPerTick,
    peakExpandedCellsPerTick:m.peakExpandedCellsPerTick
  })), status:"structural-pass; host timing observed, pending maintainer budget approval"};
}
if (require.main === module) {
  try {
    assert.equal(process.argv.length, 3, "Usage: node test-r20-crowding-metrics.js <artifact.json>");
    const result = validate(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
    console.log("PASS: R20 24-actor host crowding evidence",JSON.stringify(result));
  } catch (err) {console.error(err.stack || err); process.exitCode=1;}
}
module.exports={validate};
