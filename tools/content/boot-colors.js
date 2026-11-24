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
    // Title art fill (TITLE.CPS, HTITLE.PCX). Not index 5: the engine uses
    // 5 as YELLOW (common/wwstd.h) in its text colour tables.
    139:[24,57,75],
    // Main shades of the end-of-match score text palettes (score.cpp
    // _yellowpal, _bluepal, _orangepal, _greenpal, _graypal; entry 1), and
    // the cycling "click to continue" yellows (_cycleyellowpal, rotated
    // over 233-237 by Cycle_Wait_Click). No art uses these indices.
    5:[252,212,72],
    2:[110,176,255],
    209:[255,160,64],
    16:[120,220,120],
    202:[200,200,210],
    // Gradient-font shades at entry 14 that were too dark to read: dialog
    // gradient row 1 (25) and the blue score row (9).
    25:[120,200,90],
    9:[110,176,255],
    233:[230,186,52],234:[252,212,72],235:[255,236,140],236:[255,224,104],237:[240,200,64],
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
  // UI-E: dialog-dedicated entries restyled to the blacksite palette:
  // 139 title / PREPICK fill, 141 dialog background (CC_GREEN_BKGD,
  // defines.h:2882), 159 dialog highlight (CC_LIGHT_GREEN, defines.h:2884),
  // and the fixed GREY (13) and LTGREY (14) used by gold-style dialog edges
  // (dialog.cpp:113-126) as cool steel. 140 stays: wireframe art uses it.
  Object.assign(colors,{139:[14,24,32],141:[26,30,36],159:[63,198,213],13:[75,85,97],14:[166,176,187]});
  // Command-interface ramps (UI-B), allocated in tools/content/ui/palette.json.
  // These indices are outside the remap band, the cycling ranges and the
  // engine text colours above; pack.js keeps wireframe art off them.
  for(const {index,rgb} of Object.values(require("./ui/palette.json").colors))
    colors[index]=[1,3,5].map(i=>parseInt(rgb.slice(i,i+2),16));
  return colors;
}
function toHex(rgb) {
  return "#"+rgb.map(n=>n.toString(16).padStart(2,"0")).join("").toUpperCase();
}
// Palette indices of the terrain colours above (theater.js, placeholders.js).
const TERRAIN={grass:112,grassEdge:113,water:114,waterEdge:115};
const TITLE_BACKGROUND=139;
module.exports={TITLE_BACKGROUND,rgbPalette,toHex,TERRAIN};
