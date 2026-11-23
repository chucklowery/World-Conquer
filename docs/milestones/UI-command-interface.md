# UI: Command interface in the late-90s "command bar" style (six-session plan)

Read `docs/milestones/AGENT_GUIDE.md` first. Apart from that guide, this file
has everything a session needs. It sets the visual design of World-Conquer's
user interface and splits the work into **six sessions, UI-A to UI-F**. Each
session gets its own branch and PR, and each PR is reviewed and merged
before the next session starts.

You are doing **one session only**: the one named in your prompt.

## Goal

Give the stock VanillaTD engine's own interface (sidebar, radar, tabs, power
bar, cursors, selection, menus and dialogs) an original look and feel modeled
on the **conventions of *Command & Conquer: Tiberian Sun* (1999)**. That
means a heavy, industrial command bar down the right edge, an armored radar
housing, a vertical power gauge, two columns of build icons with a sweeping
build clock, terse status text, and faction-tinted metal.

"Designed after" means **layout, information hierarchy and mood**. It does
**not** mean copying. Every pixel, glyph, color ramp, string and sound is
original and generated or authored in this repository.

## Hard rules for this plan (in addition to AGENT_GUIDE.md section 2)

1. **Work from the written brief below, not from reference images.** Do not
   download, view, trace, sample colors from or describe the contents of
   Tiberian Sun screenshots, sprites, palettes, fonts, videos or audio. Do not
   ask the owner to supply them. The brief is the reference.
2. **No trademarks in shipped content.** Never use "Tiberian Sun",
   "Command & Conquer", "Westwood", "EVA", "GDI", "Nod" or "Tiberium" in
   player-visible strings, file metadata or art. The announcer is called
   **COMMS**. The factions are **Aster Expedition** and **Forge Compact**
   (see `docs/browser/R05_ORIGINAL_FACTIONS.md`).
3. **The engine draws the UI.** The interface is delivered as engine assets
   (SHP, PAL, FNT, CPS, strings) that `SidebarClass`, `RadarClass`,
   `TabClass`, `PowerClass`, `MouseClass`, `HelpClass` and the dialog code
   already load. A JavaScript, HTML or React overlay of the game UI is a
   roadmap **non-goal**. The browser shell outside the canvas may be styled
   to match, and nothing more.
4. **Respect the engine's slot contracts.** Every file keeps the engine's
   name, frame count, frame size and palette indices. Verify each contract
   from the code that loads and draws it, cite `file:line` in the spec, and
   never guess.
5. **Layout changes are engine changes.** Sessions UI-A to UI-E change
   **only art, fonts, palettes and strings**. Moving or resizing anything
   (for example a taller command bar or more icon rows) is UI-F only, behind
   a named compile-time macro, and needs the owner's written go-ahead first.
6. **Generated binaries are never committed.** Commit generators
   (`tools/content/ui/*.js`), their SVG/JSON sources, tests and docs. CI
   builds the pack.

## Design brief (the reference for every session)

### Mood

Late-90s near-future military hardware: worn gunmetal, riveted plates, bevels
cut at 45°, recessed screens with a faint scanline glow, cable runs and
hazard striping used sparingly. It should feel like a field command console
bolted onto a vehicle, not a clean modern app. Density beats whitespace.
Each panel looks physically mounted.

### Screen layout (engine coordinates, 640×400 hi-res)

```
+--------------------------------------------------+----------------+
| [OPTIONS tab]                         [ 01250 ]  |  credits tab   |
+--------------------------------------------------+----------------+
|                                                  | +------------+ |
|                                                  | |   RADAR    | |
|                  TACTICAL VIEW                   | |  (armored  | |
|                                                  | |  housing)  | |
|                                                  | +------------+ |
|                                                  | [REP][SELL][MAP]|
|                                                  |P| [ic] | [ic]  |
|  COMMS: "Construction complete."                 |W| [ic] | [ic]  |
|                                                  |R| [ic] | [ic]  |
|                                                  | | [ic] | [ic]  |
|                                                  | [ ^ ][ v ]     |
+--------------------------------------------------+----------------+
```

The engine already uses this structure: tabs on top, radar top-right,
three command buttons, a power bar beside two four-row icon columns and
scroll arrows. UI-A to UI-E restyle it in place. UI-F may extend it.

### Components and their cues

| Component | Cues to follow |
| --- | --- |
| **Command bar frame** (`SIDE1.SHP`, `SIDE2.SHP`) | Thick dark-steel plates with lighter bevel highlights on the upper-left edges and shadows on the lower-right. Bolt heads at the corners. A recessed channel behind the icon columns. A faction-tinted trim stripe. |
| **Top tabs** (`TABS.SHP`) | Angular tabs with chamfered ends. Left tab reads OPTIONS. The right tab holds the credit counter in an inset readout. |
| **Credit readout** (`LED.FNT` or the font the tab uses; verify) | Segmented or LED-style digits in a high-contrast amber or green on near-black. The engine's counting-up and down animation stays as is. |
| **Radar** (radar frame art, `HRADAR`/radar shapes; verify names) | A heavy bezel with shutters or an iris that the engine's activation animation opens. When offline, a dark glass panel with faint static. When online, a glowing border in the faction tint. |
| **Command buttons** (`REPAIR.SHP`, `SELL.SHP`, `MAP.SHP`) | Square push-buttons with pictograms (wrench, currency mark, map grid). The pressed and active frames are visibly sunk and lit. No words, so they work in any language. |
| **Power bar** (`POWER.SHP`/`HPOWER.SHP`, `PWRBAR.SHP`) | A tall vertical gauge in a slot. Segments run green to yellow to red. The drain indicator is a clear notched pointer. A low-power state must read at a glance. |
| **Build icons / cameos** (per-object `*ICON.SHP`, 32×24 base; verify) | Three-quarter studio renders of the unit or structure on a dark, faction-tinted backdrop with a thin bevel frame. Readable at 1×. One silhouette per icon, no text. |
| **Build clock** (`CLOCK.SHP`) | A translucent dark radial sweep over the icon. It must not hide the silhouette. |
| **Icon status text** | Short uppercase labels drawn by the engine (READY, ON HOLD and similar; verify which `TXT_*` exist) in a small, bold, high-contrast font. |
| **Strip scroll arrows** (`STRIPUP.SHP`, `STRIPDN.SHP`) | Chunky chevron buttons that match the command buttons. |
| **Strip logo / filler** (`STRIP.SHP`) | Faction crest panels or plain plating behind empty slots, never blank black. |
| **Cursors** (`MOUSE.SHP`) | Thin, bright, high-contrast vector cursors with a dark outline: a select arrow, a move reticle, a no-move cross, an attack crosshair that pulses, deploy, enter, sell, repair, and eight edge-scroll chevrons, with "can't scroll" variants. Every frame and hotspot must match the engine's cursor table. |
| **Selection and health** (selection-box and pip art; verify names, e.g. `SELECT.SHP`, `PIPS.SHP`) | Corner brackets rather than full boxes. A segmented health bar above the object that runs green, yellow, red. Cargo or ore pips are small squares. |
| **Placement grid** (`TRANS.ICN` or the engine's placement art; verify) | Hatched cells, green for allowed and red for blocked. |
| **Tooltips and messages** (`HelpClass`, `MessageListClass`, fonts `6POINT.FNT`, `GRAD6FNT.FNT`, `8FAT.FNT`) | Tooltips are a dark plate with a 1-px faction-tint border. COMMS messages appear at the top-left in a clean, slightly condensed font with a soft drop shadow. |
| **Menus and dialogs** (`BTEXTURE.SHP`, `OPTIONS.SHP`, `BTN-UP*.SHP`, `BTN-DN*.SHP`, title CPS) | The same metal language: framed plates, inset list boxes, chunky buttons. A title screen with original key art or a clean wordmark that reads "World-Conquer". |

### Faction identity

| Faction | Metal | Trim and glow | Readout color |
| --- | --- | --- | --- |
| Aster Expedition | Cool blue-grey steel | Teal (remap range `6–9`) | Cyan-white |
| Forge Compact | Dark warm iron, near black | Rust/amber (remap range `10–13`) | Amber |

The engine loads one sidebar art set, not one per house. UI-A to UI-E
therefore ship **one neutral command bar** (neutral steel, with trim drawn
from palette indices UI-A reserves). Per-faction skins come in UI-F.

### Palette and legibility

- Reserve and document palette ramps for UI steel (about 6 shades), the
  glow/trim accent, the power gauge (green, yellow, red), and text
  (white, light grey, amber). The ramps must not collide with house remap
  ranges, terrain or resource colors, or palette-cycling ranges. Verify the
  cycling ranges in the engine before you choose.
- Text and readouts need contrast of at least 4.5:1 against their plate.
  Check this with a script.
- The power, health and placement states must stay distinct under
  deuteranopia and protanopia simulation, through value and shape, not hue
  alone.

## Sessions

| Session | Branch / PR title | Entry condition | Session gate (must pass on the PR head) |
| --- | --- | --- | --- |
| **UI-A** | `ui-a/design-spec` / `UI-A: command interface design spec and slot contracts` | M1 merged (can run in parallel with M2) | `docs/browser/UI_SPEC.md` lists every UI slot with its engine name, loader `file:line`, frame count, frame size, palette indices and the use of each frame. A reserved-palette table passes a collision and contrast test. SVG mockups of the in-match screen and the main menu are generated by `tools/content/ui/mockups.js`, and `node tools/content/ui/test-ui-spec.js` passes. No engine or pack changes. |
| **UI-B** | `ui-b/command-bar-chrome` / `UI-B: command bar, tabs, radar housing and power gauge` | UI-A merged; M2c merged (a match runs on original data) | The generated frame, tabs, radar housing, buttons, power gauge and strip arrows replace the M2 placeholders. In the `stock-scenario` run there are zero `[asset-miss]` for UI files. Screenshots at 1100 px are uploaded. A pixel-probe test confirms chrome colors at the spec's coordinates, and clicks on REPAIR, SELL and MAP toggle the engine's modes (logged). |
| **UI-C** | `ui-c/build-strip-text` / `UI-C: build icons, build clock, fonts, tooltips and COMMS text` | UI-B merged | Every buildable object in the M2 roster has a generated icon. The clock sweep is visible in a mid-build screenshot. The generated fonts cover every glyph the strings table uses (tested). A tooltip appears on hover and a COMMS message on structure completion, both seen in screenshots. |
| **UI-D** | `ui-d/cursors-selection` / `UI-D: cursors, selection brackets, health pips and placement grid` | UI-C merged | `MOUSE.SHP` matches the engine's cursor table frame for frame, with hotspots tested. Screenshots show a select, move, attack and no-move cursor, the selection brackets with a health bar, and a green and a red placement grid. |
| **UI-E** | `ui-e/front-end` / `UI-E: title, menus and dialogs` | UI-D merged | The title screen, main menu, options, load/save and skirmish setup dialogs are restyled. `check-stock-engine.js` is still green and its screenshots show the new look. No placeholder dialog art remains on the menu → skirmish path. |
| **UI-F** | `ui-f/tall-command-bar` / `UI-F: tall command bar and faction skins` | UI-E merged **and** the owner's written approval in the PR or issue | Behind `WC_COMMAND_BAR_TALL` (default OFF on native): wider and taller resolutions get a full-height command bar with more icon rows, and the sidebar art switches with the player's house. Native builds are green with the macro OFF and ON. Screenshots for both factions. |

Sessions run strictly in order. UI-A is the only one that can start before
M2 is finished.

## Session contract

1. **One branch and one PR per session**, from the latest `vanilla`, named
   as in the table. Open a draft PR after the first phase and push after
   every phase.
2. **Shared log:** UI-A creates `docs/browser/UI_SESSION_LOG.md`. Each
   session adds `## Session UI-<X>` and, after every phase, records the
   status, commit SHA, commands and results, CI links and open issues. If
   you resume, read the log and the PR first.
3. **Commit at every phase boundary** (`UI-<X> phase <n>: <summary>`). Keep
   `stock-engine` (and, from UI-B on, `stock-scenario`) green on every
   commit.
4. **Do not stop between phases to ask.** Use the defaults here. Stop only
   for the AGENT_GUIDE "Stop and ask" cases, a **STOP** below, or a slot
   contract you cannot verify from code (record it and skip that slot).
5. **Evidence:** every visual claim needs a CI-uploaded screenshot, and every
   behavior claim needs a log line (`[browser-input]`, `[browser-event]`,
   `[asset-hit]`) that a test asserts.

## Phases per session

Each phase has a soft time budget. At about twice the budget, apply the
fallback, log it and move on.

### UI-A: design spec and slot contracts (about 5–7 h)

0. **Setup (30 min).** Build, run `stock-engine`, create the session log.
1. **Slot inventory (2–3 h).** Grep every `Retrieve(`, `Hires_Retrieve(`,
   `Load_Alloc_Data(`, `CCFileClass(` and `Load_Title_Screen(` that loads UI
   art or fonts in `tiberiandawn/` (start with `sidebar.cpp`, `radar.cpp`,
   `power.cpp`, `tab.cpp`, `mouse.cpp`, `init.cpp`, `dialog.cpp`,
   `goptions.cpp`, `help.cpp`, `msglist.cpp`). For each, record the frames
   used and their meaning by reading the draw calls. Cross-check against
   `game/content/pack/boot-requirements.json` and the M2 requirements.
   *Fallback:* mark unresolved frames as `unverified` with the open question.
2. **Palette reservation (1–2 h).** Choose UI ramps under the brief's rules.
   Write `tools/content/ui/palette.json` and a test that checks for
   collisions (remap, cycling, terrain) and for contrast and color-vision
   separation.
3. **Mockups (1–2 h).** `tools/content/ui/mockups.js` renders deterministic
   SVGs of the in-match screen (both faction tints) and the main menu, at
   engine resolution and 2× preview, from the spec's coordinates. These
   SVGs are the source the later sessions' generators reuse.
4. **Close-out (30 min).** `UI_SPEC.md`, the log handoff, PR ready.

### UI-B: command bar chrome (about 6–8 h)

0. **Setup.** Confirm that M2c's `stock-scenario` reaches the battlefield.
1. **Generator scaffold.** `tools/content/ui/chrome.js` turns the spec's
   SVG primitives (plates, bevels, bolts, trim) into palette-indexed frames
   through the existing `encode-shape.js`, and wires them into `pack.js`.
2. **Frame, tabs and strip.** `SIDE1`, `SIDE2`, `TABS`, `STRIP`,
   `STRIPUP` and `STRIPDN`, plus the credit readout font if UI-A assigned it
   here.
3. **Radar housing and buttons.** Radar frames, including every frame of the
   activation animation, and `REPAIR`, `SELL` and `MAP` with their up,
   down and active frames.
4. **Power gauge.** `POWER`/`HPOWER` and `PWRBAR` (normal, low and
   critical).
5. **Tests and evidence.** Pixel probes, button-mode clicks, zero UI misses,
   and screenshots.

### UI-C: build strip, text and messages (about 6–8 h)

1. **Icon generator.** `tools/content/ui/icons.js` renders 3/4-view icons
   from the R05 SVG masters, or from wireframes where R05 has no art, onto
   the faction backdrop. It covers every buildable in the M2 roster.
2. **Clock and status text.** `CLOCK.SHP` and verification of the status
   strings in `boot-pack.js` `originalText()`.
3. **Fonts.** Restyle the fonts the brief lists through `encode-font.js`,
   with a test that every character used by the strings table has a glyph.
4. **Tooltips and COMMS.** Make sure help text and messages render. Rewrite
   any player-visible message strings in the COMMS voice (short, clipped,
   original).
5. **Tests and evidence.** A mid-build screenshot, a hover tooltip and a
   completion message.

### UI-D: cursors, selection and placement (about 5–7 h)

1. **Cursor table.** Read the engine's mouse-control table (`mouse.cpp`,
   `MouseClass` and the `MOUSE_*` enum) and record the start frame, count,
   rate and hotspot of every cursor in the spec.
2. **`MOUSE.SHP` generator.** One vector source per cursor and animated
   frames as the table requires. A test compares the frame count and hotspot
   centers with the table.
3. **Selection, health and pips.** Brackets, the health bar and cargo pips,
   with the art names and frame meanings verified from the draw code.
4. **Placement grid.** Allowed and blocked cells.
5. **Evidence.** Scripted hover and drag over a friendly unit, open ground,
   an enemy and blocked terrain, with screenshots of each state.

### UI-E: front end (about 5–7 h)

1. **Title and key art.** An original title CPS/PCX, in the palette, with the
   "World-Conquer" wordmark.
2. **Dialog kit.** `BTEXTURE`, `OPTIONS`, `BTN-UP`/`BTN-DN` (both sizes)
   and any other dialog art found in UI-A.
3. **Menus pass.** Walk main menu → skirmish setup → in-game options →
   load/save in Chromium, and fix anything still on placeholder art.
4. **Browser shell.** Style `shell.html` around the canvas (frame,
   background, loading screen) in the same language. The shell must not
   draw any game UI.
5. **Evidence.** Updated `stock-engine` screenshots and a check that
   `stock-engine` is green.

### UI-F: tall command bar and faction skins (about 6–8 h, approval required)

**STOP** before Phase 1 unless the owner's approval is recorded.

1. **Design note.** A short ADR in `docs/browser/DECISIONS.md` that covers
   which constants in `sidebar.h`, `radar.h`, `power.h` and `tab.h` become
   runtime values, how the playfield width is derived, and save-game and
   multiplayer impact (none allowed).
2. **Runtime layout.** Under `WC_COMMAND_BAR_TALL`: the sidebar height and
   `MAX_VISIBLE` rows are derived from the screen height, and the power bar
   and arrows are positioned to match. Off by default on native builds.
3. **Faction skins.** Load `SIDE1.<faction>` (or a suffixed variant UI-A
   proposed) by player house, falling back to the neutral set.
4. **Evidence.** Screenshots at two resolutions for each faction, native
   builds green with the macro ON and OFF, and `stock-scenario` green.

## Reviewing a UI PR (owner checklist)

1. **Look at the screenshots.** Does it read as a heavy, right-hand command
   console? Are the power, build state and selection legible at 1×?
2. Look for trademarks or reference material in the diff, strings or SVG
   metadata (`git grep -iE "tiberian|westwood|\bEVA\b|\bGDI\b|\bNod\b"`).
3. Check that every replaced slot cites `file:line` in `UI_SPEC.md`, and that
   no binaries are committed.
4. Confirm UI-A to UI-E contain no engine C++ changes, and that UI-F is
   macro-guarded with green native builds.

## Prompts

### Starting a session

Replace `<X>` with `A`, `B`, `C`, `D`, `E` or `F`:

```text
You are working in the GitHub repository chucklowery/World-Conquer, branch
`vanilla`. Read docs/milestones/AGENT_GUIDE.md, then
docs/milestones/UI-command-interface.md, then docs/ROADMAP.md and ADR-0003 in
docs/browser/DECISIONS.md, completely. If docs/browser/UI_SPEC.md or
docs/browser/UI_SESSION_LOG.md exist, read them too.

Your task is session UI-<X> of the UI plan only. Check its entry condition in
the Sessions table; if it is not met, stop and report it as blocked. Follow
the Session contract exactly: the branch and PR title from the table, a draft
PR after the first phase, a commit and push after every phase, and the
session log updated after every phase. Do not stop between phases to ask me;
use the stated defaults and fallbacks.

The interface is modeled on the layout and mood described in the file's
Design brief. Work only from that written brief: do not look up, download,
trace or describe screenshots or files from any Command & Conquer game, and
put no trademarks in shipped content. The engine draws the UI; change only
art, fonts, palettes and strings unless this is UI-F with recorded owner
approval. Finish with the AGENT_GUIDE.md section 6 report.
```

### Resuming

```text
Continue session UI-<X> of the UI plan. Read docs/browser/UI_SESSION_LOG.md
and the open PR first, then carry on from the first phase of UI-<X> not
marked done.
```

### Art-iteration follow-up (after the owner reviews screenshots)

```text
On the open UI-<X> PR, revise only the art generators to address this
feedback: <feedback>. Keep every slot contract in docs/browser/UI_SPEC.md
unchanged, regenerate through CI, upload new screenshots at the same
coordinates as before, and log the change in docs/browser/UI_SESSION_LOG.md.
```

### Approving UI-F

```text
I approve session UI-F of the UI plan: a runtime tall command bar and
per-faction sidebar skins behind WC_COMMAND_BAR_TALL, default OFF on native
builds, with no save-game or multiplayer format changes.
```
