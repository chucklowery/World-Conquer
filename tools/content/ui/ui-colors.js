"use strict";
// Named palette indices for the command interface, allocated from
// palette.json (UI-B). Index 0 is transparent in shapes; 12 is engine BLACK.
const p=require("./palette.json");
const UI=Object.fromEntries(Object.entries(p.colors).map(([k,v])=>[k,v.index]));
UI.clear=0;
UI.black=12;
// Every allocated index, for collision checks and translation protection.
UI.reserved=Object.freeze(Object.values(p.colors).map(c=>c.index).sort((a,b)=>a-b));
UI.rgb=Object.freeze(Object.fromEntries(Object.values(p.colors).map(c=>[c.index,c.rgb])));
module.exports=Object.freeze(UI);
