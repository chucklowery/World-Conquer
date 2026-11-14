"use strict";
// Independent HD canvas diagnostic. The native game's indexed SHP path stays
// authoritative until the actual renderer is upgraded to support RGBA sprites.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WCCargoHD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const files = Array.from({length:36}, (_, i) => `${String(i).padStart(4,"0")}.png`);
  function verifyManifest(manifest) {
    if (!manifest || manifest.asset !== "WF-0002 / AIRCRAFT_CARGO / C17.SHP" ||
        manifest.frame_count !== 36 || !Array.isArray(manifest.size) ||
        manifest.size[0] !== 512 || manifest.size[1] !== 512 ||
        !manifest.sha256 || Object.keys(manifest.sha256).sort().join(",") !== files.join(",")) {
      throw Error("Invalid WF-0002 HD manifest contract");
    }
    for (const file of files) if (!/^[a-f0-9]{64}$/.test(manifest.sha256[file]))
      throw Error(`Invalid digest for ${file}`);
    return manifest;
  }
  async function load(baseUrl, fetcher=fetch, digest) {
    const base = baseUrl.replace(/\/$/, "");
    const response = await fetcher(`${base}/manifest.json`);
    if (!response.ok) throw Error("Cannot fetch HD manifest");
    const manifest = verifyManifest(await response.json());
    const hash = digest || (async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      x => x.toString(16).padStart(2,"0")).join(""));
    const frames = [];
    // Verify all images before displaying even the first; no partial pack.
    for (const file of files) {
      const r = await fetcher(`${base}/${file}`);
      if (!r.ok) throw Error(`Cannot fetch ${file}`);
      const bytes = await r.arrayBuffer();
      if (await hash(bytes) !== manifest.sha256[file]) throw Error(`HD checksum mismatch: ${file}`);
      const data = new DataView(bytes);
      if (data.byteLength < 24 || data.getUint32(0) !== 0x89504e47 ||
          data.getUint32(16) !== 512 || data.getUint32(20) !== 512)
        throw Error(`Invalid HD PNG dimensions: ${file}`);
      frames.push(bytes);
    }
    return {manifest, frames};
  }
  async function decode(pack, createBitmap=createImageBitmap) {
    const images = await Promise.all(pack.frames.map(bytes => createBitmap(new Blob([bytes], {type:"image/png"}))));
    if (images.some(img => img.width !== 512 || img.height !== 512)) throw Error("Invalid decoded image size");
    return images;
  }
  function draw(ctx, images, index) {
    if (!Number.isInteger(index) || index<0 || index>=36) throw Error("Invalid cargo frame");
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(images[index],0,0,ctx.canvas.width,ctx.canvas.height);
  }
  return {files,verifyManifest,load,decode,draw};
});
