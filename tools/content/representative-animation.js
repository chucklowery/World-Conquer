"use strict";

// Original, palette-indexed diagnostics. These are deliberately schematic,
// not reconstructions of any commercial RTS sprites. Index zero is transparent.
const fs = require("node:fs");
const path = require("node:path");

const contractsPath = path.resolve(__dirname, "../../game/content/wireframes/representative-contracts.json");
let infantryStates;
function states() {
  if (!infantryStates) {
    const document = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
    infantryStates = document.assets.find(a => a.id === "WF-0185").stateRules;
  }
  return infantryStates;
}

function canvas(width, height) {
  const data = new Uint8Array(width * height);
  function plot(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < width && y >= 0 && y < height) data[y * width + x] = color;
  }
  function rect(x, y, w, h, color) {
    for (let py = Math.round(y); py < y + h; py++)
      for (let px = Math.round(x); px < x + w; px++) plot(px, py, color);
  }
  function line(x1, y1, x2, y2, color, thick = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n;
      for (let dx = 0; dx < thick; dx++) for (let dy = 0; dy < thick; dy++) plot(x + dx, y + dy, color);
    }
  }
  function disk(x, y, radius, color) {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius) plot(x + dx, y + dy, color);
  }
  function turn(x, y, angle, cx = width / 2, cy = height / 2) {
    return [cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)];
  }
  function localLine(x1, y1, x2, y2, angle, color, thick = 1) {
    const a = turn(x1, y1, angle), b = turn(x2, y2, angle);
    line(...a, ...b, color, thick);
  }
  function orientedRect(cx, cy, halfW, halfH, angle, color) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const dx = x - width / 2, dy = y - height / 2;
      const localX = dx * ca + dy * sa, localY = -dx * sa + dy * ca;
      if (Math.abs(localX - cx) <= halfW && Math.abs(localY - cy) <= halfH) plot(x, y, color);
    }
  }
  return {data, plot, rect, line, disk, turn, localLine, orientedRect};
}

function infantry(frame) {
  const p = canvas(24, 24), cx = 12;
  // The same index can be referenced by multiple DoTypes; source table order
  // resolves the canonical diagnostic pose, without claiming gameplay intent.
  const rules = states().filter(s => s.count && s.lastFrame >= frame && s.start <= frame);
  const rule = rules.find(s => s.action === "DO_FIRE_PRONE") || rules.find(s => s.action === "DO_WALK") ||
    rules.find(s => s.action === "DO_FIRE_WEAPON") || rules[0];
  const action = rule?.action || "DO_STAND_READY";
  const relative = frame - (rule?.start || 0);
  const facing = rule?.facingStride ? Math.floor(relative / rule.facingStride) % 8 : 0;
  const tick = rule?.facingStride ? relative % rule.facingStride : relative;
  const direction = facing >= 4 ? -1 : 1;
  const walking = action === "DO_WALK";
  const prone = /PRONE|CRAWL|LIE_DOWN/.test(action);
  const death = /DEATH/.test(action);
  const shooting = /FIRE_WEAPON|FIRE_PRONE/.test(action);
  const salute = /SALUTE|GESTURE|PLEAD/.test(action);
  if (death) {
    const fall = Math.min(1, tick / Math.max(1, (rule?.count || 8) - 1));
    p.line(cx - 1, 12 + fall * 7, cx + direction * (3 + fall * 7), 12 + fall * 7, 3, 3);
    p.disk(cx + direction * (2 + fall * 8), 10 + fall * 9, 3, 6);
    p.line(cx - 2, 19, cx - 5, 21, 5, 2);
    p.line(cx + 2, 19, cx + 5, 21, 7, 2);
    return [...p.data];
  }
  if (prone) {
    const x = cx - direction * 2;
    p.line(cx - direction * 8, 18, cx + direction * 4, 18, 3, 3);
    p.disk(cx + direction * 5, 16, 3, 6);
    p.line(cx - direction * 7, 19, cx - direction * 9, 21 + tick % 2, 5, 2);
    p.line(x, 18, x + direction * 10, 15 + (shooting && tick % 4 === 1 ? -1 : 0), 7, 2);
    if (shooting && tick % 4 === 2) p.disk(x + direction * 12, 14, 2, 6);
    return [...p.data];
  }
  const bob = walking ? 1 + tick % 2 : 0;
  p.disk(cx, 5 + bob, 3, 6);
  p.rect(cx - 2, 9 + bob, 5, 8, 3);
  p.rect(cx - 1, 10 + bob, 3, 3, 5);
  const stride = walking ? Math.round(4 * Math.sin(tick * Math.PI / 3)) : 0;
  p.line(cx - 1, 16 + bob, cx - 4 - stride, 21, 7, 2);
  p.line(cx + 1, 16 + bob, cx + 4 + stride, 21, 7, 2);
  p.line(cx - 2, 11 + bob, cx - 5 + (walking ? stride / 2 : 0), 16, 5, 2);
  if (salute) p.line(cx + 2, 11 + bob, cx + direction * 6, 3 + tick % 2, 7, 2);
  else {
    const recoil = shooting && tick % 3 === 1 ? 2 : 0;
    p.line(cx + 2, 12 + bob, cx + direction * (8 - recoil), 11 + bob, 5, 2);
    p.line(cx + direction * 4, 11 + bob, cx + direction * (10 - recoil), 10 + bob, 7, 2);
    if (shooting && tick % 3 === 2) p.disk(cx + direction * 11, 9 + bob, 2, 6);
  }
  return [...p.data];
}

function tank(frame) {
  const p = canvas(32, 32);
  const heading = frame % 32, angle = heading * Math.PI / 16;
  if (frame >= 32 && frame < 64) {
    // The engine composites this independent turret above body frame 0..31.
    p.localLine(0, -2, 0, -12, angle, 7, 3);
    p.localLine(-2, -6, 2, -6, angle, 5, 1);
    p.disk(16, 16, 5, 2); p.disk(16, 16, 3, 5);
    return [...p.data];
  }
  p.orientedRect(-7, 0, 2, 9, angle, 5);
  p.orientedRect(7, 0, 2, 9, angle, 5);
  p.orientedRect(0, 0, 7, 10, angle, 2);
  p.orientedRect(0, -2, 5, 6, angle, 3);
  p.localLine(-5, 6, 5, 6, angle, 6, 2);
  p.disk(16, 16, 3, 4);
  return [...p.data];
}

function orca(frame) {
  const p = canvas(32, 32), fast = frame >= 32 && frame < 64;
  const angle = frame % 32 * Math.PI / 16;
  const root = fast ? 0 : 3, tip = fast ? 10 : 13;
  p.localLine(0, -12, -4, 9, angle, 3, 2);
  p.localLine(0, -12, 4, 9, angle, 3, 2);
  p.localLine(0, -6, 0, 11, angle, 4, 5);
  p.localLine(-tip, root, tip, root, angle, 5, fast ? 2 : 3);
  p.localLine(-tip, root, -4, -5, angle, 5, 2);
  p.localLine(tip, root, 4, -5, angle, 5, 2);
  p.localLine(-7, 11, 7, 11, angle, 3, 2);
  p.localLine(0, -9, 0, -2, angle, 7, 2);
  p.localLine(-4, 9, -4, 12 + (fast ? 4 : 0), angle, fast ? 6 : 2, 2);
  p.localLine(4, 9, 4, 12 + (fast ? 4 : 0), angle, fast ? 6 : 2, 2);
  return [...p.data];
}

function factory(frame, buildup = false, total = 24) {
  const p = canvas(48, 48);
  const progress = buildup ? (frame + 1) / total : 1;
  const raised = Math.round(28 * (1 - progress));
  // A distinct, original angular processing plant with asymmetrical stacks.
  p.rect(6, 39, 36, 3, 6);
  p.rect(8, 39 - Math.round(17 * progress), 31, Math.round(17 * progress), 2);
  p.rect(11, 39 - Math.round(14 * progress), 24, Math.round(14 * progress), 3);
  if (progress > 0.35) {
    p.rect(28, 21 + raised, 7, Math.min(18, 40 - (21 + raised)), 5);
    p.rect(13, 13 + raised, 5, Math.min(27, 40 - (13 + raised)), 4);
    p.rect(16, 10 + raised, 4, 5, 7);
  }
  if (progress > 0.65) {
    p.rect(20, 24, 6, 11, 1);
    p.rect(21, 26, 4, 7, 4);
    p.line(8, 21, 22, 17, 5, 2);
    p.line(22, 17, 38, 22, 5, 2);
    p.rect(9, 35, 7, 4, 7);
  }
  if (buildup && frame < total - 1) {
    const scaffoldY = 39 - Math.round(26 * progress);
    p.line(5, 39, 5, scaffoldY, 6);
    p.line(43, 39, 43, scaffoldY, 6);
    p.line(5, scaffoldY, 43, scaffoldY, 6);
    p.line(43, 39, 47, 31 - frame % 4, 7);
  } else if (!buildup) {
    const active = frame >= 4 && frame < 24;
    p.disk(24, 16, 3, active && frame % 4 < 2 ? 7 : 5);
    p.line(36, 23, 42, 18 + (active ? frame % 3 : 0), 4);
    p.disk(42, 17, 2, active ? 6 : 5);
    if (frame >= 64) p.line(11, 25, 32, 37, 6, 2); // provisional damaged stand-in
  }
  return [...p.data];
}

function tree(frame) {
  const p = canvas(32, 32), damaged = frame > 0;
  const collapse = Math.min(1, Math.max(0, frame - 1) / 12);
  p.line(16, 28, 16 + collapse * 6, 15 + collapse * 12, 6, 4);
  if (collapse < 0.95) {
    const top = 12 + Math.round(collapse * 15), radius = Math.max(2, 10 - Math.round(collapse * 9));
    p.disk(12, top, radius, damaged ? 2 : 3);
    p.disk(20, top + 2, Math.max(1, radius - 2), damaged ? 6 : 5);
    if (!damaged) p.disk(15, 8, 5, 7);
    else p.line(10, top + 2, 20, top - 3, 7, 2);
  } else p.rect(10, 27, 14, 3, 6);
  return [...p.data];
}

function explosion(frame) {
  const p = canvas(32, 32), phase = frame % 128;
  const expansion = phase < 16 ? phase / 16 : Math.max(0, 1 - (phase - 16) / 112);
  const radius = Math.max(2, Math.round(2 + 11 * expansion));
  const spokes = 8;
  for (let i = 0; i < spokes; i++) {
    const a = Math.PI * 2 * i / spokes + phase / 18;
    p.line(16 + Math.cos(a) * 2, 16 + Math.sin(a) * 2,
      16 + Math.cos(a) * radius, 16 + Math.sin(a) * radius, i % 2 ? 6 : 7, 2);
  }
  if (phase < 32) p.disk(16, 16, Math.max(1, radius / 2), phase < 12 ? 7 : 6);
  else p.disk(16, 16, 2, 2);
  return [...p.data];
}

const types = {"WF-0185": infantry, "WF-0289": tank, "WF-0004": orca,
  "WF-0013": factory, "WF-0256": tree, "WF-0072": explosion};
const statePreviewSpecs = [
  {id:"WF-0185",name:"stand",frame:0}, {id:"WF-0185",name:"walk",frame:16},
  {id:"WF-0185",name:"fire",frame:66}, {id:"WF-0185",name:"prone",frame:192},
  {id:"WF-0185",name:"death",frame:424}, {id:"WF-0185",name:"salute",frame:511},
  {id:"WF-0289",name:"hull-north",frame:0}, {id:"WF-0289",name:"hull-east",frame:8},
  {id:"WF-0289",name:"turret-north",frame:32}, {id:"WF-0289",name:"turret-east",frame:40},
  {id:"WF-0004",name:"cruise",frame:0}, {id:"WF-0004",name:"high-speed",frame:32},
  {id:"WF-0013",name:"idle",frame:0}, {id:"WF-0013",name:"active",frame:5},
  {id:"WF-0013",name:"buildup-start",frame:0,supplemental:true},
  {id:"WF-0013",name:"buildup-mid",frame:12,supplemental:true},
  {id:"WF-0013",name:"buildup-finish",frame:23,supplemental:true},
  {id:"WF-0256",name:"healthy",frame:0}, {id:"WF-0256",name:"damaged",frame:1},
  {id:"WF-0256",name:"crumbling",frame:9},
  {id:"WF-0072",name:"ignition",frame:0}, {id:"WF-0072",name:"blast",frame:16},
  {id:"WF-0072",name:"fade",frame:86}
];
function representativePixels(item, frame) {
  const painter = types[item.id];
  if (!painter) return null;
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= item.provisionalFrameCount)
    throw new Error(`Out-of-contract state frame ${item.id}/${frame}`);
  const pixels = painter(frame);
  if (pixels.length !== item.width * item.height || pixels.some(v => v > 7))
    throw new Error(`Invalid representative animation ${item.id}/${frame}`);
  return pixels;
}

module.exports = {representativePixels, factory, statePreviewSpecs};
