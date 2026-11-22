# M1 owner verification (local legally owned data only)

**Never commit, push, publish, or upload proprietary game files, screenshots,
filenames with paths revealing private data, or extracted content.**

## Prerequisites

- Build the browser engine with pinned Emscripten SDK 3.1.68 and stage the
  checked-in browser scripts as described in [BUILD.md](BUILD.md).
- Serve `build/browser-engine` using
  `python3 -m http.server 8080 --directory build/browser-engine`.
- Use a desktop Chromium browser and a legally owned, locally installed copy
  of a compatible game. These files remain exclusively in your browser.

## Checklist

- [ ] Record Chromium version and operating system.
- [ ] Record full commit SHA and whether the generated original boot pack
      reached `[browser-game] menu.enter` using **Play**.
- [ ] Reload `http://localhost:8080/vanillatd.html`.
- [ ] Select **Choose folder** and choose the local installation folder.
- [ ] Check the staging summary. Use **Launch experimental game**, not a
      `--browser-*` diagnostic.
- [ ] Reach the stock main menu.
- [ ] Start mission 1 using legally owned local data, then play for 2 minutes.
- [ ] Record whether input, map rendering and menu choices remain responsive.
- [ ] Record asset-miss *filenames only*, fatal messages (redact user paths),
      and the largest `window.WCWatchdog.maxStallMs` value.
- [ ] Verify no proprietary screenshots or files were added to Git or CI.

## Evidence template

| Field | Observation |
| --- | --- |
| Commit SHA | |
| Chromium version | |
| OS | |
| Stock main menu reached | |
| Mission 1 started | |
| Two minutes played | |
| Largest stall in ms | |
| Missing filenames only | |
| Known blockers | |

This manual owner check is not a substitute for the original-data CI gate,
which must separately pass without external data.
