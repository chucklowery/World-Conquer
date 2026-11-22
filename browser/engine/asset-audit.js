/* M1: structured audit lines from the stock VanillaTD runtime. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WCAssetAuditParser = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  function create() { return { hits: [], misses: [], fatal: null }; }
  function collect(state, message) {
    for (const line of String(message).split(/\r?\n/)) {
      const hit = line.match(/^\[asset-hit\] (\S+) (\S+)$/);
      const miss = line.match(/^\[asset-miss\] (\S+)$/);
      const fatal = line.match(/^\[browser-game\] fatal=(.+)$/);
      if (hit) state.hits.push({ name: hit[1], source: hit[2] });
      if (miss) state.misses.push(miss[1]);
      if (fatal) state.fatal = fatal[1];
    }
    return state;
  }
  return { create, collect };
});
