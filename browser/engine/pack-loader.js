/* M1 original pack delivery. No proprietary media is embedded here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WCPackLoader = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const shaPattern = /^[0-9a-f]{64}$/i;
  const namePattern = /^[A-Z0-9_.-]+$/;
  const disc = new Set(["gdi", "nod", "covertops"]);
  function pathValid(value) {
    if (typeof value !== "string" || !value || value.startsWith("/") ||
        value.includes("\\") || value.includes("%") || value.includes("?") ||
        value.includes("#")) return false;
    const parts = value.split("/");
    if (parts.some(p => !p || p === "." || p === "..")) return false;
    if (parts.length > 1 && !disc.has(parts[0])) return false;
    if (parts.length > 2) return false;
    return namePattern.test(parts[parts.length - 1]);
  }
  function validate(manifest) {
    if (!manifest || manifest.schema !== 1 || typeof manifest.packVersion !== "string" ||
        !manifest.packVersion || !Array.isArray(manifest.files)) throw Error("Invalid pack manifest");
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(manifest.packVersion)) throw Error("Invalid packVersion");
    const seen = new Set();
    for (const file of manifest.files) {
      if (!file || !pathValid(file.path)) throw Error("Illegal pack path: " + (file && file.path));
      if (seen.has(file.path)) throw Error("Duplicate pack file: " + file.path);
      seen.add(file.path);
      if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
          !shaPattern.test(file.sha256 || "")) throw Error("Invalid pack metadata: " + file.path);
    }
    return manifest;
  }
  function hex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }
  async function sha256(bytes, cryptoApi) {
    const provider = cryptoApi || (typeof crypto !== "undefined" ? crypto : null);
    if (!provider || !provider.subtle) throw Error("Web Crypto SHA-256 unavailable");
    return hex(new Uint8Array(await provider.subtle.digest("SHA-256", bytes)));
  }
  function mkdir(fs, path) {
    if (!fs.analyzePath(path).exists) fs.mkdir(path);
  }
  async function load(fs, base, fetcher, onProgress, deps) {
    const fetchImpl = fetcher || fetch;
    const baseUrl = String(base || "data").replace(/\/$/, "");
    const response = await fetchImpl(baseUrl + "/pack.json");
    if (!response.ok) throw Error("Pack manifest unavailable (" + response.status + ")");
    const manifest = validate(await response.json());
    const cryptoApi = deps && deps.crypto;
    const cacheApi = deps && deps.caches || (typeof caches !== "undefined" ? caches : null);
    let cache = null;
    if (cacheApi) {
      try { cache = await cacheApi.open("world-conquer-pack-" + manifest.packVersion); }
      catch (_) { cache = null; }
    }
    // Fetch and verify all files before writing into MEMFS.
    const staged = [];
    for (let index = 0; index < manifest.files.length; index++) {
      const file = manifest.files[index];
      const url = baseUrl + "/game/" + file.path.split("/").map(encodeURIComponent).join("/");
      let raw = null;
      let fromCache = false;
      if (cache) {
        try {
          const cached = await cache.match(url);
          if (cached) { raw = await cached.arrayBuffer(); fromCache = true; }
        } catch (_) { raw = null; }
      }
      if (!raw) {
        const result = await fetchImpl(url);
        if (!result.ok) throw Error("Pack file missing: " + file.path + " (" + result.status + ")");
        raw = await result.arrayBuffer();
      }
      if (raw.byteLength !== file.bytes) throw Error("Pack size mismatch: " + file.path);
      if ((await sha256(raw, cryptoApi)).toLowerCase() !== file.sha256.toLowerCase())
        throw Error("Pack SHA-256 mismatch: " + file.path);
      staged.push({ path: file.path, bytes: new Uint8Array(raw) });
      if (cache && !fromCache && typeof Response !== "undefined") {
        try { await cache.put(url, new Response(raw)); } catch (_) { /* private mode */ }
      }
      if (onProgress) onProgress(index + 1, manifest.files.length, file.path);
    }
    mkdir(fs, "/game");
    for (const entry of staged) {
      const parts = entry.path.split("/");
      if (parts.length > 1) mkdir(fs, "/game/" + parts[0]);
      fs.writeFile("/game/" + entry.path, entry.bytes);
    }
    fs.chdir("/game");
    return { manifest, count: staged.length };
  }
  return { pathValid, validate, sha256, load };
});
