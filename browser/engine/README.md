# VanillaTD browser runtime bootstrap

This launcher is compiled into the **real VanillaTD** HTML/JS/WASM bundle, not the independent SDL2 smoke test. It deliberately defers game main() until the user starts it.

## Try it

Build the engine with Emscripten per docs/browser/BUILD.md, then serve build/browser-engine over HTTP and open vanillatd.html.

- Wait for the page's **Runtime ready** status.
- Click **Run engine SDL2 probe**. Expect an animated rectangle, mouse click toggling its color, and keydown logs. This probe exercises SDL2 **inside the engine binary** but does not load game state.
- Reload the page to switch modes.
- Optionally select legally acquired game files or a folder. The browser stages files locally under /game in MEMFS without uploading them. **Launch experimental game** calls the unmodified synchronous game main(); it may freeze or fail and is not playable yet.

Files are memory-only and lost on refresh. No copyrighted EA media is included in the project or CI artifacts.

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
