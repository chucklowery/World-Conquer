/*
 * User-owned Tiberian Dawn asset staging. This module never performs network
 * requests. CommonJS exports are only for asset-free CI unit tests.
 *
 * The native engine looks for loose assets at /game and disc files in lowercase
 * /game/gdi, /game/nod, /game/covertops directories. File names remain uppercase.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TDAssets = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const DISC_DIRS = new Set(["gdi", "nod", "covertops"]);
  const VALID_FILENAME = /^[A-Z0-9_.-]+$/;
  const MAX_SINGLE_BYTES = 512 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

  function destination(file) {
    const original = String(file.webkitRelativePath || file.name || "");
    const segments = original.replace(/\\/g, "/").split("/").filter(Boolean);
    if (!segments.length || segments.some(s => s === "." || s === "..")) {
      throw new Error("Unsafe file path: " + original);
    }
    const fileName = segments[segments.length - 1].toUpperCase();
    if (!VALID_FILENAME.test(fileName) || fileName === "." || fileName === "..") {
      throw new Error("Unsupported filename: " + original);
    }
    // Preserve only the disc-directory designation. Directory-picking APIs
    // include a top-level folder that differs from machine to machine.
    const disc = segments.slice(0, -1).map(s => s.toLowerCase())
      .find(s => DISC_DIRS.has(s)) || "";
    return "/game/" + (disc ? disc + "/" : "") + fileName;
  }

  function plan(files, existing) {
    const records = [];
    const warnings = [];
    const seen = new Set(existing || []);
    let totalBytes = 0;
    for (const file of Array.from(files || [])) {
      const path = destination(file);
      if (seen.has(path)) {
        warnings.push("Skipped duplicate path " + path);
        continue;
      }
      if (!Number.isSafeInteger(file.size) || file.size < 0) {
        throw new Error("Invalid size for " + file.name);
      }
      if (file.size > MAX_SINGLE_BYTES) {
        throw new Error(file.name + " exceeds the 512 MiB in-browser per-file limit");
      }
      if (totalBytes + file.size > MAX_TOTAL_BYTES) {
        throw new Error("This selection exceeds the 1 GiB in-browser staging limit");
      }
      totalBytes += file.size;
      seen.add(path);
      records.push({ file, path });
    }
    return {records, warnings, totalBytes};
  }

  function preflight(fs) {
    // This is a structural check only. MIX archive integrity, embedded
    // missions, media codecs, and scenario compatibility are not proven.
    function valid(p) {
      try {
        const e = fs.analyzePath(p);
        return !!e.exists && !!e.object && e.object.mode &&
          (typeof fs.isFile !== "function" || fs.isFile(e.object.mode)) &&
          e.object.usedBytes !== 0;
      } catch (_) { return false; }
    }
    const core = valid("/game/CONQUER.MIX");
    const fonts = valid("/game/CCLOCAL.MIX") || valid("/game/LOCAL.MIX");
    const general = valid("/game/GENERAL.MIX") || valid("/game/gdi/GENERAL.MIX");
    const looseGdi = valid("/game/SCG01EA.INI") || valid("/game/gdi/SCG01EA.INI");
    const missing = [];
    if (!core) missing.push("CONQUER.MIX (game engine resources)");
    if (!fonts) missing.push("CCLOCAL.MIX or LOCAL.MIX (fonts)");
    if (!general) missing.push("GENERAL.MIX (root or gdi/)");
    return {ready: core && fonts && general, missing, looseGdi,
            explanation: "Filename/size preflight only; MIX validity and GDI mission are unverified."};
  }

  function directory(fs, name) {
    if (fs.analyzePath(name).exists) return;
    fs.mkdir(name);
  }
  async function stage(fs, files, previous, onFile) {
    const staged = previous || new Set();
    const scheduled = plan(files, staged);
    // Fail fast on invalid selection before changing MEMFS.
    directory(fs, "/game");
    directory(fs, "/game/user");
    directory(fs, "/game/gdi");
    directory(fs, "/game/nod");
    directory(fs, "/game/covertops");
    for (const entry of scheduled.records) {
      fs.writeFile(entry.path, new Uint8Array(await entry.file.arrayBuffer()));
      staged.add(entry.path);
      if (onFile) onFile(entry.path);
    }
    fs.chdir("/game");
    return {count: staged.size, warnings: scheduled.warnings,
            preflight: preflight(fs)};
  }
  return {destination, plan, preflight, stage};
});
