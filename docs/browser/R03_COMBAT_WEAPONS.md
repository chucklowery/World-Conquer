# R03 — deterministic weapons, armor and combat events

> **Historical (removed 2026-11-24).** This document describes the parallel
> world layer and legacy demos deleted in M3 (see `docs/ROADMAP.md`). The
> code is in git history before the M3 cleanup commit.

R03 is a portable C++11 subsystem (`browser/engine/rts_weapon_system.h`) used by
the native VanillaTD browser scenario, not a JavaScript gameplay loop. The live
`InfantryClass` and `MapClass` still own player movement and terrain placement;
`rts::Contract` still owns validated, tick/sequence-ordered commands, stable
entity/house IDs and version-1 snapshots. Courier's supplies, extraction and
mission outcome remain in its existing C++ adapter. No proprietary game art
or sound is used.

## Weapon and actor data

Each `rtscombat::Weapon` is a plain record registered by unique positive ID:

| Field | Contract |
| --- | --- |
| `id` | Stable 16-bit weapon type ID; referenced by actors/events |
| `range` | Inclusive Manhattan tile radius |
| `cooldown` | Positive simulation ticks between shots |
| `damage`, `type` | Base HP damage; `SmallArms`, `Explosive`, or `Piercing` |
| `targetMask` | Bitmask of `Infantry`, `Vehicle`, `Structure` classes |
| `effect`, `travelTicks` | `Instant` at the current tick or `Projectile` after N ticks |
| `splashRadius` | Manhattan radius around the impact tile, zero for direct hit |
| `firstTick`, `phaseLocked` | Earliest shot and optional legacy fixed-cadence timing |
| `lineOfSight` | If true, blocked intervening terrain stops targeting/firing |
| `friendlyFire` | `EnemiesOnly` or `SplashAll` (allied/self splash is possible) |

`rtscombat::Actor` carries the R00 entity ID, house/team IDs, target class,
armor (`Soft`, `Light`, `Heavy`), tile, HP, weapon ID, autonomous acquisition
flag and optional target. Team and target-mask checks reject invalid orders.
Valid out-of-range orders may wait for another system to move the unit closer.
Moving and Stop orders cancel attack focus. Auto-acquisition selects the nearest
eligible visible enemy, breaking ties by entity ID.

Damage uses integer percentages and rounds down; zero damage emits no hit.

| Damage type | Soft armor | Light armor | Heavy armor |
| --- | ---: | ---: | ---: |
| Small arms | 100% | 50% | 0% |
| Explosive | 100% | 125% | 75% |
| Piercing | 75% | 100% | 150% |

Each tick stages every eligible shot in ascending shooter entity-ID order
*before* damage resolution, so simultaneous attackers both fire even if they
kill one another. Projectiles aim at a fixed tile; moving before impact dodges.
Already-launched projectiles persist after shooter death. Targeted orders to
dead units are cleared. R00 events now include `shot`, `hit`, `damage` and
`death`, plus `sourceId` and `weaponId` alongside target `entityId`, tick,
tile and `value` (damage is actual HP reduction). The immutable JavaScript
bridge validates those events; the HUD derives HP and victory/defeat from
authoritative C++ snapshots, not text logs.

## Scenarios and adding factions

Courier's two infantry keep range 2, one damage and a 3-tick firing cadence;
its ordinary sentries keep range 1, one damage, a 12-tick cadence and pursuit.
Both retain no-LOS compatibility to preserve the original mission rules.
The opt-in **R03 armored-sentry defeat drill** uses the same real production
infantry, stable IDs and HUD, but configures the two sentries as heavy vehicles
(IDs 2001/2002) with 8 HP, range-3 LOS-aware weapons and cooldown 3. The
squad's infantry-only rifle commands are rejected. Damage, squad death,
defeat and **R** restart are visible in native WASM. This drill deliberately
does not change regular Courier balance.

For each new faction:

1. Allocate non-overlapping stable entity, house/team and weapon IDs through
   the R00 registry. Art IDs and filenames remain separate from simulation IDs.
2. Register `Weapon` definitions using `System::addWeapon`; create actors with
   their class, armor, team, HP and weapon ID. Bad/duplicate IDs are rejected.
3. Route commands via `System::orderAttack`/`cancel` and advance combat on
   ordered C++ simulation ticks; publish state/events through R00 snapshots.
4. Add host tests for class filtering, armor, cooldown, line of sight,
   projectiles, splash policy, deaths, simultaneous fire and replay; add native
   browser/HUD acceptance for the new roster.

The current adapters bind two production `InfantryClass` units plus two
Courier-owned sentries; the drill does not spawn historical `VehicleClass`
campaign units. Production vehicle ownership, save/load and generalized match
lifecycle remain integration work.

The separate **integrated native RTS match** (`rts_live_match.h`) now binds a
persistent R03 weapon system to R18 epoch-qualified actors from two houses.
Six real engine infantry move on native R04 terrain, acquire opposing infantry,
and publish `shot`/`hit` traces and World-owned damage/death through negotiated
v3 snapshots. Aster small arms and Forge projectile weapons are illustrative
fixture data; class filtering/armor tests remain in the R03 host suite. An
eliminated team produces an R18 `won`/`lost` phase, and restart replaces IDs
and resets native actors. This still does not claim built vehicles or economy.
For this first match, explicit Attack is stationary: out-of-range or
line-of-sight-blocked targets are rejected. An accepted attack takes effect
on the next native tick, never at submission; range and hostility are checked
again at activation so a target moving away cannot leave a phantom order.
Stop or an activated replacement
order cancels weapon focus, while an appended future order does not. Native
VanillaTD houses are mutually allied solely to prevent the engine's guard AI
from competing with R03 weapon resolution; R18 gameplay teams remain hostile.

## Verification

```bash
node docs/rts-milestones/validate-roadmap.js
g++ -std=c++11 -Wall -Wextra -Werror -Ibrowser/engine browser/engine/test-rts-weapons.cpp -o /tmp/test-rts-weapons
/tmp/test-rts-weapons
node browser/engine/test-simulation-bridge.js
node browser/engine/test-tactical-hud.js
```

Regression gates include `test-combat.cpp`, `test-simulation-contract.cpp`,
`test-replay-parity.js`, `test-native-slice.cpp` and the existing extraction
scenario. `.github/workflows/browser-engine.yml` builds VanillaTD WASM and
runs `check-runtime.js` in Chromium, including Courier victory, native
combat events, armored target rejection, defeat HUD and restart. The workflow
uploads `r03-defeat.png` and the browser log for review before R03 completion.
