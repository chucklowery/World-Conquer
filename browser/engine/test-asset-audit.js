"use strict";
const assert = require("node:assert/strict");
const { create, collect } = require("./asset-audit.js");
const audit = create();
assert.deepEqual(audit, { hits: [], misses: [], fatal: null });
collect(audit, "[asset-hit] CONQUER.MIX loose\n[asset-hit] MOUSE.SHP CONQUER.MIX");
collect(audit, "[asset-miss] GENERAL.MIX");
collect(audit, "[asset-miss] GENERAL.MIX");
collect(audit, "[browser-game] fatal=missing boot palette");
collect(audit, "[unrelated] ignored");
assert.deepEqual(audit.hits, [
  { name: "CONQUER.MIX", source: "loose" },
  { name: "MOUSE.SHP", source: "CONQUER.MIX" }
]);
assert.deepEqual(audit.misses, ["GENERAL.MIX", "GENERAL.MIX"]);
assert.equal(audit.fatal, "missing boot palette");
console.log("asset audit parser tests passed");
