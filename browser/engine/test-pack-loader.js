"use strict";
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const api = require("./pack-loader.js");
const bytes = new TextEncoder().encode("original demo");
const digest = Buffer.from(awaitDummy()).toString("hex");
function awaitDummy(){return require("node:crypto").createHash("sha256").update(bytes).digest();}
const entry = { path: "CONQUER.MIX", bytes: bytes.length, sha256: digest };
const manifest = {schema:1,packVersion:"m1-test",files:[entry]};
assert.equal(api.validate(manifest), manifest);
for (const illegal of ["../A.MIX","/A.MIX","GDI/A.MIX","gdi/../A.MIX","gdi/a.mix","gdi/a/b.MIX","A%2FB.MIX"]) {
  assert.equal(api.pathValid(illegal), false, illegal);
}
const written = new Map(), dirs = new Set(["/"]);
const fs = { analyzePath(p){return {exists:dirs.has(p)};},mkdir(p){dirs.add(p);},
  writeFile(p,b){written.set(p,Buffer.from(b));}, chdir(p){assert.equal(p,"/game");} };
const response = (value,ok=true)=>({ok,status:ok?200:404,json:async()=>value,arrayBuffer:async()=>Uint8Array.from(value).buffer});
const fetcher = async url => url.endsWith("pack.json") ? response(manifest) : response(bytes);
async function main(){
  await api.load(fs,"data",fetcher,null,{crypto:webcrypto});
  assert.deepEqual(written.get("/game/CONQUER.MIX"),Buffer.from(bytes));
  await assert.rejects(api.load(fs,"data",async url=>url.endsWith("pack.json")?response(manifest):response([],false),null,{crypto:webcrypto}),/missing/);
  await assert.rejects(api.load(fs,"data",async url=>url.endsWith("pack.json")?response(manifest):response(new TextEncoder().encode("original demos")),null,{crypto:webcrypto}),/size mismatch/);
  const wrong = {schema:1,packVersion:"test",files:[{...entry,sha256:"0".repeat(64)}]};
  await assert.rejects(api.load(fs,"data",async url=>url.endsWith("pack.json")?response(wrong):response(bytes),null,{crypto:webcrypto}),/SHA-256 mismatch/);
  // Cache Storage: a verified entry is stored with its SHA-256 and trusted
  // on the next load without hashing; an entry without it, or with a
  // different one, is hashed (and the bad one rejected).
  const store = new Map();
  const caches = { open: async () => ({
    match: async url => store.has(url) ? store.get(url).clone() : undefined,
    put: async (url, res) => { store.set(url, res); } }) };
  let digests = 0;
  const countingCrypto = { subtle: { digest: (alg, data) => { digests++; return webcrypto.subtle.digest(alg, data); } } };
  await api.load(fs, "data", fetcher, null, { crypto: countingCrypto, caches });
  assert.equal(digests, 1, "first load hashes the downloaded file");
  assert.equal(store.get("data/game/CONQUER.MIX").headers.get("x-wc-sha256"), digest);
  let fetched = 0;
  const noNetwork = async url => { if (url.endsWith("pack.json")) return response(manifest); fetched++; return response(bytes); };
  await api.load(fs, "data", noNetwork, null, { crypto: countingCrypto, caches });
  assert.equal(digests, 1, "a verified cache entry is not hashed again");
  assert.equal(fetched, 0, "a cache hit is not downloaded");
  store.set("data/game/CONQUER.MIX", new Response(bytes));
  await api.load(fs, "data", noNetwork, null, { crypto: countingCrypto, caches });
  assert.equal(digests, 2, "an entry without the header is hashed");
  assert.equal(store.get("data/game/CONQUER.MIX").headers.get("x-wc-sha256"), digest, "and upgraded");
  store.set("data/game/CONQUER.MIX", new Response(new TextEncoder().encode("original dem0"),
    { headers: { "x-wc-sha256": "0".repeat(64) } }));
  await assert.rejects(api.load(fs, "data", noNetwork, null, { crypto: countingCrypto, caches }), /SHA-256 mismatch/,
    "a header that does not match the manifest is not trusted");
  console.log("pack loader tests passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
