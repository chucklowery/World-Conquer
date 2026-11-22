# M1: The stock VanillaTD engine runs in the browser

Read `docs/milestones/AGENT_GUIDE.md` first. This file is self-contained apart
from that guide.

## Goal

The unmodified VanillaTD game loop (`main()` with no `--browser-*` flag)
boots in Chromium. It reaches the main menu, starts a scenario, and renders
the map, sidebar and radar with the engine's own renderer, while staying
responsive to input. The platform layer (loop, display, input, filesystem,
data loading) must be solid enough that M2's original data pack is the only
remaining dependency.

## Current state (verify before relying on it)

- `vanillatd.{html,js,wasm}` builds in CI with `-sASYNCIFY=1`,
  `-sINVOKE_RUN=0`, `-sFORCE_FILESYSTEM=1` and `-sALLOW_MEMORY_GROWTH=1`
  (`tiberiandawn/CMakeLists.txt`).
- Asyncify yields happen in `Call_Back()`, `Frame_Limiter()`
  (`common/framelimit.cpp`) and `ms_sleep`/`us_sleep` (`common/mssleep.h`).
  ADR-0002 in `docs/browser/DECISIONS.md` explains the design.
- `browser/engine/shell.html` → **Launch experimental game** calls
  `Module.callMain([])` after `asset-import.js` has copied user-selected files
  into MEMFS at `/game` (uppercase names; disc folders `gdi`, `nod`,
  `covertops`).
- `tiberiandawn/init.cpp` prints `[browser-game] menu.enter`,
  `menu.choice=N`, `scenario.request=…`, `scenario.loaded=…` and
  `scenario.failed=…`.
- **Not yet proven:** that the stock loop reaches the menu in a browser on
  any data, and that it never blocks the page.

## Why this milestone interleaves with M2

CI must never receive EA data, and no original data exists yet. So the
CI-verifiable gates of M1 depend on M2 deliverables:

- M1-D's menu check needs the **M2-C boot pack**.
- M1-D's scenario check needs the **M2-F scenario** (`WCS01`) with the M2-D/M2-E assets.

Follow the cross-milestone order in `docs/milestones/README.md`. Work packages
M1-A, M1-B, M1-C and M1-E need no game data at all.

---

## M1-A: Asset audit logging and graceful failure (no data needed)

**Why:** M2 needs an exact list of every file the engine asks for, and a run
with missing data must fail visibly rather than hang or crash silently.

Tasks:

1. Add an **asset audit log**, enabled in browser builds and optionally in
   native builds through a CMake option (for example `WC_ASSET_AUDIT`). Log
   one line per lookup outcome:
   - `[asset-hit] <NAME> <source: loose|<MIXNAME>>`
   - `[asset-miss] <NAME>`

   Hook the real lookup points, not callers: the CD/MIX-aware file class
   (`CCFileClass`/`CDFileClass` open and `Is_Available`) and MIX retrieval
   (`MixFileClass::Retrieve`/`Offset` in `common/mixfile.h` and `mixfile.cpp`,
   reached through `MFCD::Retrieve`). Deduplicate repeated hits per name, but
   always log misses.
2. Add a JS collector in `shell.html` that parses those lines from
   stdout/stderr into `window.WCAssetAudit = {hits:[], misses:[]}`, so Chromium
   tests can read them.
3. Make fatal missing-data paths fail **visibly**. Find where startup aborts
   when a required MIX or file is absent (for example `Prog_End`/`exit` paths
   in `init.cpp` and `startup.cpp`). In browser builds, print
   `[browser-game] fatal=<reason>` before exiting, and have `shell.html`
   show it in the status line instead of leaving a frozen canvas.
4. Run the stock engine with an **empty** `/game` in headless Chromium and
   capture the resulting misses and the fatal reason. Save the output (not
   any data) as the first entry in `docs/browser/M1_PLATFORM_AUDIT.md`.

Acceptance:

- With an empty `/game`, a Chromium test sees at least one `[asset-miss]`,
  a `[browser-game] fatal=…` line, the status line showing the error, and
  **no page hang**: a `requestAnimationFrame` heartbeat keeps advancing.
- Native builds compile with the option both off and on.
- A Node unit test covers the log-line parser.

## M1-B: Blocking-loop audit (no data needed)

**Why:** Asyncify only yields at known points. Any loop that waits on input,
fades, timers or movies without passing through `Call_Back()`,
`Frame_Limiter()` or a sleep will freeze the tab.

Tasks:

1. Statically list candidate loops in the stock path: `startup.cpp`,
   `init.cpp` (`Select_Game`, `Main_Menu`, intro and `Play_Movie` paths),
   `conquer.cpp` (`Main_Loop`, `Keyboard_Process`), dialogs (`dialog.cpp`,
   `msgbox.cpp`, `gamedlg.cpp`, `goptions.cpp`, `loaddlg.cpp` and others),
   palette fades (`Fade_Palette_To`), `Delay`/`CountDownTimerClass` waits, and
   VQA movie playback (`common/vqa*.cpp`). Search for `while (`, `for (;;)`,
   `do {`, `Keyboard->Check`, `Get_Key`, `TickCount` and `Delay(` in
   those files.
2. For each loop, record whether it reaches a yield point on every iteration.
   Add a yield (`Call_Back()` or an `#ifdef __EMSCRIPTEN__` `emscripten_sleep(0)`)
   where one is missing. Prefer adding the yield to a shared helper over
   patching many call sites.
3. Movies: with `NETWORKING=OFF` and no movie MIX present, intros should be
   skipped. Confirm `Play_Movie` returns promptly when a movie is missing; if
   it doesn't, make it do so in browser builds.
4. Add a **JS watchdog** in `shell.html`: if the engine runs more than
   ~250 ms without yielding (heartbeat gap), log `[browser-watchdog] stall=<ms>`.
   Tests fail on any stall over 1,000 ms after startup.
5. Record each loop and its resolution in `docs/browser/M1_PLATFORM_AUDIT.md`.

Acceptance:

- The audit table covers every loop found, each with its file:line and
  resolution.
- The existing `--browser-cooperative-probe` CI check still passes.
- The watchdog is unit-tested (simulate a long task in a test page).

## M1-C: Original data pack loader (no data needed to build it)

**Why:** players will not import files. The browser must fetch the
CI-built data pack (M2-B) and mount it before `main()` runs.

Tasks:

1. Define the pack manifest format (agree it with M2-B; M2-B owns the
   producer): `data/pack.json` = `{schema:1, packVersion, files:[{path, bytes,
   sha256}]}`, where `path` is relative to `/game` and uppercase.
2. Add `browser/engine/pack-loader.js`. It fetches the manifest and then each
   file, verifies its size and SHA-256 (Web Crypto), writes it into MEMFS under
   `/game`, and reports progress to the page. A failed hash is fatal; show
   which file failed.
3. In `shell.html`, the stock engine panel gets a **Play** button. It loads
   the pack when present, otherwise it falls back to the existing local import
   path. Keep the local import, which is needed for the owner's licensed-data
   check (M1-F).
4. Cache the pack with the Cache API keyed by `packVersion`, so a reload does
   not download it again. Wrap every storage call in try/catch, and make
   loading work without the cache.
5. Persist `/game/user` (settings; saves come later) with IDBFS
   (`FS.syncfs`) or OPFS. Sync after the engine writes settings, and on
   `visibilitychange`.

Acceptance:

- Node tests cover manifest validation, hash mismatch, a missing file, and
  path traversal rejection (`..`, absolute paths, lowercase or illegal names).
- A Chromium test with a **synthetic** pack (a few dummy files generated in
  the test) sees them mounted at `/game` before `callMain`.
- The local import path still works (existing tests pass).

## M1-D: Display, input and the stock-engine smoke test

**Needs:** M1-A, M1-C, and the **M2-C boot pack** for the menu check. Needs
the **M2-F scenario** (`WCS01`) for the scenario check.

Tasks:

1. **Display:** find how the engine sizes its SDL window and back buffer
   (`common/` SDL video code and `Settings` resolution). Make the canvas scale
   to the available panel with correct aspect ratio and integer or nearest
   scaling (no blur: `image-rendering: pixelated`), and support HiDPI. Map
   mouse coordinates correctly at every scale; verify against the SDL
   Emscripten mouse mapping.
2. **Input:** suppress the browser context menu on the canvas (TD uses right
   click). Prevent page scroll on arrow keys and space while the canvas has
   focus. Keep focus on click. Pause or mute on `blur`/`visibilitychange` if
   the engine supports it. Implement edge scrolling when the pointer is near
   the canvas edge; use pointer lock only behind an explicit user toggle.
3. **Stock-engine smoke test:** add `browser/engine/check-stock-engine.js`.
   Run it as a **separate CI job named `stock-engine`** in
   `.github/workflows/browser-engine.yml`, staging the M2 pack artifact. It:
   - loads the page, mounts the pack and clicks **Play**;
   - waits for `[browser-game] menu.enter` and asserts the canvas screenshot
     is not blank and differs from the pre-launch frame;
   - drives the menu with real mouse clicks (or the engine's keyboard
     shortcuts) to start the M2 scenario, then waits for `scenario.loaded=`;
   - inside the scenario: screenshots before and after scrolling the map,
     selects a unit, orders a move, and asserts the frame changes;
   - fails on any page error, any `[browser-watchdog] stall` over 1,000 ms,
     any `[browser-game] fatal=`, or any `[asset-miss]` for a file listed as
     required in M2's `requirements.json`;
   - uploads screenshots and the audit log as artifacts.
4. Once green, update `docs/ROADMAP.md` M0 ("stock-engine headless smoke
   test") and note in the workflow that `stock-engine` is the primary
   browser check. Do not change repository branch protection.

Acceptance: the M1 exit gate below, on CI.

## M1-E: Performance baselines (no data needed for setup)

Tasks:

1. Measure: WASM and JS size (raw and gzip), time from navigation to
   `menu.enter`, frame-time p50/p95 over 60 s of scenario play, and
   `HEAPU8.length` growth over 5 minutes. Reuse the measurement approach of
   `scripts/summarize-r20-metrics.js` where it helps.
2. Emit `stock-engine-metrics.json` from `check-stock-engine.js` and record
   the first values in `docs/browser/M1_PLATFORM_AUDIT.md`. **Do not
   enforce budgets**; budgets are M4.
3. Evaluate a Release (`-O2`/`-Os`) browser build next to Debug. Report sizes
   and whether Asyncify still works; do not switch CI to it yet.

## M1-F: Owner-only licensed-data parity check (a human runs this)

The agent **prepares** this but must never run it in CI or with any data it
holds.

Tasks:

1. Write `docs/browser/M1_OWNER_CHECK.md`, a step-by-step checklist for the
   repository owner. Build or download the WASM artifact, serve it locally,
   use **Choose folder** with a legally owned TD installation, click
   **Launch**, reach the menu, start mission 1, and play 2 minutes:
   select, move, build and harvest. Then record the evidence line.
2. Include what to capture: browser version, commit SHA, the audit log's
   miss list (file names only), and screenshots that do not show EA art
   publicly, or kept private.

This check separates platform bugs from data bugs. It is recommended but
not required for the M1 exit gate.

---

## M1 exit gate

On a CI run of `vanilla`, the `stock-engine` job passes using the **original
data pack**. In Chromium, the unmodified `main()`:

1. reaches the main menu;
2. starts the M2 scenario;
3. renders map, sidebar and radar via the engine renderer;
4. responds to selection, move and map scroll;
5. has zero page errors, zero stalls over 1 s, and zero required-asset misses.

The baseline metrics file is published. Add the evidence line to
`docs/ROADMAP.md` under M1 and tick the M1 checkboxes.

## Out of scope for M1

Audio (M4), saves (M4), Asyncify removal, mobile/touch, multiplayer, and any
change to the frozen legacy demos beyond keeping their tests green.
