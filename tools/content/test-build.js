#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {build, readManifest, safeRelative} = require("./build");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "world-conquer-content-"));
try {
  const source = path.join(temp, "source");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "sample.txt"), "original content\n");
  const manifestPath = path.join(source, "manifest.json");
  const asset = {id: "unit.scout", type: "sprite", source: "sample.txt", target: "units/scout.txt",
    creator: "Test author", license: "CC0-1.0"};
  const manifest = {schemaVersion: 1, gameId: "world-conquer", assets: [asset]};
  const write = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  write();
  const first = build(manifestPath, path.join(temp, "out1"));
  const second = build(manifestPath, path.join(temp, "out2"));
  assert.deepEqual(first, second);
  assert.equal(first.assets[0].sha256,
    crypto.createHash("sha256").update("original content\n").digest("hex"));
  assert.equal(fs.readFileSync(path.join(temp, "out1/files/units/scout.txt"), "utf8"), "original content\n");
  assert.equal(fs.readFileSync(path.join(temp, "out1/manifest.json"), "utf8"),
    fs.readFileSync(path.join(temp, "out2/manifest.json"), "utf8"));
  assert.throws(() => build(manifestPath, path.join(temp, "out1")), /already exists/);
  for (const bad of ["../escape", "/absolute", "a//b", "a\\b", "a/./b"]) {
    assert.throws(() => safeRelative(bad, "test"), /Invalid/);
  }
  manifest.assets.push({...asset, id: "unit.scout2", target: "UNITS/SCOUT.TXT"});
  write();
  assert.throws(() => build(manifestPath, path.join(temp, "duplicate")), /Duplicate target/);
  manifest.assets.pop();
  manifest.assets[0].sha256 = "0".repeat(64);
  write();
  assert.throws(() => build(manifestPath, path.join(temp, "wrong-hash")), /SHA-256 mismatch/);
  manifest.assets[0].sha256 = undefined;
  manifest.assets[0].license = "";
  write();
  assert.throws(() => readManifest(manifestPath), /provenance/);
  console.log("PASS: deterministic packaging, provenance, hashes, duplicate and path validation");
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
