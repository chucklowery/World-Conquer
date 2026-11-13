#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {load} = require("./original-asset");

async function main() {
  const payload = Buffer.from([1, 2, 3, 4]);
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  const manifest = {schemaVersion: 1, assets: [{id: "unit.placeholder-scout",
    target: "units/SCOUT.SHP", bytes: payload.length, sha256},
    {id: "palette.placeholder", target: "palettes/SCOUT.PAL", bytes: payload.length, sha256}]};
  const urls = [];
  const fetcher = async url => {
    urls.push(url);
    return url.endsWith("manifest.json")
      ? {ok: true, json: async () => manifest}
      : {ok: true, arrayBuffer: async () => Uint8Array.from(payload).buffer};
  };
  const digest = async bytes => crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const written = {files: {}};
  const fs = {analyzePath: () => ({exists: false}), mkdir: p => {written.directory = p;},
    writeFile: (p, b) => {written.files[p] = Buffer.from(b);}};
  const result = await load(fs, "content/manifest.json", fetcher, digest);
  assert.equal(result.bytes, 8);
  assert.deepEqual(written.files["/game/SCOUT.SHP"], payload);
  assert.deepEqual(written.files["/game/SCOUT.PAL"], payload);
  assert.deepEqual(urls, ["content/manifest.json", "content/files/units/SCOUT.SHP", "content/files/palettes/SCOUT.PAL"]);
  manifest.assets[1].sha256 = "0".repeat(64);
  await assert.rejects(load(fs, "content/manifest.json", fetcher, digest), /integrity/);
  assert.deepEqual(written.files["/game/SCOUT.PAL"], payload);
  console.log("PASS: original content URL, manifest integrity and MEMFS staging");
}
main().catch(err => {console.error(err); process.exitCode = 1;});
