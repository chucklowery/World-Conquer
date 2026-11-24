# M2 roster slice — audited frame contracts

All art is generated placeholder geometry. Internal engine identifiers below
are never shown to the player (display names come from the generated string
table). Each minimum is the highest frame index the engine can request, plus
one, derived from the draw code. `tools/content/pack.js` enforces every
`minFrames` contract in `game/content/pack/requirements.json` and fails the
build if a generated sprite is shorter.

| Slice | Engine file | Generated frames | Audited minimum | How the engine indexes frames | Source |
| --- | --- | ---: | ---: | --- | --- |
| Mobile base vehicle | `MCV.SHP` | 192 | **32** | 32 body facings (`BodyShape`) | `unit.cpp:2132` |
| Construction yard | `FACT.SHP` | 128 | **48** | active anim ends at 24; damaged frames add the largest anim end | `bdata.cpp:3792-3793`, `building.cpp:612-626` |
| Power plant | `NUKE.SHP` | 128 | **8** | idle anim 0-3; damaged adds 4 | `bdata.cpp:3798`, `building.cpp:612-626` |
| Refinery (docking, siphon, undock, full) | `PROC.SHP` | 128 | **60** | undocking ends at 30; damaged adds 30 | `bdata.cpp:3801-3805`, `building.cpp:612-626` |
| Harvester | `HARV.SHP` | 192 | **68** | harvesting: `32 + ((facing+2)/4)*4 + stage(0-3)` | `unit.cpp:2127-2129` |
| Barracks | `PYLE.SHP` | 128 | **20** | idle/active 0-9; damaged adds 10 | `bdata.cpp:3790-3791`, `building.cpp:612-626` |
| Rifle infantry | `E1.SHP` | 532 | **532** | DoControls facing stride; highest gesture 531 | `idata.cpp:63-98`, `infantry.cpp:629` |
| Vehicle factory | `WEAP.SHP` | 128 | **2** | 0 normal, 1 damaged; the door is `WEAP2.SHP` | `building.cpp:584-589`, `bdata.cpp:3861` |
| Tank | `MTNK.SHP` | 192 | **64** | 32 body + 32 turret facings | `unit.cpp:2070-2078` |
| Light vehicle | `JEEP.SHP` | 192 | **64** | 32 body + 32 turret facings | `unit.cpp:2070-2078` |
| Defense tower | `GTWR.SHP` | 128 | **2** | default single-frame anim; damaged frame 1 | `bdata.cpp:3739-3749`, `building.cpp:612-626` |

Other rules confirmed in the draw code:

- **Buildings with a turret** (for example `GUN.SHP`, `SAM.SHP`) index
  `BodyShape + 32 (recoil) + 64 (damaged)`, up to frame 127. The 128-frame
  building placeholders cover this exactly (`building.cpp:550-573`).
- **Build-up animations** (`*MAKE.SHP`) are played for as many frames as the
  file contains (`bdata.cpp:3839-3849`), so any count is valid.
- **A building at 1 strength** shows its last frame (`building.cpp:581-582`),
  which any count satisfies.
- **Sidebar cameos** (`*ICNH.SHP`) use frame 0 only, at 64×48
  (`sidebar.h:216-217`, hi-res doubling). They are rendered from each
  object's own placeholder sprite so build buttons are recognisable.
- **Palette**: indices 32–38 cycle (`defines.h:1936-1937`) and 176–191 are
  the house remap band (`const.cpp`); static art avoids the first, and
  house-coloured areas use the second.

Not yet audited: the APC door frames (`unit.cpp:2150-2160`), aircraft, and
non-slice structures. They keep safe upper-bound placeholders (vehicles 192,
buildings 128) recorded as `provisional-upper-bound` in `requirements.json`.
