# M2b roster slice — evidence and unresolved contracts

This is an **incomplete** M2b code audit, not a claim that the scenario is playable. All art remains generated geometry. Internal engine identifiers below are never exported as player-facing labels.

| Slice | Engine file | Provisional/generated frames | Verified upper accessed frame | Source evidence |
| --- | --- | ---: | ---: | --- |
| Mobile base vehicle | `MCV.SHP` | 192 | unknown | `tiberiandawn/udata.cpp:638`, `unit.cpp:2195-2245` |
| Construction hub | `FACT.SHP` | 128 | at least 23 | `tiberiandawn/bdata.cpp:534`, `building.cpp:503-560` |
| Power plant | `NUKE.SHP` | 128 | unknown | `tiberiandawn/bdata.cpp:892`, `building.cpp:503-560` |
| Refinery and docking | `PROC.SHP` | 128 | unknown | `tiberiandawn/bdata.cpp:585`, `building.cpp:503-560` |
| Harvester | `HARV.SHP` | 192 | unknown | `tiberiandawn/udata.cpp:584-635`, `unit.cpp:2195-2245` |
| Barracks | `PYLE.SHP` | 128 | unknown | `tiberiandawn/bdata.cpp:1097`, `building.cpp:503-560` |
| Rifle infantry | `E1.SHP` | **532** | **531** | `tiberiandawn/idata.cpp:63-98`, `infantry.cpp:629` |
| Vehicle factory | `WEAP.SHP` | 128 | unknown | `tiberiandawn/bdata.cpp:264`, `building.cpp:503-560` |
| Light tank (medium tank source type) | `MTNK.SHP` | **192** | **63** | `tiberiandawn/udata.cpp:264`, `unit.cpp:2214` |
| Defense tower | `GTWR.SHP` | 128 | unknown | `tiberiandawn/bdata.cpp:320`, `building.cpp:503-560` |

The source-audited minimums for infantry and tank are already documented in `docs/browser/REPRESENTATIVE_FRAME_CONTRACTS.md` and now recorded in `requirements.json`. The tank's 192-frame generated placeholder is deliberately retained as a safe upper bound although the body/turret index audit establishes 64 accessed frames.

**Open work:** ascertain every building's `Anims` range, damage and docking frames, construction `*MAKE` shape frame requirements, terrain trees/smudges, map sidebar cameos, and player-visible visual placement. No verification of the stock renderer or scenario screenshot has been completed on this branch. Do not replace unknown frame contracts with invented precise counts.
