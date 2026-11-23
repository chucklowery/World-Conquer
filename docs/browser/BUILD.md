# Build, Run and Verify

The R02 four-production-unit navigation diagnostic is launched from the
browser engine as **Play R02: four production-unit orders**. The real WASM
build and Chromium acceptance are part of `.github/workflows/browser-engine.yml`.
See [R02_UNIT_ORDERS.md](R02_UNIT_ORDERS.md) for controls, host tests and
the measured bounded A* search budget.

Native and Emscripten builds compile in CI. Operation Courier Extraction is
now a browser-playable original-content native tactical alpha; the historical
campaign game loop and external game-data startup remain experimental.

## Native engine baseline (Linux/WSL2)

Requires CMake 3.25+, Ninja, C++ compiler, SDL2 and OpenAL.

~~~bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build libsdl2-dev libopenal-dev git

cmake -S . -B build/native -G Ninja -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF -DNETWORKING=OFF -DSDL2=ON -DOPENAL=ON
cmake --build build/native --target VanillaTD
~~~

Use compatible legally acquired game data as directed by upstream README; do not commit game files.

## Independent SDL2 WebAssembly smoke test

Install and activate Emscripten SDK: https://emscripten.org/docs/getting_started/downloads.html

~~~bash
em++ --version
bash browser/smoke/build.sh
python3 -m http.server 8080 --directory browser/smoke/dist
~~~

Open http://localhost:8080/index.html. Expected output:

~~~text
browser/smoke/dist/index.html
browser/smoke/dist/index.js
browser/smoke/dist/index.wasm
~~~

Acceptance: rectangle animates; mouse click changes color; keyboard logging visible in developer console; no failed JS/WASM requests. This is NOT the actual VanillaTD engine.

## VanillaTD Emscripten build (native Tactical Alpha 0.1)

The R04 map pack contains three choices at launch. Before publishing or
building new map content, run `node browser/engine/validate-maps.js` and the
native/Node parser tests in [R04 format](R04_MAP_FORMAT.md). The browser CI
stages every `.map` file and runs native WASM map-selection, movement, minimap
and restart checks for both v2 examples while preserving Courier regression
coverage. Do not stage unverified or unlicensed theater data.

The browser build includes the **playable Operation Courier Extraction alpha**,
powered by live VanillaTD infantry movement and a bounded original-content
combat/mission layer. It is not yet a historical VanillaTD campaign build.
Requires Emscripten SDK 3.1.68 and Ninja.

~~~bash
# From the project root, after sourcing emsdk_env.sh:
emcmake cmake -S . -B build/browser-engine -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF \
  -DBUILD_REMASTERTD=OFF -DBUILD_REMASTERRA=OFF \
  -DNETWORKING=OFF -DOPENAL=OFF -DSDL2=ON \
  -DBUILD_TOOLS=OFF -DBUILD_TESTS=OFF
cmake --build build/browser-engine --target VanillaTD --parallel 2
~~~

Output (verified in engine CI): `build/browser-engine/vanillatd.html`, `vanillatd.js`, `vanillatd.wasm`. A linked game is not proof of a browser-friendly event loop or playable mission.

The Chromium CI gameplay suite verifies the native alpha's movement, crate
recovery, extraction, restart, and combat order. For a clean static hosting
package with `index.html`, runtime scripts, WebAssembly and original assets,
run `node browser/engine/package-alpha.js build/browser-engine build/tactical-alpha-site`
after the asset-staging steps in the engine workflow. The publication workflow
uses GitHub's official Pages artifact deployment, and repository settings must
select **GitHub Actions** as the Pages source before the public URL becomes active. See
[`browser/engine/README.md`](../../browser/engine/README.md#github-pages-publication).

The gameplay launcher now transitions to a full-viewport tactical HUD with an
aspect-correct battlefield, responsive minimap and sidebar. Build cards are
clearly labeled as previews, not functional construction. The native browser
test verifies the HUD layout at both desktop and compact viewport sizes.

R01 adds viewport-scaled zoom/pan and a visible minimap camera rectangle, drag
selection, Shift-add, browser-local groups, contextual native move/attack, and
touch-friendly camera/order buttons. **Shift+1–9** stores groups (without
intercepting browser Ctrl+digit tab shortcuts), **1–9** recalls, **M/A** selects
target mode, arrows aim and **Enter** orders, **S** stops, **C** centers, **+/-**
zooms, and **R** restarts. Minimap clicks pan the camera, never a unit. See
[`R01_INPUT_UX.md`](R01_INPUT_UX.md) for the UX and keyboard-only guide. CI now
runs `test-rts-camera.js` and Chromium `check-r01-ui.js` for multiple viewport
shapes before the full native `check-runtime.js` mission play-through.
R03 adds deterministic C++ weapon/armor data, typed shot/hit/damage/death
events and an opt-in armored-sentry native defeat drill. The normal Courier
extraction balance remains intact. See
[`R03_COMBAT_WEAPONS.md`](R03_COMBAT_WEAPONS.md) for faction data extension,
host commands and WebAssembly/Chromium acceptance evidence.

[Engine WASM compile CI](../../.github/workflows/browser-engine.yml) runs the same command and uploads the browser bundle **only when build succeeds**. CI build errors are evidence for targeted platform fixes, not a reason to weaken native targets or upload game data.

## Browser runtime bootstrap (P2a; experimental)

~~~bash
# After the engine WebAssembly build above:
python3 -m http.server 8080 --directory build/browser-engine
~~~

Open http://localhost:8080/vanillatd.html in desktop Chrome or Edge.

- Wait for the real VanillaTD WASM runtime to show **Runtime ready**; game main() is deferred.
- Press **Run engine SDL2 probe**. Check the moving rectangle, mouse color change and keyboard input log. This diagnostic callback is in the **actual engine executable**, but it does not initialize Tiberian Dawn game state.
- Reload and select **Test cooperative C++ loop** to verify Asyncify with a synchronous C++ while loop, SDL2 animation/input and a responsive JavaScript timer in CI. Reload again to switch modes. Select legally acquired game files or a folder; they are copied to browser-only MEMFS at /game in uppercase names, without uploading.
- **Launch experimental game** invokes the original synchronous game main() and may freeze the page. Asset loading and interactive menus are not yet verified. Use a disposable tab.

The runtime probe and experimental game are mutually exclusive per page load. Selected data does not persist across refresh. Never put game media into CI, Git or public bug reports.

Capture the browser version, commit, screenshot, console errors and responsive input evidence before marking P2a verified.

## Verify and record

Every build/run result must capture commit SHA, OS, compiler version, exact command, browser and observed result. Private user game assets never belong in CI or public artifacts.

Useful references:
- https://emscripten.org/docs/compiling/Building-Projects.html
- https://emscripten.org/docs/api_reference/emscripten.h.html
- https://github.com/TheAssemblyArmada/Vanilla-Conquer

## Actual game data, menu and first GDI mission (P3-P4: experimental)

Use a legally acquired Tiberian Dawn installation and the GDI disc files
(if supplied in a separate directory). Serve the engine HTML over localhost.

1. Select the installed game folder containing CONQUER.MIX and either
   CCLOCAL.MIX or LOCAL.MIX. If GENERAL.MIX came from a GDI CD, select
   a folder containing a gdi/ subdirectory: the importer preserves the
   native engine's lowercase /game/gdi folder and uppercases filenames.
2. Wait for Core filenames found. This is only a nonempty-file preflight,
   not MIX archive parsing, scenario compatibility or content validation.
3. Click Verify native engine file lookup. This runs the original
   CCFileClass/CDFileClass path search in the actual compiled engine;
   it prints CONQUER.MIX, fonts, GENERAL.MIX and optional SCG01EA.INI.
   Reload and reselect files afterward to launch game mode.
4. Click Launch experimental game -> New Game -> GDI and watch
   [browser-game] menu.enter, menu.choice, scenario.request and
   scenario.loaded in the in-page log. The first GDI scenario normally
   uses an SCG01... root. Log exactly where startup stops or fails.
5. Do not upload the files, screenshots exposing licensed game assets,
   or media archives to CI, Git, issue attachments or public reports.

The automated tests use small synthetic placeholder files ONLY. They
validate path mapping and native engine file lookup, not functional MIX
archives, the actual menu or campaign gameplay. If real assets cannot
be provided privately in a local browser, real-game acceptance stays
open. The importer caps each file at 512 MiB and each selection at 1 GiB.

## M1: Original boot-pack build and stock-engine launcher (in development)

M1 uses the historical VanillaTD `main()` without browser-mode flags; the
legacy tactical demos remain frozen. The generated pack contains only original
CC0 placeholder media; no commercial game assets are required by CI.

After installing and activating emsdk **3.1.68**, build VanillaTD with the
Emscripten command above. For placeholder archive generation, configure the
native MIX tool separately:

```bash
cmake -S . -B build/native -G Ninja \\
  -DBUILD_VANILLATD=OFF -DBUILD_VANILLARA=OFF \\
  -DOPENAL=OFF -DSDL2=OFF -DNETWORKING=OFF -DBUILD_TOOLS=ON
cmake --build build/native --target vanillamix --parallel 2
node tools/content/test-boot-pack.js
node tools/content/boot-pack.js build build/browser-engine/data
cp game/content/pack/boot-requirements.json build/browser-engine/data/boot-requirements.json
cp browser/engine/asset-audit.js browser/engine/pack-loader.js browser/engine/asset-import.js build/browser-engine/
python3 -m http.server 8080 --directory build/browser-engine
```

Open `http://localhost:8080/vanillatd.html` and click **Play (original boot
pack)**. The pack loader checks each file's size and SHA-256 before writing it
to MEMFS. Missing/invalid packs fail visibly; users with legally owned files
can still use **Choose folder** and **Launch experimental game**. Settings
under `/game/user` use IDBFS when browser storage is available.

Acceptance is `node browser/engine/check-stock-engine.js`: actual
`[browser-game] menu.enter`, real renderer, responsive mouse/keyboard at
three sizes and max stall 1,000 ms after startup. A successful build alone
is **not** acceptance. The separate `stock-engine` CI job uploads screenshots,
audit logs and metrics. Its result determines M1's status.

## M2: Original data pack and a playable skirmish

M2 replaces the boot pack with the full original data pack
(`tools/content/pack.js`, documented in
[`M2_DATA_PACK.md`](M2_DATA_PACK.md)). After building the engine and the
native `vanillamix` tool as above:

```bash
node tools/content/pack.js build build/browser-engine/data
cp game/content/pack/boot-requirements.json build/browser-engine/data/boot-requirements.json
```

Stage the runtime scripts exactly as the `wasm-vanillatd` job's "Verify
compiled WebAssembly bundle" step does, then serve `build/browser-engine`.
Click **Play**, choose **Multiplayer → Skirmish**, pick *Foundry Test Range*
and **OK**: the unmodified engine starts a match on original data.

Acceptance is `node browser/engine/check-stock-scenario.js` (CI job
`stock-scenario`, strict). With real input only it starts the skirmish,
checks the battlefield is drawn, deploys the MCV, builds a power plant,
refinery, barracks and vehicle factory, waits for a harvester delivery,
trains infantry and a vehicle, gives orders, scrolls with the keyboard and
the screen edge, and runs 2 minutes. It fails on any required or
unclassified missing file, page error, engine fatal or stall over 1 s, and
writes `stock-scenario-metrics.json`, `stock-scenario-audit.json`, the full
engine log and screenshots. Set `STOCK_SCENARIO_SKIP_GAMEPLAY=1` to stop
after the deploy and sidebar checks.

If GitHub archive downloads are blocked locally, the SDL2 Emscripten port
cannot download: clone `https://github.com/libsdl-org/SDL.git` at
`release-2.28.4` and build with `EMCC_LOCAL_PORTS="sdl2=<that dir>"`.

