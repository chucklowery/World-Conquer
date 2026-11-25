# VanillaTD browser runtime

This directory holds the browser platform layer for the **stock VanillaTD
engine** compiled to WebAssembly: the launcher page, the data-pack loader,
local file import, engine diagnostics and the Chromium acceptance tests. The
engine is the only gameplay authority (ADR-0003); nothing here simulates the
game. See [`docs/ROADMAP.md`](../../docs/ROADMAP.md).

The earlier parallel world and its demos (Courier, R02 orders, the R02/R03/R04
live match, the R03 drill, the standalone JS slice and the tactical HUD) were
removed in M3. They are in git history before that cleanup commit.

## Files

| File | Purpose |
| --- | --- |
| `shell.html` | Emscripten shell: the play view (`?play`), the stock-engine panel, local import and diagnostics. SDL2 targets `#canvas`; keep that ID |
| `pack-loader.js` | Fetches `data/pack.json`, verifies sizes and SHA-256, stages the pack at `/game` |
| `asset-import.js` | Stages player-selected local files into MEMFS (development only; never uploaded) |
| `asset-audit.js` | Parses `[asset-hit]` / `[asset-miss]` log lines into `window.WCAssetAudit` |
| `original-asset.js`, `wireframe-asset.js` | Verify and stage the sample SHP and six wireframe shapes for the diagnostics |
| `probe.cpp`, `data_probe.cpp`, `shape_probe.cpp` | Diagnostic `--browser-*` modes compiled into the engine (`tiberiandawn/startup.cpp`) |
| `cooperative.h` | `Browser_Cooperative_Yield()`, the Asyncify yield used by `Call_Back()` and `Frame_Limiter()` |
| `check-stock-engine.js` | CI `stock-engine`: the unmodified engine reaches its menu on original data |
| `check-stock-scenario.js` | CI `stock-scenario` and `ai-match`: a full skirmish on the original data pack |
| `check-runtime.js` | Engine diagnostics in Chromium: SDL2 probe, cooperative loop, SHP drawing, file staging |
| `check-r05-gallery.js`, `r05-gallery.*` | The R05 Aster/Forge art gallery (an art reference, not a game mode) |
| `package-play.js` | Packages the public play site published by `publish-play.yml` |

## Try it

Build the engine and data pack as in
[`docs/browser/BUILD.md`](../../docs/browser/BUILD.md) and
[`docs/browser/M2_DATA_PACK.md`](../../docs/browser/M2_DATA_PACK.md), serve
`build/browser-engine/` over HTTP, and open `vanillatd.html?play`. Press
**Play**, then **Multiplayer → Skirmish**.

Without `?play` the page also shows:

- **Engine diagnostics.** The SDL2 probe (animated rectangle; mouse and key
  logs), the cooperative C++ loop (Asyncify yields to a JS heartbeat), and
  `CC_Draw_Shape()` rendering of a sample SHP and six wireframe shapes. They
  need no game data. Reload to switch modes.
- **Local data import** (development only). Choose legally owned files; they
  are staged at `/game` (CD folders `gdi`, `nod`, `covertops` keep their
  subfolders) in memory and never uploaded. **Verify native engine file
  lookup** checks paths through `CCFileClass`, not archive contents.
  **Launch experimental game** runs the unmodified `main()` on them.

In DevTools, `window.WCAssetAudit` holds asset `hits`, `misses` and `fatal`;
`window.WCWatchdog.maxStallMs` is the longest gap in the animation-frame
heartbeat. Settings under `/game/user` persist through IDBFS. The canvas is
CSS-scaled without changing SDL's back buffer, takes keyboard focus on click,
and has an optional pointer lock (off by default).

## Publishing

`publish-play.yml` runs after a green `browser-engine` run on `vanilla`,
packages the tested engine and data pack with `package-play.js`, plays the
packaged site through its play view in Chromium, and deploys it to GitHub
Pages.
