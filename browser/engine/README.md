# VanillaTD browser runtime bootstrap

This launcher is compiled into the **real VanillaTD** HTML/JS/WASM bundle, not the independent SDL2 smoke test. It deliberately defers game main() until the user starts it.

## Original-content browser-playable vertical slice

For an immediate lightweight launch, open `browser/engine/play.html` directly
in Chrome or Edge (or serve the folder over HTTP). It does not depend on a
WebAssembly build. The compiled engine shell also embeds this same prototype.

Click **Start tactical mission** in the browser shell. A deterministic, self-contained
18×11 mission opens without any third-party data: select either green squad member,
click a clear tile to move along a four-way path, retrieve the two amber supply
crates, survive the red sentries, and reach the Courier extraction zone. Restart
after victory or defeat. The original aircraft HD frame appears in the extraction
zone if the separately verified HD pack has been loaded; otherwise the landing
zone has a schematic aircraft marker. Tests cover pathfinding, pickup, victory,
defeat and the responsive browser canvas. Source: `vertical-slice.js`.

This **is gameplay, but it is not the native VanillaTD campaign**: the mission
simulation and canvas renderer are independent browser JavaScript. It is intended
to playtest controls, layout, original artwork and the supply-extraction loop
while the C++ gameplay asset/mission integration is still underway.

## Try it

Build the engine with Emscripten per docs/browser/BUILD.md, then serve build/browser-engine over HTTP and open vanillatd.html.

- Wait for the page's **Runtime ready** status.
- Click **Run engine SDL2 probe**. Expect an animated rectangle, mouse click toggling its color, and keydown logs. This probe exercises SDL2 **inside the engine binary** but does not load game state.
- Reload the page to switch modes.
- Optionally select legally acquired game files or a folder. The browser stages files locally under /game in MEMFS without uploading them. **Launch experimental game** calls the unmodified synchronous game main(); it may freeze or fail and is not playable yet.

Files are memory-only and lost on refresh. No copyrighted EA media is included in the project or CI artifacts.

## Original six-class wireframe integration

The **Render six wireframe assets** button tests the project-owned placeholder art using the actual C++ resource lookup and tactical drawing path. It verifies the representative [roster](../../game/content/wireframes/representative-roster.json) and SHA-256 manifest, stages six `.SHP` files and `WIREFRAME.PAL` under `/game` in MEMFS, then launches the native `--browser-wireframe-probe` mode. This draws infantry (`E1`), tank (`MTNK`), aircraft (`ORCA`), construction yard (`FACT`), tree (`T01`) and explosion (`ART-EXP1`) in a 3×2 grid via `CC_Draw_Shape()`, with base and selected action-state frames side by side.

To create the served pack from repository source:

```sh
node tools/content/wireframes.js build build/browser-engine/wireframes --representative
node browser/engine/test-wireframe-asset.js build/browser-engine/wireframes
```

Run from the repository root and choose a new build output directory (the generator does not overwrite). The browser page also needs `wireframe-asset.js` copied alongside the generated `vanillatd.html`, as done by `.github/workflows/browser-engine.yml`. The workflow builds the six-class pack and exercises the actual WebAssembly rendering in headless Chromium; it tests that all six are drawn and that the canvas changes.

The loader checks every hash and metadata record **before writing any file**. It rejects conflicting engine filenames, missing classes, existing MEMFS files and partial/tampered content. It does not enable full-game launch, pack archives, verify per-state animation offsets or claim that the six assets are ready for production missions.

The emitted `contracts.json` now provides a [source-audited index contract](../../docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md). The loader rejects frame counts that cannot cover its required action/state probes; a native LCW test also decodes those exact frames. This is **frame-index correctness**, not proof that the artwork faithfully animates every action or that construction/sound dependencies exist.

## Outstanding

The browser loop, Select_Game(), Main_Game() and dialogs need a cooperative execution design. Asset loading/case behavior requires a real test with legitimately owned data. The probe needs manual Chrome/Edge verification before its runtime acceptance gate can be marked complete.

SDL2's Emscripten video backend defaults to the CSS selector `#canvas`; the browser shell must keep that ID for mouse events to register correctly. The Chromium test asserts that event registration succeeds.

## Player-owned game data / first GDI mission

The browser import preserves native CD folders named gdi, nod and
covertops. Loose files are staged at /game; GDI CD files are placed
under /game/gdi. The UI checks CONQUER.MIX, CCLOCAL.MIX or LOCAL.MIX,
and GENERAL.MIX before enabling game startup. This confirms only
nonzero-size files at those paths, not valid MIX contents.

Use Verify native engine file lookup to invoke a CCFileClass /
CDFileClass probe in the real VanillaTD binary. It does not parse
archives. Loose SCG01EA.INI is optional because missions may be packed.
Reload, stage legally acquired assets, then select New Game -> GDI
in experimental game mode. Instrumentation logs startup, menu and
scenario stages. A working first mission is NOT yet verified.
