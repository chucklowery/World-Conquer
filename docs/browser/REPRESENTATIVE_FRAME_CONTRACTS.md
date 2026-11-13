# Six-class tactical frame contracts

These are source-audited rendering rules for the [representative roster](../../game/content/wireframes/representative-roster.json), not finished animation specifications. Frame counts and dimensions for generated wireframes remain provisional. Each asset's source lines and uncertain conditions are recorded below.

| Slot | Resource | Frame minimum | Placeholder frames | Confidence |
|---|---|---:|---:|---|
| [WF-0185](#wf-0185) | `E1.SHP` | 532 | 532 | frame-index-audited |
| [WF-0289](#wf-0289) | `MTNK.SHP` | 64 | 192 | frame-index-audited |
| [WF-0004](#wf-0004) | `ORCA.SHP` | 64 | 80 | frame-index-audited |
| [WF-0013](#wf-0013) | `FACT.SHP` | 1 | 128 | partial |
| [WF-0256](#wf-0256) | `T01.SHP` | 2 | 32 | partial |
| [WF-0072](#wf-0072) | `ART-EXP1.SHP` | 1 | 128 | partial |

## WF-0185

**Engine enum:** `INFANTRY_E1` · **Canvas:** 24×24 (provisional) · **Diagnostic frame probes:** 0, 16, 64, 192, 418, 531. **Browser action frame:** 64.

**Source evidence:**

- [`tiberiandawn/idata.cpp:63`](../../tiberiandawn/idata.cpp#L63) — `int MiniGunnerDos[DO_COUNT][3]`
- [`tiberiandawn/infantry.cpp:629`](../../tiberiandawn/infantry.cpp#L629) — `shapenum += facenum * Class->DoControls[doit].Jump;`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `DO_STAND_READY` | 0 | 1 | 1 | 7 |
| `DO_STAND_GUARD` | 8 | 1 | 1 | 15 |
| `DO_PRONE` | 192 | 1 | 8 | 248 |
| `DO_WALK` | 16 | 6 | 6 | 63 |
| `DO_FIRE_WEAPON` | 64 | 8 | 8 | 127 |
| `DO_LIE_DOWN` | 128 | 2 | 2 | 143 |
| `DO_CRAWL` | 144 | 4 | 4 | 175 |
| `DO_GET_UP` | 176 | 2 | 2 | 191 |
| `DO_FIRE_PRONE` | 192 | 6 | 8 | 253 |
| `DO_IDLE1` | 256 | 16 | 0 | 271 |
| `DO_IDLE2` | 272 | 16 | 0 | 287 |
| `DO_ON_GUARD` | 288 | 13 | 0 | 300 |
| `DO_FIGHT_READY` | 292 | 10 | 0 | 301 |
| `DO_PUNCH` | 301 | 2 | 0 | 302 |
| `DO_KICK` | 303 | 6 | 0 | 308 |
| `DO_PUNCH_HIT1` | 309 | 2 | 0 | 310 |
| `DO_PUNCH_HIT2` | 311 | 4 | 0 | 314 |
| `DO_PUNCH_DEATH` | 315 | 5 | 0 | 319 |
| `DO_KICK_HIT1` | 319 | 2 | 0 | 320 |
| `DO_KICK_HIT2` | 321 | 4 | 0 | 324 |
| `DO_KICK_DEATH` | 325 | 5 | 0 | 329 |
| `DO_READY_WEAPON` | 330 | 5 | 0 | 334 |
| `DO_GUN_DEATH` | 382 | 8 | 0 | 389 |
| `DO_EXPLOSION_DEATH` | 398 | 8 | 0 | 405 |
| `DO_EXPLOSION2_DEATH` | 398 | 8 | 0 | 405 |
| `DO_GRENADE_DEATH` | 406 | 12 | 0 | 417 |
| `DO_FIRE_DEATH` | 418 | 18 | 0 | 435 |
| `DO_GESTURE1` | 436 | 3 | 3 | 459 |
| `DO_SALUTE1` | 460 | 3 | 3 | 483 |
| `DO_GESTURE2` | 484 | 3 | 3 | 507 |
| `DO_SALUTE2` | 508 | 3 | 3 | 531 |
| `DO_PULL_GUN` | 0 | 1 | 1 | 7 |
| `DO_PLEAD` | 0 | 1 | 1 | 7 |
| `DO_PLEAD_DEATH` | 0 | 1 | 1 | 7 |

**Separate dependencies:** None identified in this pass.

**Still required before final art sign-off:**

- [ ] Create real animation art for all enabled DO actions and eight-facing sequences
- [ ] Verify body pivot, muzzle/impact offsets and shadow in gameplay

## WF-0289

**Engine enum:** `UNIT_MTANK` · **Canvas:** 32×32 (provisional) · **Diagnostic frame probes:** 0, 31, 32, 63. **Browser action frame:** 32.

**Source evidence:**

- [`tiberiandawn/udata.cpp:264`](../../tiberiandawn/udata.cpp#L264) — `static UnitTypeClass const UnitMTank(UNIT_MTANK`
- [`tiberiandawn/unit.cpp:2214`](../../tiberiandawn/unit.cpp#L2214) — `shapenum = TechnoClass::BodyShape[tfacing] + 32;`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `body 32 headings` | 0 | 32 | — | 31 |
| `turret 32 headings` | 32 | 32 | — | 63 |

**Separate dependencies:** None identified in this pass.

**Still required before final art sign-off:**

- [ ] Make body and turret distinct compositing layers in the shared SHP
- [ ] Verify turret pivot, recoil, damage and remap pixels

## WF-0004

**Engine enum:** `AIRCRAFT_ORCA` · **Canvas:** 32×32 (provisional) · **Diagnostic frame probes:** 0, 31, 32, 63. **Browser action frame:** 32.

**Source evidence:**

- [`tiberiandawn/aadata.cpp:178`](../../tiberiandawn/aadata.cpp#L178) — `OrcaHeli(AIRCRAFT_ORCA`
- [`tiberiandawn/aircraft.cpp:358`](../../tiberiandawn/aircraft.cpp#L358) — `if (*this == AIRCRAFT_ORCA && Get_Speed() >= MPH_MEDIUM_FAST)`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `normal 32 headings` | 0 | 32 | — | 31 |
| `high-speed 32 headings` | 32 | 32 | — | 63 |

**Separate dependencies:** None identified in this pass.

**Still required before final art sign-off:**

- [ ] Verify conditional door-state frame selection and aircraft shadow
- [ ] Check altitude, orientation, muzzle and rotors at native tactical scale

## WF-0013

**Engine enum:** `STRUCT_CONST` · **Canvas:** 48×48 (provisional) · **Diagnostic frame probes:** 0. **Browser action frame:** 0.

**Source evidence:**

- [`tiberiandawn/bdata.cpp:534`](../../tiberiandawn/bdata.cpp#L534) — `ClassConst(STRUCT_CONST`
- [`tiberiandawn/building.cpp:513`](../../tiberiandawn/building.cpp#L513) — `shapefile = Class->Get_Buildup_Data();`
- [`tiberiandawn/bdata.cpp:3839`](../../tiberiandawn/bdata.cpp#L3839) — `sprintf(buffer, "%sMAKE", building.IniName);`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `normal building state` | 0 | dynamic | — | dynamic/unused |

**Separate dependencies:** `FACTMAKE.SHP`.

**Still required before final art sign-off:**

- [ ] Inventory BState frame starts, frame counts and rates
- [ ] Author separate FACTMAKE construction/deconstruction SHP
- [ ] Verify 3×2 foundation occupancy and bib/selection offsets

## WF-0256

**Engine enum:** `TERRAIN_TREE1` · **Canvas:** 32×32 (provisional) · **Diagnostic frame probes:** 0, 1. **Browser action frame:** 1.

**Source evidence:**

- [`tiberiandawn/tdata.cpp:77`](../../tiberiandawn/tdata.cpp#L77) — `Tree1Class(TERRAIN_TREE1`
- [`tiberiandawn/terrain.cpp:365`](../../tiberiandawn/terrain.cpp#L365) — `if (IsCrumbling || Class->IsTransformable)`
- [`tiberiandawn/terrain.cpp:368`](../../tiberiandawn/terrain.cpp#L368) — `if (Strength < 2)`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `normal` | 0 | 1 | — | 0 |
| `near-destruction` | 1 | 1 | — | 1 |
| `crumbling stage` | dynamic | dynamic | — | dynamic/unused |

**Separate dependencies:** `theater palette and SHP variant`.

**Still required before final art sign-off:**

- [ ] Map all crumbling frames and stage rate
- [ ] Verify winter/temperate variants and cell footprint and base offset

## WF-0072

**Engine enum:** `ANIM_ART_EXP1` · **Canvas:** 32×32 (provisional) · **Diagnostic frame probes:** 0. **Browser action frame:** 0.

**Source evidence:**

- [`tiberiandawn/adata.cpp:956`](../../tiberiandawn/adata.cpp#L956) — `ArtExp1(ANIM_ART_EXP1`
- [`tiberiandawn/anim.cpp:237`](../../tiberiandawn/anim.cpp#L237) — `int shapenum = Class->Start + Fetch_Stage();`

**Frame indexing rules:**

| Action | Start | Frames/action | Facing stride | Last frame |
|---|---:|---:|---:|---:|
| `animation start + dynamic stage` | 0 | dynamic | — | dynamic/unused |

**Separate dependencies:** `VOC_XPLOSML2 sound asset`.

**Still required before final art sign-off:**

- [ ] ArtExp1 declares Stages=-1 so runtime derives count from SHP; choose authored effect length intentionally
- [ ] Verify frame rate, one-shot disposal, crater and sound timing

Validation: run `node tools/content/test-representative-contracts.js` and build with `--representative`; these checks reject truncated frame sets but cannot certify art direction, true frame timing, supplementary resources or mission startup.
