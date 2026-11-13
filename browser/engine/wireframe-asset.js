/* Verify and stage the six original-art tactical wireframes for the native
 * browser engine diagnostic. This is not a full stand-alone game asset mount.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WCWireframes = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const categories = new Set(["infantry", "vehicle", "aircraft", "building", "terrain", "effect"]);
  const safeId = s => typeof s === "string" && /^WF-[0-9]{4}$/.test(s);
  const safeName = s => typeof s === "string" && /^[A-Z0-9_-]{1,20}\.SHP$/.test(s);
  const validHash = s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);

  async function load(fs, manifestUrl, fetcher, digest) {
    if (typeof manifestUrl !== "string" || !/^[a-zA-Z0-9_./-]+\/manifest\.json$/.test(manifestUrl) ||
        manifestUrl.startsWith("/") || manifestUrl.split("/").some(part => !part || part === "." || part === "..")) {
      throw new Error("Invalid wireframe manifest URL");
    }
    const get = fetcher || fetch;
    const hash = digest || (async buffer => {
      const bytes = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
    });
    const prefix = manifestUrl.slice(0, -"manifest.json".length);
    async function readJson(url) {
      const response = await get(url);
      if (!response.ok) throw new Error(`Wireframe metadata HTTP ${response.status}`);
      return response.json();
    }
    const [manifest, roster, contracts] = await Promise.all([
      readJson(manifestUrl), readJson(prefix + "roster.json"), readJson(prefix + "contracts.json")]);
    if (manifest.schemaVersion !== 1 || manifest.gameId !== "world-conquer-wireframes" ||
        !Array.isArray(manifest.assets) || roster.schemaVersion !== 1 ||
        !Array.isArray(roster.assets) || roster.assets.length !== 6 ||
        contracts.schemaVersion !== 1 || !Array.isArray(contracts.assets) || contracts.assets.length !== 6) {
      throw new Error("Invalid wireframe pack manifest/roster/contracts");
    }
    const ids = new Set(), filenames = new Set(), roles = new Set();
    const requests = [{id: "palette.wireframe", target: "WIREFRAME.PAL", filename: "WIREFRAME.PAL", maxBytes: 768}];
    for (const expected of roster.assets) {
      if (!safeId(expected.id) || !categories.has(expected.category) || !safeName(expected.engineFilename) ||
          typeof expected.engineEnum !== "string" || !/^[A-Z0-9_]+$/.test(expected.engineEnum) ||
          ids.has(expected.id) || filenames.has(expected.engineFilename) || roles.has(expected.category)) {
        throw new Error("Invalid or duplicate wireframe roster entry");
      }
      ids.add(expected.id); filenames.add(expected.engineFilename); roles.add(expected.category);
      requests.push({id: expected.id, target: `${expected.category}/${expected.id}.SHP`,
        filename: expected.engineFilename, maxBytes: 4 * 1024 * 1024, expected});
    }
    if (roles.size !== categories.size || manifest.assets.some(a => !a || typeof a !== "object") ||
        new Set(manifest.assets.map(a => a.id)).size !== manifest.assets.length ||
        contracts.assets.some(a => !a || typeof a !== "object") ||
        new Set(contracts.assets.map(a => a.id)).size !== contracts.assets.length) {
      throw new Error("Incomplete roster or duplicate manifest/contract IDs");
    }
    const staged = [];
    for (const request of requests) {
      const entries = manifest.assets.filter(a => a.id === request.id);
      if (entries.length !== 1) throw new Error(`Missing wireframe ${request.id}`);
      const asset = entries[0], destination = "/game/" + request.filename;
      if (asset.target !== request.target || !validHash(asset.sha256) ||
          !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > request.maxBytes ||
          (request.id === "palette.wireframe" && asset.bytes !== 768)) {
        throw new Error(`Invalid wireframe metadata ${request.id}`);
      }
      if (request.expected && (asset.engineFilename !== request.filename ||
          asset.engineEnum !== request.expected.engineEnum || asset.mountReady !== true ||
          !Array.isArray(asset.sharedFilenameWith) || asset.sharedFilenameWith.length ||
          !Number.isSafeInteger(asset.frames) || asset.frames < 1 ||
          !Number.isSafeInteger(asset.width) || asset.width < 1 || asset.width > 64 ||
          !Number.isSafeInteger(asset.height) || asset.height < 1 || asset.height > 64)) {
        throw new Error(`Unverified or colliding wireframe resource ${request.id}`);
      }
      if (request.expected) {
        const contract = contracts.assets.find(c => c.id === request.id);
        if (!contract || contract.engineEnum !== asset.engineEnum || contract.category !== request.expected.category ||
            contract.engineFilename !== request.filename || contract.placeholderFrames !== asset.frames ||
            !Number.isSafeInteger(contract.minimumFrames) || contract.minimumFrames < 1 ||
            contract.minimumFrames > asset.frames || !Array.isArray(contract.probes) || !contract.probes.length ||
            contract.probes.some(frame => !Number.isSafeInteger(frame) || frame < 0 || frame >= asset.frames) ||
            !Number.isSafeInteger(contract.diagnosticActionFrame) ||
            !contract.probes.includes(contract.diagnosticActionFrame)) {
          throw new Error(`Invalid frame contract for ${request.id}`);
        }
      }
      if (fs.analyzePath(destination).exists) throw new Error(`Asset already staged: ${destination}`);
      const response = await get(prefix + "files/" + request.target);
      if (!response.ok) throw new Error(`Wireframe file HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== asset.bytes || await hash(buffer) !== asset.sha256) {
        throw new Error(`Wireframe integrity verification failed: ${request.id}`);
      }
      staged.push({destination, bytes: new Uint8Array(buffer)});
    }
    // All data is verified before any MEMFS mutations.
    if (!fs.analyzePath("/game").exists) fs.mkdir("/game");
    for (const {destination, bytes} of staged) fs.writeFile(destination, bytes);
    return {count: staged.length, shapes: staged.length - 1,
      bytes: staged.reduce((total, file) => total + file.bytes.byteLength, 0)};
  }
  return {load};
});
