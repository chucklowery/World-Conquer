#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const {build, readManifest, safeRelative} = require("./build");
const {encodeShape, decodeShape, encodeTacticalShape, decodeTacticalShape} = require("./encode-shape");
const {encodePalette} = require("./encode-palette");

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
  const pixels = [0, 0, 5, 7, 0, 0, 0, 2];
  const frames = {frames: [{width: 4, height: 2, pixels}, {width: 2, height: 2, pixels: [1, 0, 2, 3]}]};
  const shape = encodeShape(frames);
  assert.deepEqual(decodeShape(shape), frames);
  assert.equal(shape.readUInt16LE(0), 2);
  assert.equal(shape.readUInt32LE(2), 8); // frame offsets are relative to byte 2
  assert.throws(() => encodeShape({frames: [{width: 2, height: 2, pixels: [1, 2]}]}), /Invalid indexed/);
  assert.throws(() => decodeShape(shape.subarray(0, 5)), /Invalid shape block/);
  const longZeros = {frames: [{width: 20, height: 20, pixels: Array(400).fill(0)}]};
  assert.deepEqual(decodeShape(encodeShape(longZeros)), longZeros);
  const tacticalFrames = {frames: [{width: 2, height: 2, pixels: [1, 0, 2, 3]},
    {width: 2, height: 2, pixels: [0, 0, 4, 5]}]};
  assert.deepEqual(decodeTacticalShape(encodeTacticalShape(tacticalFrames)), tacticalFrames);
  const tactical = encodeTacticalShape(longZeros);
  assert.deepEqual(decodeTacticalShape(tactical), longZeros);
  assert.equal(tactical.readUInt16LE(6), 20);
  assert.equal(tactical.readUInt32LE(14) >>> 24, 0x80);
  assert.throws(() => encodeTacticalShape({frames: [{width: 4, height: 4, pixels: Array(16).fill(2)},
    {width: 8, height: 2, pixels: Array(16).fill(2)}]}), /identical dimensions/);
  const palette = encodePalette({colors: ["#000000", "#ffffff", "#ff0000"]});
  assert.equal(palette.length, 768);
  assert.deepEqual([...palette.subarray(0, 9)], [0, 0, 0, 63, 63, 63, 63, 0, 0]);
  assert.throws(() => encodePalette({colors: ["#ffffff"]}), /transparent/);
  console.log("PASS: deterministic packaging, provenance, hashes, duplicate and path validation");
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
