"use strict";
// M5 menu and in-game font (original, CC0): a proportional sans with upper
// and lower case, digits and punctuation, drawn on a 9-row grid (cap height
// 7, descenders 2). Replaces the M2 5x7 capitals-only face.
//
// The engine's font format and colour rules (common/font.cpp FontHeader;
// tiberiandawn/dialog.cpp Simple_Text_Print):
//   pixel 1        the text colour (fontpalette[1])
//   pixel 2        drop shadow, drawn for TPF_DROPSHADOW and TPF_FULLSHADOW
//   pixel 3        outline, drawn for TPF_FULLSHADOW
//   pixels 11-15   gradient fonts (GRAD6FNT, 12GRNGRD): the _textfontpal row
//                  for the text colour, brightest at 15
// Each glyph therefore carries its own shadow column and row, and its width
// includes them: the engine subtracts one pixel of spacing per shadow style
// (dialog.cpp:474-545).

// '#' is ink. Rows 0-6 are the cap height, 7-8 descenders.
const G={
 A:[".##.","#..#","#..#","####","#..#","#..#","#..#"],
 B:["###.","#..#","#..#","###.","#..#","#..#","###."],
 C:[".###","#...","#...","#...","#...","#...",".###"],
 D:["###.","#..#","#..#","#..#","#..#","#..#","###."],
 E:["####","#...","#...","###.","#...","#...","####"],
 F:["####","#...","#...","###.","#...","#...","#..."],
 G:[".###","#...","#...","#.##","#..#","#..#",".###"],
 H:["#..#","#..#","#..#","####","#..#","#..#","#..#"],
 I:["###",".#.",".#.",".#.",".#.",".#.","###"],
 J:["..##","...#","...#","...#","...#","#..#",".##."],
 K:["#..#","#.#.","##..","#...","##..","#.#.","#..#"],
 L:["#...","#...","#...","#...","#...","#...","####"],
 M:["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],
 N:["#..#","##.#","##.#","#.##","#.##","#..#","#..#"],
 O:[".##.","#..#","#..#","#..#","#..#","#..#",".##."],
 P:["###.","#..#","#..#","###.","#...","#...","#..."],
 Q:[".##.","#..#","#..#","#..#","#..#","#.##",".###"],
 R:["###.","#..#","#..#","###.","#.#.","#..#","#..#"],
 S:[".###","#...","#...",".##.","...#","...#","###."],
 T:["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
 U:["#..#","#..#","#..#","#..#","#..#","#..#",".##."],
 V:["#...#","#...#","#...#",".#.#.",".#.#.",".#.#.","..#.."],
 W:["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
 X:["#..#","#..#",".##.",".##.",".##.","#..#","#..#"],
 Y:["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],
 Z:["####","...#","..#.",".#..","#...","#...","####"],
 a:["....","....",".##.","...#",".###","#..#",".###"],
 b:["#...","#...","###.","#..#","#..#","#..#","###."],
 c:["...","...",".##","#..","#..","#..",".##"],
 d:["...#","...#",".###","#..#","#..#","#..#",".###"],
 e:["....","....",".##.","#..#","####","#...",".###"],
 f:[".##","#..","##.","#..","#..","#..","#.."],
 g:["....","....",".###","#..#","#..#","#..#",".###","...#",".##."],
 h:["#...","#...","###.","#..#","#..#","#..#","#..#"],
 i:["#",".","#","#","#","#","#"],
 j:[".#","..",".#",".#",".#",".#",".#",".#","#."],
 k:["#...","#...","#..#","#.#.","##..","#.#.","#..#"],
 l:["#","#","#","#","#","#","#"],
 m:[".....",".....","####.","#.#.#","#.#.#","#.#.#","#.#.#"],
 n:["....","....","###.","#..#","#..#","#..#","#..#"],
 o:["....","....",".##.","#..#","#..#","#..#",".##."],
 p:["....","....","###.","#..#","#..#","#..#","###.","#...","#..."],
 q:["....","....",".###","#..#","#..#","#..#",".###","...#","...#"],
 r:["...","...","#.#","##.","#..","#..","#.."],
 s:["....","....",".###","#...",".##.","...#","###."],
 t:["#..","#..","##.","#..","#..","#..",".##"],
 u:["....","....","#..#","#..#","#..#","#..#",".###"],
 v:[".....",".....","#...#","#...#",".#.#.",".#.#.","..#.."],
 w:[".....",".....","#...#","#...#","#.#.#","#.#.#",".#.#."],
 x:["....","....","#..#","#..#",".##.","#..#","#..#"],
 y:["....","....","#..#","#..#","#..#","#..#",".###","...#",".##."],
 z:["....","....","####","..#.",".#..","#...","####"],
 "0":[".##.","#..#","#.##","#..#","##.#","#..#",".##."],
 "1":[".#.","##.",".#.",".#.",".#.",".#.","###"],
 "2":[".##.","#..#","...#","..#.",".#..","#...","####"],
 "3":["###.","...#","...#",".##.","...#","...#","###."],
 "4":["..#.",".##.","#.#.","#.#.","####","..#.","..#."],
 "5":["####","#...","###.","...#","...#","#..#",".##."],
 "6":[".##.","#...","#...","###.","#..#","#..#",".##."],
 "7":["####","...#","..#.","..#.",".#..",".#..",".#.."],
 "8":[".##.","#..#","#..#",".##.","#..#","#..#",".##."],
 "9":[".##.","#..#","#..#",".###","...#","...#",".##."],
 " ":["..","..","..","..","..","..",".."],
 ".":[".",".",".",".",".",".","#"],
 ",":["..","..","..","..","..",".#",".#","#."],
 ":":[".",".","#",".",".",".","#"],
 ";":["..","..",".#","..","..",".#",".#","#."],
 "!":["#","#","#","#","#",".","#"],
 "?":[".##.","#..#","...#","..#.",".#..","....",".#.."],
 "'":["#","#",".",".",".",".","."],
 '"':["#.#","#.#","...","...","...","...","..."],
 "-":["...","...","...","###","...","...","..."],
 "+":["...","...",".#.","###",".#.","...","..."],
 "=":["...","...","###","...","###","...","..."],
 "/":["...#","...#","..#.",".#..",".#..","#...","#..."],
 "\\":["#...","#...",".#..","..#.","..#.","...#","...#"],
 "(":[".#","#.","#.","#.","#.","#.",".#"],
 ")":["#.",".#",".#",".#",".#",".#","#."],
 "[":["##","#.","#.","#.","#.","#.","##"],
 "]":["##",".#",".#",".#",".#",".#","##"],
 "%":["#...#","#..#.","...#.","..#..",".#...",".#..#","#...#"],
 "&":[".#..","#.#.","#.#.",".#..","#.##","#..#",".##."],
 "#":[".#.#.","#####",".#.#.",".#.#.",".#.#.","#####",".#.#."],
 "$":["..#..",".####","#.#..",".###.","..#.#","####.","..#.."],
 "*":["...",".#.","###",".#.","#.#","...","..."],
 "<":["...#","..#.",".#..","#...",".#..","..#.","...#"],
 ">":["#...",".#..","..#.","...#","..#.",".#..","#..."],
 "_":["....","....","....","....","....","....","....","####"],
 "@":[".###.","#...#","#.###","#.#.#","#.###","#....",".###."],
};
// Check-list mark: a checked item starts with character 3 and an unchecked
// one with a space (tiberiandawn/cheklist.h:99-100), so 3 is a ticked box.
G["\x03"]=["######","#....#","#...##","##.#.#","#.#..#","#....#","######"];

const ROWS=9;
// Glyph cells for one face: {w, h, px:[rows][cols] of nibble values}.
function glyph(rows,{bold=false,gradient=false,ink:inkValue=1}){
  let ink=rows.map(r=>[...r].map(c=>c==="#"));
  if(bold)ink=ink.map(r=>r.map((v,x)=>v||(x>0&&r[x-1])).concat([r[r.length-1]]));
  const iw=Math.max(...ink.map(r=>r.length));
  const W=iw+2,H=ROWS+1;
  const px=Array.from({length:H},()=>new Array(W).fill(0));
  const at=(x,y)=>y>=0&&y<ink.length&&x>=0&&x<(ink[y]||[]).length&&ink[y][x];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    // Gradient rows use the three brightest entries (15, 14, 13); 12 and 11
    // are house remap colours in the generated palette.
    if(at(x,y)){px[y][x]=gradient?(y<2?15:y<4?14:13):inkValue;continue;}
    if(at(x-1,y-1)){px[y][x]=2;continue;}
    let near=false;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(at(x+dx,y+dy))near=true;
    if(near)px[y][x]=3;
  }
  return {w:W,h:H,px};
}
// Encodes a 256-character font (common/font.cpp FontHeader; the layout of
// the M2 encoder, now with per-glyph widths).
function encodeFace({bold=false,gradient=false,ink=1}={}){
  const count=256;
  const glyphs=Array.from({length:count},(_,c)=>{
    const ch=String.fromCharCode(c);
    const rows=G[ch]||(c>=32&&c<127?G["?"]:G[" "]);
    return glyph(rows,{bold,gradient,ink});
  });
  const maxW=Math.max(...glyphs.map(g=>g.w)),maxH=ROWS+1;
  const offsetTable=20,widthBlock=offsetTable+count*2,heightBlock=widthBlock+count,dataBlock=heightBlock+count*2;
  const sizes=glyphs.map(g=>Math.ceil(g.w/2)*g.h);
  const total=dataBlock+sizes.reduce((a,b)=>a+b,0);
  const out=Buffer.alloc(total);
  out.writeUInt16LE(total,0);out[2]=0;out[3]=5;out.writeUInt16LE(16,4);
  out.writeUInt16LE(offsetTable,6);out.writeUInt16LE(widthBlock,8);out.writeUInt16LE(dataBlock,10);
  out.writeUInt16LE(heightBlock,12);out.writeUInt16LE(0x1012,14);
  out[17]=255;out[18]=maxH;out[19]=maxW;
  let off=dataBlock;
  glyphs.forEach((g,c)=>{
    out.writeUInt16LE(off,offsetTable+c*2);
    out[widthBlock+c]=g.w;
    out.writeUInt16LE(g.h<<8,heightBlock+c*2);
    const stride=Math.ceil(g.w/2);
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){
      const v=g.px[y][x];if(v)out[off+y*stride+(x>>1)]|=v<<((x&1)?4:0);
    }
    off+=stride*g.h;
  });
  return out;
}
// Font file -> face (boot-pack.js writes these).
const FACES={
  "3POINT.FNT":{},"6POINT.FNT":{},"8POINT.FNT":{},"LED.FNT":{},"VCR.FNT":{},
  "GRAD6FNT.FNT":{gradient:true},"8FAT.FNT":{bold:true},
  // TPF_GREEN12 fills only entries 4-15 with the text colour (dialog.cpp:
  // 400-430); the score screen's palettes use entry 14 (score.cpp).
  "12GREEN.FNT":{bold:true,gradient:true},"12GRNGRD.FNT":{bold:true,gradient:true},"SCOREFNT.FNT":{bold:true,ink:14},
};
module.exports={encodeFace,FACES,GLYPHS:G,ROWS};
