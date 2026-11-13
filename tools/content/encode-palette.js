#!/usr/bin/env node
"use strict";
const fs = require("node:fs");

// Palette source: up to 256 explicit #RRGGBB entries; unspecified colors black.
// The engine's .PAL files store 6-bit R/G/B components, 256 * 3 bytes.
function encodePalette(input) {
  if (!input || !Array.isArray(input.colors) || input.colors.length < 1 || input.colors.length > 256) {
    throw new Error("Palette must contain 1..256 RGB colors");
  }
  const out = Buffer.alloc(768);
  for (const [index, color] of input.colors.entries()) {
    if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`Invalid palette color ${index}`);
    }
    for (let c = 0; c < 3; c++) {
      out[index * 3 + c] = Math.round(parseInt(color.slice(1 + c * 2, 3 + c * 2), 16) * 63 / 255);
    }
  }
  if (input.colors[0].toUpperCase() !== "#000000") {
    throw new Error("Palette index 0 must be black (transparent)");
  }
  return out;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node tools/content/encode-palette.js <colors.json> <new-file.pal>");
    fs.writeFileSync(process.argv[3], encodePalette(JSON.parse(fs.readFileSync(process.argv[2], "utf8"))), {flag: "wx"});
  } catch (err) {console.error(err.message); process.exitCode = 1;}
}
module.exports = {encodePalette};
