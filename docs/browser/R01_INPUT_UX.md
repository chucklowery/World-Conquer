# R01 — Camera, selection, and command UX

> **Historical (removed 2026-11-24).** This document describes the parallel
> world layer and legacy demos deleted in M3 (see `docs/ROADMAP.md`). The
> code is in git history before the M3 cleanup commit.

The native Courier Extraction mission remains 18 × 11 tiles. The engine renders
the tactical map and moves `InfantryClass` actors; the browser controller owns
only the camera framing, visual multi-selection, control groups, and input
translation. The right sidebar keeps the **minimap above build previews**.

## Desktop quick start

1. Select **Start Tactical Alpha**. Click Scout or Ranger, or drag a rectangle
   around both. Shift-click or Shift-drag adds to a selection.
2. Right-click passable ground to move every selected soldier. Right-click a
   living sentry to attack it. The older left-click-on-ground movement shortcut
   still works; left-click a soldier to change selection.
3. Choose **Move (M)** or **Attack (A)** to issue an explicit order with the next
   left-click; **Context** returns to contextual clicks. **Stop (S)** stops all
   selected soldiers. Rejected orders are shown from the native event stream.
4. **Shift+3** stores your selection in group 3. Press **3** to recall and
   center on that group. Groups 1–9 work similarly; before assignment, 1 and 2
   select the Scout or Ranger. Dead units are removed from groups, and mission
   restart clears groups.
5. Use the mouse wheel or +/− buttons to zoom from fit-to-view to 3×. Pan with
   middle-drag, Space+drag, arrow keys, on-screen arrows, or click the minimap.
   The optional **Edge-scroll** checkbox lives in Controls and starts off.
   The viewport indicator drawn on the minimap shows the current camera frame.
   A minimap click **never issues a movement order**.

## Keyboard-only mission basics

- **1 / 2** selects Scout / Ranger until those digits are assigned to groups;
  **Shift+1–9** saves a group; **1–9** recalls it. No browser Ctrl+digit tab
  shortcuts are intercepted.
- **M** enters Move target mode, **arrow keys** aim at a tile, and **Enter**
  sends the native move order. **A**, arrows and Enter target an enemy tile for
  attack; a non-enemy tile is rejected. In target mode the camera follows the
  yellow keyboard target box. On-screen buttons are also focusable with Tab,
  Enter, or Space; the map and minimap are canvases.
- **S** stops selected units, **Esc** stops and cancels command mode, **C**
  centers the camera on selection, **arrow keys** pan, **+ / −** zoom, and
  **R** restarts. Browser-reserved Ctrl/Meta/Alt shortcuts remain untouched.

## Small screens and touch

On narrow viewports the sidebar becomes a closed-by-default **Panels** drawer,
leaving the battlefield visible. Tap a soldier to select; tap ground to move
or choose an explicit Move/Attack mode first. One-finger drag pans instead of
box-selecting; zoom and pan buttons remain accessible, and the minimap can
recenter. Desktop boxes and Shift-add are intentionally pointer/mouse
features. Touch scrolling is disabled *only inside the battlefield* so input
does not drift during a gesture. Fullscreen uses the standard browser API.

## Technical contract and limits

`rts-camera.js` is pure/testable coordinate math and local selection filtering.
`rts-input-ui.js` maps browser pointer and keyboard events into selected native
entity IDs. Calls to the exported `Browser_RTS_Command` and
`Browser_RTS_Restart` functions execute in C++, and each gameplay command
passes through R00's `rts::Contract` validation, sequence ordering, and events.
Commands are one per selected living friendly actor. The native snapshot
remains version 1 and publishes *one* authoritative `selectedEntityId`; the
browser selection set is deliberately not a new simulation field.

No JavaScript pathfinding, teleportation, projectile rules, or state mutation
is introduced. The 18 × 11 authored map limits how far the camera can pan at
minimum zoom; larger maps can use the same camera math when their native
renderer and snapshot dimensions are expanded in a later milestone.

## Regression commands

```sh
node browser/engine/test-rts-camera.js
node browser/engine/test-tactical-hud.js
node browser/engine/test-simulation-bridge.js
node docs/rts-milestones/validate-roadmap.js
node browser/engine/check-r01-ui.js       # Playwright Chromium installed
node browser/engine/check-runtime.js      # after native WASM build/staging
```

Browser CI runs both Playwright suites: the first checks input and camera in
two viewport shapes using a synthetic R00 snapshot, and the second drives the
actual VanillaTD WebAssembly mission through native movement, victory, and
restart. CI-generated screenshots and logs are uploaded as browser evidence.
