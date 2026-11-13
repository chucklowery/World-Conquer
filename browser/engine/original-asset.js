/* Load a project-authored content pack from this origin into Emscripten MEMFS.
 * This is a diagnostic asset path, separate from player-owned game data.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WCContent = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const safe = value => typeof value === "string" &&
    /^[a-zA-Z0-9_./-]+$/.test(value) && !value.startsWith("/") &&
    value.split("/").every(s => s && s !== "." && s !== "..");

  async function load(fs, manifestUrl, fetcher, digest) {
    if (!manifestUrl || !manifestUrl.endsWith("/manifest.json")) throw new Error("Invalid manifest URL");
    const get = fetcher || fetch;
    const hash = digest || (async buffer => {
      const bytes = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
    });
    const response = await get(manifestUrl);
    if (!response.ok) throw new Error(`Content manifest HTTP ${response.status}`);
    const manifest = await response.json();
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error("Invalid content manifest");
    const assets = manifest.assets.filter(a => a.id === "unit.placeholder-scout");
    if (assets.length !== 1 || assets[0].target !== "units/SCOUT.SHP") {
      throw new Error("Expected original sample sprite absent from manifest");
    }
    const asset = assets[0];
    if (!safe(asset.target) || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes > 1024 * 1024) {
      throw new Error("Invalid sample asset metadata");
    }
    const url = manifestUrl.slice(0, -"manifest.json".length) + "files/" + asset.target;
    const dataResponse = await get(url);
    if (!dataResponse.ok) throw new Error(`Content file HTTP ${dataResponse.status}`);
    const buffer = await dataResponse.arrayBuffer();
    if (buffer.byteLength !== asset.bytes || await hash(buffer) !== asset.sha256) {
      throw new Error("Original sprite integrity verification failed");
    }
    if (!fs.analyzePath("/game").exists) fs.mkdir("/game");
    fs.writeFile("/game/SCOUT.SHP", new Uint8Array(buffer));
    return {id: asset.id, bytes: buffer.byteLength};
  }
  return {load};
});
