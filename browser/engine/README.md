# VanillaTD browser runtime bootstrap

This launcher is compiled into the **real VanillaTD** HTML/JS/WASM bundle, not the independent SDL2 smoke test. It deliberately defers game main() until the user starts it.

## Original-content browser-playable vertical slice

For an immediate lightweight launch, open `browser/engine/play.html` directly
in Chrome or Edge (or serve the folder over HTTP). It does not depend on a
WebAssembly build. The compiled engine shell also embeds this same prototype.
The browser CI workflow now produces a small `world-conquer-courier-playable`
ZIP artifact containing `play.html`, its two JavaScript files, and the verified
mission data. Extract the ZIP and open `play.html` to play without installing
the original game or a WebAssembly toolchain. The static build is intentionally
separate from the larger engine WASM artifact; public hosting is not yet set up.

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

### Native WebAssembly gameplay milestone

The compiled VanillaTD launcher also offers **Play mission in native C++ engine**.
It selects `--browser-native-slice`, a C++11 implementation of the same
18×11 supply-recovery loop running directly inside the actual game executable
using SDL2. Click green units and destinations; press **R** to restart. The
mission core is tested without Emscripten by `test-native-slice.cpp`. Before
starting, the shell verifies the 36-frame HD pack and stages its north-facing
aircraft image as raw 512×512 RGBA in MEMFS. The native C++ renderer creates
an SDL texture and draws it at the extraction zone. If verification or staging
fails, a schematic extraction marker remains visible. The hosted browser CI
checks native WASM movement, restart and verified HD texture loading.

This milestone exercises real compiled C++ gameplay and HD drawing, but it
is intentionally a **separate native scenario** rather than an original
campaign mission. Integration with the historical unit, theater, save-game,
and mission systems remains outstanding.

### Shared mission-content integration

`game/content/missions/courier-extraction.map` is the single authored 18×11
tile grid consumed by the JavaScript and native C++ missions. `.` is passable
terrain, `#` is an impassable terrain tile, `S`/`R` are squad spawns,
`A`/`B` are sentries, `1`/`2` are recoverable supplies and `X` is extraction.
Each marker must occur exactly once. The mission manifest pins the grid's
SHA-256 digest; `mission-pack.js` validates it before staging `/COURIER.MAP`
in MEMFS. The native core's `loadMap()` validates all dimensions, symbols and
marker uniqueness *before* replacing the active state, and reuses the map
on restart. Browser CI verifies native mission-map loading. The direct-launch
HTML version falls back to the identical built-in terrain when opened via
`file://`, where browser fetch restrictions can prevent local file access.

This is a content-contract stepping stone, **not the final VanillaTD theater
format**. Native production map cells, unit-class definitions, state machines,
and scenario ownership have not been replaced or bypassed in the campaign.

### Native tactical sprite integration

The native Courier scenario now also stages the existing source-verified
six-class wireframe pack. It loads `E1.SHP` and `WIREFRAME.PAL` through the
game's `CCFileClass` search path, draws the infantry base frame with the actual
`CC_Draw_Shape()` routine into an indexed `GraphicBufferClass`, and converts
that verified output into an SDL texture for the two squad members and sentries.
This connects original engine SHP lookup and tactical drawing to moving units
in the playable scenario. On missing/invalid resources it retains the prior
colored markers. Chromium CI asserts the SHP-derived infantry texture loaded.
The entities still use the isolated Courier simulation, not the original
`InfantryClass` movement or `MapClass` cells.

The same bounded tactical drawing adapter now also resolves the original
`T01.SHP` terrain-object frame and paints the authored mission's blocked cells
with its source-rendered texture. Its use for scenery is deliberately visual:
the 18×11 scenario's passability comes from the validated mission grid, not
from the original theater-template or `MapClass` collision rules. Failure to
load either SHP leaves the fallback rendering intact. Chromium CI checks
both sprite classes independently.

### Persistent movement-command seam

Courier now maintains a destination per squad member independently of its
current breadth-first route. The native `assignDestination()` adapter mirrors
the command lifetime of `FootClass::Assign_Destination`/`NavCom`: a new valid
order replaces the prior target, arrival clears it, and a temporarily occupied
next tile triggers replanning without discarding the command. An invalid order
leaves the existing command intact. The standalone JavaScript slice uses the
same behavior, with host C++ and Node regression coverage. This remains a
**Courier-owned adapter**, not a constructed production `FootClass` or a claim
that VanillaTD mission movement is active; binding it to real engine units
requires the production world and house initialization sequence.

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
