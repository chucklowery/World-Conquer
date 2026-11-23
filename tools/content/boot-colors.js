"use strict";
// The RGB values are original, generated numeric placeholders. Index values
// used by stock dialogs are chosen for readable text and strong contrast.
function rgbPalette() {
  const colors=Array.from({length:256},(_,i)=>[
    Math.min(255,(i&7)*34+10),
    Math.min(255,((i>>3)&7)*31+10),
    Math.min(255,((i>>6)&3)*73+24)
  ]);
  const overrides={
    0:[0,0,0],       // transparent pixels
    1:[246,248,240], // light bitmap glyphs
    3:[232,246,226],
    5:[24,57,75],   // original flat-color title background
    15:[250,253,247],
    41:[147,240,192],
    42:[94,204,153],
    43:[55,158,130],
    // Fixed engine colors (common/wwstd.h ColorType): the shroud and many
    // UI fills use BLACK (12); GREY (13) and LTGREY (14) draw UI detail.
    12:[0,0,0],
    13:[128,128,128],
    14:[192,192,192],
    // Terrain. Indices 32-38 cycle (defines.h CYCLE_COLOR_START/COUNT), so
    // static ground must use entries outside that range.
    112:[72,128,44],  // grass
    113:[56,104,36],  // grass edge
    114:[44,92,168],  // water
    115:[32,68,136],  // water edge
    140:[8,33,42],  // dialog shadow
    141:[32,76,88], // dialog background
    159:[62,177,145],
    167:[188,250,215]
  };
  for(const [key,value] of Object.entries(overrides))colors[Number(key)]=value;
  return colors;
}
function toHex(rgb) {
  return "#"+rgb.map(n=>n.toString(16).padStart(2,"0")).join("").toUpperCase();
}
// Palette indices of the terrain colours above (theater.js, placeholders.js).
const TERRAIN={grass:112,grassEdge:113,water:114,waterEdge:115};
module.exports={rgbPalette,toHex,TERRAIN};
