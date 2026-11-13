#!/usr/bin/env node
"use strict";

// Experimental VanillaTD-style shape block writer for indexed-color frames.
// Implements 10-byte frame header and zero-run encoding observed in
// common/wwmouse.cpp. Actual tactical renderer integration is NOT validated.
const fs = require("node:fs");

function encodeRuns(pixels) {
  const out = [];
  for (let i = 0; i < pixels.length;) {
    if (pixels[i] === 0) {
      let run = 0;
      while (i < pixels.length && pixels[i] === 0 && run < 255) { i++; run++; }
      out.push(0, run);
    } else {
      out.push(pixels[i++]);
    }
  }
  return Buffer.from(out);
}

function encodeShape(input) {
  if (!input || !Array.isArray(input.frames) || !input.frames.length || input.frames.length > 65535) {
    throw new Error("frames must contain 1..65535 indexed images");
  }
  const pieces = [];
  let offset = 4 * input.frames.length;
  for (const [i, frame] of input.frames.entries()) {
    const {width, height, pixels} = frame;
    if (!Number.isInteger(width) || width < 1 || width > 65535 ||
        !Number.isInteger(height) || height < 1 || height > 255 ||
        !Array.isArray(pixels) || pixels.length !== width * height ||
        !pixels.every(p => Number.isInteger(p) && p >= 0 && p <= 255)) {
      throw new Error(`Invalid indexed frame ${i}`);
    }
    // A 16-bit length field limits each independently decoded frame.
    if (pixels.length > 65535) throw new Error(`Frame ${i} exceeds 65535 pixels`);
    const encoded = encodeRuns(pixels);
    if (encoded.length + 10 > 65535) throw new Error(`Frame ${i} exceeds 65535 encoded bytes`);
    const header = Buffer.alloc(10);
    header.writeUInt16LE(2, 0); // bit 1 = uncompressed (no LCW stage)
    header.writeUInt8(height, 2);
    header.writeUInt16LE(width, 3);
    header.writeUInt8(height, 5);
    header.writeUInt16LE(10 + encoded.length, 6);
    header.writeUInt16LE(pixels.length, 8);
    pieces.push({offset, payload: Buffer.concat([header, encoded])});
    offset += header.length + encoded.length;
  }
  const table = Buffer.alloc(2 + input.frames.length * 4);
  table.writeUInt16LE(input.frames.length, 0);
  for (const [i, part] of pieces.entries()) table.writeUInt32LE(part.offset, 2 + i * 4);
  return Buffer.concat([table, ...pieces.map(part => part.payload)]);
}

function decodeShape(block) {
  if (!Buffer.isBuffer(block) || block.length < 6) throw new Error("Invalid shape block");
  const count = block.readUInt16LE(0);
  if (!count || 2 + count * 4 > block.length) throw new Error("Invalid frame table");
  const frames = [];
  for (let i = 0; i < count; i++) {
    const start = 2 + block.readUInt32LE(2 + i * 4);
    if (start + 10 > block.length) throw new Error("Truncated frame");
    const flags = block.readUInt16LE(start);
    const height = block.readUInt8(start + 2);
    const width = block.readUInt16LE(start + 3);
    const size = block.readUInt16LE(start + 6);
    const length = block.readUInt16LE(start + 8);
    if (flags !== 2 || !width || !height || width * height !== length ||
        size < 10 || start + size > block.length) throw new Error("Unsupported or malformed frame");
    const pixels = [];
    for (let p = start + 10; p < start + size;) {
      const value = block[p++];
      if (value) pixels.push(value);
      else {
        if (p >= start + size) throw new Error("Truncated zero-run");
        const run = block[p++];
        if (!run) throw new Error("Invalid zero-run");
        for (let k = 0; k < run; k++) pixels.push(0);
      }
      if (pixels.length > length) throw new Error("Decoded frame overrun");
    }
    if (pixels.length !== length) throw new Error("Incomplete frame");
    frames.push({width, height, pixels});
  }
  return {frames};
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node tools/content/encode-shape.js <indexed-frames.json> <new-file.shp>");
    fs.writeFileSync(process.argv[3], encodeShape(JSON.parse(fs.readFileSync(process.argv[2], "utf8"))), {flag: "wx"});
    console.log(`Created indexed shape block: ${process.argv[3]}`);
  } catch (err) {console.error(err.message); process.exitCode = 1;}
}
module.exports = {encodeShape, decodeShape};
