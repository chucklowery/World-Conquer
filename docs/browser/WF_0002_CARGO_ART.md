# WF-0002: original cargo aircraft artwork — draft 1

## Option B: editable HD master (review draft)

The reusable original Courier aircraft model is defined in
[`tools/content/wf-0002-hd.py`](../../tools/content/wf-0002-hd.py).
Run `blender -b --factory-startup --python tools/content/wf-0002-hd.py`
to regenerate the editable `.blend` master and **36 transparent 512×512 RGBA PNGs** in
[`game/content/wireframes/hd/WF-0002`](../../game/content/wireframes/hd/WF-0002).
Frames `0000`–`0031` are directional and `0032`–`0035` are four loading-ramp states.
The master and HD frames use a single orthographic camera, constant lighting and
center registration, with anti-aliased edges. Run
`python tools/content/validate-wf-0002-hd.py` to validate frame coverage,
dimensions, alpha, anti-aliasing, directional/ramp differences, and produce
the SHA-256 HD manifest. The source is entirely project-owned procedural geometry.

**Important:** HD source images are not indexed tactical SHP files; the current
game renderer still uses the original 32×32 eight-color assets below as a
**legacy fallback**. A high-resolution renderer/texture-atlas integration is
not established by exporting the artwork. Gameplay-level validation, art
approval, and new HD runtime integration remain outstanding; do not advertise
these images as playable/production-approved game sprites.

The browser diagnostic now has an **independent HD canvas path** implemented in
`browser/engine/cargo-hd.js`: it loads the 36 PNGs only after validating the
manifest, each SHA-256, and PNG dimensions, then allows heading/ramp inspection
with smooth scaling. If a load fails, the native C++/SHP rendering path is not
modified. Browser CI packages this diagnostic and runs a corruption-rejection
test. It is **not a gameplay texture-atlas hook**: the original engine still
selects and renders indexed C17 frames, and an in-game HD backend needs an
explicit C++ texture/asset-consumer integration before production use.

**Resource:** `C17.SHP` · **Engine enum:** `AIRCRAFT_CARGO` · **Art stage:** `authored-draft` · **Canvas:** 32×32 indexed pixels · **Frames:** 80 · **Provenance:** [ATTRIBUTION.json](../../game/content/wireframes/final/WF-0002/ATTRIBUTION.json).

This is a first fully populated, project-authored replacement candidate for [WF-0002](WIREFRAME_REPLACEMENT_CATALOG.md#wf-0002). The visual design is an original fictional **Courier-class utility transport**: a broad, tapered high wing, twin underslung lift nacelles, central freight spine, distinctive split tail, compact cockpit and a mechanical rear loading ramp. No real C-17 image or proprietary game sprite was copied, traced or used as a generator input.

**[View ten-frame sprite storyboard](../../game/content/wireframes/states/WF-0002-atlas.svg)**

## Engine-observed frame rules

The source constructor [`aadata.cpp:CargoPlane`](../../tiberiandawn/aadata.cpp#L219) identifies a fixed-wing cargo transport, with no rotor and no weapon. [`AircraftClass::Draw_It`](../../tiberiandawn/aircraft.cpp#L330) chooses `TechnoClass::BodyShape[Facing_To_32(SecondaryFacing)]`. The 32-entry index lookup in [`techno.cpp`](../../tiberiandawn/techno.cpp#L129) reverses heading indices after zero. Unlike the Orca, this class does **not** select a speed-based `+32` bank. If the door is open or moving, the render path selects `32 + Door_Stage()`; the aircraft's `Open_Door(5,4)` calls imply four stage values `0..3` ([`door.cpp`](../../tiberiandawn/door.cpp#L177)). These source observations determine the **36 required runtime-targeted frames** below.

| Index | Meaning | Production requirement |
|---|---|---|
| `0..31` | 32 facing directions; frame 0 nose-up, indexed rotations through 360° | Same center and alpha mask semantics, legible tapered wings, no directional jump; ensure `BodyShape` reverse index matches the heading convention |
| `32..35` | Door stages closed → ajar → deployment → open | Ramp changes without translating the hull; animation must be readable in four stages, including reverse closing |
| `36..63` | **Provisional reserve** | This draft draws gear-down heading variants for review. No normal C17 `Draw_It` lookup of these frames was identified; do not assign runtime meaning without further source evidence |
| `64..79` | **Provisional reserve** | This draft contains damage/landing study frames. Do not assume the engine consumes these indices. Consider reducing the final file length after auditing all remaining consumers |

The design does not contain a rotor layer, weapon-flash sheet or aircraft shadow as a separate authored asset. The engine still renders its own filtered shadow path. A game scenario must verify the cargo door states, landing/takeoff framing, cargo arrival/exit timing and actual 1× legibility before this art can be approved.

## Independently linked inspection frames

- [ ] **[North / frame 00](../../game/content/wireframes/states/WF-0002-north.svg)** — full-width wing, nose, cockpit and two lift pods; stable central registration.
- [ ] **[East / frame 08](../../game/content/wireframes/states/WF-0002-east.svg)** — heading rotation must preserve center, wing thickness and engine clearance.
- [ ] **[South / frame 16](../../game/content/wireframes/states/WF-0002-south.svg)** — 180° rotation; test shadow/altitude and direction continuity.
- [ ] **[West / frame 24](../../game/content/wireframes/states/WF-0002-west.svg)** — the opposite quarter turn; no clipping in the transparent 32×32 canvas.
- [ ] **[Closed ramp / frame 32](../../game/content/wireframes/states/WF-0002-ramp-closed.svg)** — landing/transport pose, door shut.
- [ ] **[Ajar ramp / frame 33](../../game/content/wireframes/states/WF-0002-ramp-ajar.svg)** — first visible hinge/slit stage.
- [ ] **[Deploying ramp / frame 34](../../game/content/wireframes/states/WF-0002-ramp-deploy.svg)** — amber cargo threshold and extending ramp.
- [ ] **[Open ramp / frame 35](../../game/content/wireframes/states/WF-0002-ramp-open.svg)** — full opening; reverse this sequence for closure.
- [ ] **[Gear study / frame 40](../../game/content/wireframes/states/WF-0002-gear-test.svg)** — visual-only reserve, not a confirmed C++ state.
- [ ] **[Reserve study / frame 64](../../game/content/wireframes/states/WF-0002-reserve.svg)** — visual-only damaged/landing proposal.

## File-by-file production contract

- **Source:** `tools/content/cargo-plane-art.js` (deterministic authored geometry, no image model, photographic input or third-party art).
- **Game-ready input candidate:** `game/content/wireframes/final/WF-0002/0000.png` through `0079.png`, exactly 80 32×32, eight-bit-per-channel RGBA PNG files. Every pixel must use one of the eight colors in [`placeholder.palette.json`](../../game/content/source/placeholder.palette.json); alpha must be 0 for index 0 and 255 for other indices, with no resampling or antialiasing.
- **Rights record:** `ATTRIBUTION.json` contains `creator`, `license`, `source`, `revision`, `stage: "draft"` and a description of the original input. Its `stage` causes the SHP manifest to report `authored-draft` rather than approved `final-art`.
- **Generated exports:** `wireframes.js build <new-output-directory>` substitutes these PNGs for WF-0002's procedural fallback and writes `files/aircraft/WF-0002.SHP` plus unambiguous `game-root/C17.SHP`; manifest records the actual byte count and SHA-256. The emitter uses project-owned `.PAL` and tactical LCW keyframes.
- **Rebuild guard:** `node tools/content/cargo-plane-art.js generate` creates the draft **only when `final/WF-0002` does not already exist**, so artist edits cannot be overwritten by a routine regenerate. Use its exported `paintCargo`/`makePng` functions only if deliberately preparing a new revision.
- **Art review:** make the final source files unique, refine anatomy/shape and material surfaces, avoid identity pips and other diagnostic marks, confirm team-color remap needs, verify the ground shadow and aircraft pivot at all 32 headings, verify the door stage on a carrying aircraft, confirm whether 36..79 can be removed, and approve attribution/redistribution rights before changing `stage` to `approved`.

## Current verification

`node tools/content/test-cargo-plane-art.js` checks the exact 80 PNG imports, original palette, transparency, cardinal facings, four different door poses, dynamic reserves, SVG preview reproducibility, collision-free engine filename and real tactical SHP encode/decode. The full-content build is additionally verified to select this source art, with `authored-draft` status. This is *format-level compatibility plus engine-source frame research*, not evidence of scenario-level cargo delivery or production art approval.
