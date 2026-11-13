#!/usr/bin/env node
"use strict";

// Deterministic, dependency-free browser content builder. This packages files;
// it does not convert art into the legacy engine's SHP/MIX/INI formats.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {encodeShape} = require("./encode-shape");

const TYPES = new Set(["sprite", "terrain", "ui", "audio", "music", "map", "rules", "other"]);
const ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SHA = /^[a-f0-9]{64}$/;

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || value.includes("\\") ||
      path.posix.isAbsolute(value) || value.split("/").some(s => !s || s === "." || s === "..") ||
      !/^[a-zA-Z0-9_./-]+$/.test(value)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }
  return value;
}

function readManifest(filename) {
  const manifest = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error("Expected schemaVersion 1 and an assets array");
  }
  if (typeof manifest.gameId !== "string" || !ID.test(manifest.gameId)) {
    throw new Error("Invalid gameId");
  }
  const seen = new Set();
  for (const entry of manifest.assets) {
    if (!entry || typeof entry.id !== "string" || !ID.test(entry.id) || seen.has(entry.id)) {
      throw new Error(`Duplicate or invalid asset ID: ${entry && entry.id}`);
    }
    seen.add(entry.id);
    if (!TYPES.has(entry.type)) throw new Error(`Unknown asset type for ${entry.id}`);
    if (entry.transform !== undefined && entry.transform !== "indexed-shape") {
      throw new Error(`Unknown asset transform for ${entry.id}`);
    }
    safeRelative(entry.source, `source for ${entry.id}`);
    safeRelative(entry.target, `target for ${entry.id}`);
    if (typeof entry.license !== "string" || !entry.license.trim() ||
        typeof entry.creator !== "string" || !entry.creator.trim()) {
      throw new Error(`Missing creator/license provenance for ${entry.id}`);
    }
  }
  return manifest;
}

function build(manifestFile, outputDir) {
  const manifestPath = path.resolve(manifestFile);
  const sourceRoot = path.dirname(manifestPath);
  const out = path.resolve(outputDir);
  if (out === sourceRoot || sourceRoot.startsWith(out + path.sep) || out.startsWith(sourceRoot + path.sep)) {
    throw new Error("Output must be outside the manifest/source directory");
  }
  const manifest = readManifest(manifestPath);
  const targets = new Set();
  const files = [];
  for (const asset of [...manifest.assets].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    if (targets.has(asset.target.toLowerCase())) throw new Error(`Duplicate target: ${asset.target}`);
    targets.add(asset.target.toLowerCase());
    const source = path.resolve(sourceRoot, asset.source);
    const real = fs.realpathSync(source);
    if (!real.startsWith(sourceRoot + path.sep) || !fs.statSync(real).isFile()) {
      throw new Error(`Asset source escapes manifest directory: ${asset.source}`);
    }
    const sourceBytes = fs.readFileSync(real);
    if (!sourceBytes.length) throw new Error(`Empty asset: ${asset.id}`);
    const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
    if (asset.sha256 !== undefined && (!SHA.test(asset.sha256) || asset.sha256 !== sourceSha256)) {
      throw new Error(`SHA-256 mismatch for ${asset.id}`);
    }
    const bytes = asset.transform === "indexed-shape"
      ? encodeShape(JSON.parse(sourceBytes.toString("utf8"))) : sourceBytes;
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    files.push({id: asset.id, type: asset.type, target: asset.target,
      creator: asset.creator, license: asset.license, transform: asset.transform || "copy",
      sourceSha256, bytes: bytes.length, sha256, data: bytes});
  }
  // Validate everything before creating output. Copy to a fresh directory only:
  // never silently overwrite a release or leave stale assets behind.
  if (fs.existsSync(out)) throw new Error(`Output already exists: ${out}`);
  fs.mkdirSync(out, {recursive: true});
  for (const item of files) {
    const dest = path.join(out, "files", item.target);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.writeFileSync(dest, item.data, {flag: "wx"});
  }
  const index = {schemaVersion: 1, gameId: manifest.gameId,
    assets: files.map(({data, ...item}) => item)};
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(index, null, 2) + "\n", {flag: "wx"});
  return index;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node tools/content/build.js <source-manifest.json> <new-output-directory>");
    const index = build(process.argv[2], process.argv[3]);
    console.log(`Packaged ${index.assets.length} assets for ${index.gameId}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
module.exports = {build, readManifest, safeRelative};
