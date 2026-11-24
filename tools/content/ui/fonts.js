"use strict";
// UI-C: original bitmap typeface for every engine font slot. A squared,
// slightly condensed sans: 7-row capitals, small-cap lowercase (5 rows on the
// cap baseline, so no descenders and no new line height), and tabular
// 5-column digits for telemetry. Each glyph's advance includes one blank
// spacing column, so text stays legible when the engine prints with
// FontXSpacing = -1 (sidebar.cpp:322-324). Encoded for common/font.cpp.
// Rows are drawn top to bottom; "#" is ink, anything else is blank.
const CAPS={
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
  Q:[".##.","#..#","#..#","#..#","#..#","#.#.",".#.#"],
  R:["###.","#..#","#..#","###.","#.#.","#..#","#..#"],
  S:[".###","#...","#...",".##.","...#","...#","###."],
  T:["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
  U:["#..#","#..#","#..#","#..#","#..#","#..#",".##."],
  V:["#...#","#...#","#...#",".#.#.",".#.#.",".#.#.","..#.."],
  W:["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
  X:["#...#",".#.#.",".#.#.","..#..",".#.#.",".#.#.","#...#"],
  Y:["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],
  Z:["####","...#","..#.",".#..","#...","#...","####"]
};
const DIGITS={
  "0":[".###.","#...#","#..##","#.#.#","##..#","#...#",".###."],
  "1":["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
  "2":[".###.","#...#","....#","...#.","..#..",".#...","#####"],
  "3":["####.","....#","....#",".###.","....#","....#","####."],
  "4":["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."],
  "5":["#####","#....","####.","....#","....#","#...#",".###."],
  "6":[".###.","#....","#....","####.","#...#","#...#",".###."],
  "7":["#####","....#","...#.","..#..",".#...",".#...",".#..."],
  "8":[".###.","#...#","#...#",".###.","#...#","#...#",".###."],
  "9":[".###.","#...#","#...#",".####","....#","....#",".###."]
};
const PUNCT={
  " ":["..","..","..","..","..","..",".."],
  ".":[".",".",".",".",".",".","#"],
  ",":["..","..","..","..","..",".#","#."],
  ":":[".",".","#",".",".","#","."],
  ";":["..","..",".#","..","..",".#","#."],
  "!":["#","#","#","#","#",".","#"],
  "?":[".##.","#..#","...#","..#.",".#..","....",".#.."],
  "'":["#","#",".",".",".",".","."],
  "\"":["#.#","#.#","...","...","...","...","..."],
  "-":["...","...","...","###","...","...","..."],
  "+":["...","...",".#.","###",".#.","...","..."],
  "=":["...","...","###","...","###","...","..."],
  "/":["...#","...#","..#.",".#..","#...","#...","#..."],
  "\\":["#...","#...",".#..","..#.","...#","...#","...#"],
  "(":[".#","#.","#.","#.","#.","#.",".#"],
  ")":["#.",".#",".#",".#",".#",".#","#."],
  "[":["##","#.","#.","#.","#.","#.","##"],
  "]":["##",".#",".#",".#",".#",".#","##"],
  "<":["...","..#",".#.","#..",".#.","..#","..."],
  ">":["...","#..",".#.","..#",".#.","#..","..."],
  "%":["#...#","#..#.","...#.","..#..",".#...",".#..#","#...#"],
  "&":[".##..","#..#.","#.#..",".#...","#.#.#","#..#.",".##.#"],
  "#":[".#.#.","#####",".#.#.",".#.#.",".#.#.","#####",".#.#."],
  "$":["..#..",".####","#.#..",".###.","..#.#","####.","..#.."],
  "*":[".....","#.#.#",".###.","#####",".###.","#.#.#","....."],
  "_":["....","....","....","....","....","....","####"],
  "@":[".###.","#...#","#.###","#.#.#","#.###","#....",".####"],
  "^":[".#.","#.#","...","...","...","...","..."],
  "`":["#.",".#","..","..","..","..",".."],
  "{":["..#",".#.",".#.","#..",".#.",".#.","..#"],
  "}":["#..",".#.",".#.","..#",".#.",".#.","#.."],
  "|":["#","#","#","#","#","#","#"],
  "~":[".....",".....",".#...","#.#.#","...#.",".....","....."]
};
// Small caps: the capital drawn in 5 rows on the same baseline.
const SMALL={
  a:[".##.","#..#","####","#..#","#..#"],b:["###.","#..#","###.","#..#","###."],
  c:[".###","#...","#...","#...",".###"],d:["###.","#..#","#..#","#..#","###."],
  e:["####","#...","###.","#...","####"],f:["####","#...","###.","#...","#..."],
  g:[".###","#...","#.##","#..#",".###"],h:["#..#","#..#","####","#..#","#..#"],
  i:["###",".#.",".#.",".#.","###"],j:["..##","...#","...#","#..#",".##."],
  k:["#..#","#.#.","##..","#.#.","#..#"],l:["#...","#...","#...","#...","####"],
  m:["#...#","##.##","#.#.#","#...#","#...#"],n:["#..#","##.#","#.##","#..#","#..#"],
  o:[".##.","#..#","#..#","#..#",".##."],p:["###.","#..#","###.","#...","#..."],
  q:[".##.","#..#","#..#","#.#.",".#.#"],r:["###.","#..#","###.","#.#.","#..#"],
  s:[".###","#...",".##.","...#","###."],t:["#####","..#..","..#..","..#..","..#.."],
  u:["#..#","#..#","#..#","#..#",".##."],v:["#...#","#...#",".#.#.",".#.#.","..#.."],
  w:["#...#","#...#","#.#.#","##.##","#...#"],x:["#...#",".#.#.","..#..",".#.#.","#...#"],
  y:["#...#",".#.#.","..#..","..#..","..#.."],z:["####","..#.",".#..","#...","####"]
};
const HEIGHT=7;
// Character code -> {rows (7 strings), width (ink columns)}.
function glyphs(){
  const map=new Map();
  const add=(ch,rows)=>{
    const w=Math.max(...rows.map(r=>r.length));
    const full=rows.length<HEIGHT?[...Array(HEIGHT-rows.length).fill(".".repeat(w)),...rows]:rows;
    if(full.length!==HEIGHT||full.some(r=>r.length!==w))throw Error("Bad glyph "+JSON.stringify(ch));
    map.set(ch.charCodeAt(0),{rows:full,width:w});
  };
  for(const set of [CAPS,DIGITS,PUNCT,SMALL])for(const [ch,rows] of Object.entries(set))add(ch,rows);
  return map;
}
// Bold variant: each ink pixel also inks the pixel to its right.
function embolden(g){
  const width=g.width+1;
  return {width,rows:g.rows.map(r=>{
    let out="";for(let x=0;x<width;x++)out+=(r[x]==="#"||r[x-1]==="#")?"#":".";return out;
  })};
}
// font.cpp header (FontHeader): size, compress 0, data-blocks 5, info block
// at 16, offset/width/data/height block offsets, then max height and width.
function encode({ink=1,bold=false}={}){
  if(!Number.isInteger(ink)||ink<1||ink>15)throw Error("Font ink must be 1..15");
  const base=glyphs();
  const fallback=base.get("?".charCodeAt(0));
  const list=Array.from({length:256},(_,c)=>{
    let g=base.get(c);
    if(!g&&c>=32&&c<127)throw Error("Missing printable glyph "+c);
    if(!g)g=c<32?{rows:Array(HEIGHT).fill(""),width:0}:fallback;
    if(bold&&g.width)g=embolden(g);
    return {rows:g.rows,advance:g.width?g.width+1:0};
  });
  // Control characters keep a 1-column blank advance (never drawn).
  list.forEach(g=>{if(!g.advance)g.advance=1;});
  const maxW=Math.max(...list.map(g=>g.advance));
  const offsetBlock=20,widthBlock=offsetBlock+512,heightBlock=widthBlock+256,dataBlock=heightBlock+512;
  const datas=list.map(g=>{
    const bytesPerRow=Math.ceil(g.advance/2),b=Buffer.alloc(bytesPerRow*HEIGHT);
    g.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==="#")b[y*bytesPerRow+(x>>1)]|=ink<<(x%2?4:0);});
    return b;
  });
  const out=Buffer.alloc(dataBlock+datas.reduce((s,b)=>s+b.length,0));
  out.writeUInt16LE(out.length,0);out[2]=0;out[3]=5;
  out.writeUInt16LE(16,4);out.writeUInt16LE(offsetBlock,6);out.writeUInt16LE(widthBlock,8);
  out.writeUInt16LE(dataBlock,10);out.writeUInt16LE(heightBlock,12);out.writeUInt16LE(0x1012,14);
  out[17]=255;out[18]=HEIGHT;out[19]=maxW;
  if(out.length>0xFFFF)throw Error("Font exceeds 16-bit size");
  let at=dataBlock;
  list.forEach((g,c)=>{
    out.writeUInt16LE(at,offsetBlock+c*2);
    out[widthBlock+c]=g.advance;
    out.writeUInt16LE(HEIGHT<<8,heightBlock+c*2);   // 0 blank rows on top, 7 data rows
    datas[c].copy(out,at);at+=datas[c].length;
  });
  return out;
}
// Decode one glyph back to rows (tests and previews).
function decodeGlyph(blob,code){
  const offsets=blob.readUInt16LE(6),widths=blob.readUInt16LE(8),heights=blob.readUInt16LE(12);
  const w=blob[widths+code],h=blob.readUInt16LE(heights+code*2)>>8,top=blob[heights+code*2];
  const off=blob.readUInt16LE(offsets+code*2),bpr=Math.ceil(w/2),rows=[];
  for(let y=0;y<top;y++)rows.push(".".repeat(w));
  for(let y=0;y<h;y++){let r="";for(let x=0;x<w;x++){const b=blob[off+y*bpr+(x>>1)];r+=((x%2?b>>4:b)&15)?"#":".";}rows.push(r);}
  return {width:w,rows};
}
// Engine font slots and their style. Gradient fonts keep the ink index the
// engine's colour tables expect (boot-pack.js FONT_INK).
const SLOTS={
  "3POINT.FNT":{},"6POINT.FNT":{},"8POINT.FNT":{},"LED.FNT":{bold:true},"VCR.FNT":{},
  "GRAD6FNT.FNT":{},"8FAT.FNT":{bold:true},"12GREEN.FNT":{bold:true},"12GRNGRD.FNT":{bold:true},"SCOREFNT.FNT":{bold:true}
};
function font(name,ink){
  const s=SLOTS[name.toUpperCase()];
  if(!s)throw Error("Unknown font slot "+name);
  return encode({ink,bold:!!s.bold});
}
module.exports={encode,font,glyphs,decodeGlyph,SLOTS,HEIGHT};
