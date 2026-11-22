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
module.exports={rgbPalette,toHex};
