#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {load} = require("./original-asset");

async function main() {
  const payload = Buffer.from([1, 2, 3, 4]);
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  const manifest = {schemaVersion: 1, assets: [{id: "unit.placeholder-scout",
    target: "units/SCOUT.SHP", bytes: payload.length, sha256}]};
  const urls = [];
  const fetcher = async url => {
    urls.push(url);
    return url.endsWith("manifest.json")
      ? {ok: true, json: async () => manifest}
      : {ok: true, arrayBuffer: async () => Uint8Array.from(payload).buffer};
  };
  const digest = async bytes => crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const written = {};
  const fs = {analyzePath: () => ({exists: false}), mkdir: p => {written.directory = p;},
    writeFile: (p, b) => {written.path = p; written.data = Buffer.from(b);}};
  const result = await load(fs, "content/manifest.json", fetcher, digest);
  assert.equal(result.bytes, 4);
  assert.equal(written.path, "/game/SCOUT.SHP");
  assert.deepEqual(written.data, payload);
  assert.deepEqual(urls, ["content/manifest.json", "content/files/units/SCOUT.SHP"]);
  manifest.assets[0].sha256 = "0".repeat(64);
  await assert.rejects(load(fs, "content/manifest.json", fetcher, digest), /integrity/);
  assert.equal(written.data.toString("hex"), payload.toString("hex"));
  console.log("PASS: original content URL, manifest integrity and MEMFS staging");
}
main().catch(err => {console.error(err); process.exitCode = 1;});
