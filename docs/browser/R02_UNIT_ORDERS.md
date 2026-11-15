# R02 — Production-unit orders and bounded navigation

This opt-in mode uses **four real VanillaTD `InfantryClass` objects** owned
by a player `HouseClass`, placed on the authored Courier 18×11 obstacle map
through `MapClass`. Courier Extraction continues unchanged, with its
specialized combat, sentry AI, crates, and victory logic.

In the browser engine, launch **Play R02: four production-unit orders**.
Select with keys 1–4 or click; click ground to move, Shift-click for
attack-move, P then click to patrol, G then click another friendly to guard,
H to hold, S/Escape to stop, Ctrl-click to append an order, and R to restart.

## Ownership and deterministic behavior

- `production_orders.h` provides the C++ command queue, fixed-tie-break
  Manhattan A* navigation, collision reservations, and lifecycle.
  It never advances an actor position itself.
- `native_orders.cpp` reads positions from real `Coord_Cell()` and
  traversability from live `MapClass` cells, issues reserved adjacent cell
  targets through `FootClass::Assign_Destination` / `MISSION_MOVE`, and
  advances four real actors through `InfantryClass::AI()`. JavaScript
  receives state and renders the HUD; it performs no movement simulation.
- Move and attack-move travel to a target then complete. Attack-move records
  aggressive intent, but production threat acquisition/weapon behavior
  belongs to R03; this diagnostic spawns no hostile production objects.
  Stop clears pending/current orders and `NavCom`; hold stays stationary;
  guard follows a living friendly when farther than two cells; patrol
  alternates between the starting cell and target. Ctrl queues up to eight
  orders; replacement discards prior queued and current waypoints.
- Dead/limbo units cancel their entire queues and reject new orders. Off-map,
  static-blocked, and disconnected targets are rejected without altering
  the current order. Temporary occupancy waits and replans. Newly blocked
  destinations cancel with explicit `blocked` feedback; 90 ticks of
  obstruction/stalled native movement cancel with `unreachable`.
- The version-1 R00 snapshot adds optional `commandStates[]` containing
  entity ID, order type, status, destination and queued count. Courier emits
  an empty list. Typed native command/position events remain one-way through
  WASM; snapshots are deeply frozen before HUD consumption.

## Bounded path budget

The A* search uses four-neighbor order east/south/west/north, ties by
heuristic then insertion sequence. Both current live cells and in-flight
waypoint reservations block other units. Each tick is limited to **two A*
searches**, at most 198 expanded cells each (396 total). Units are processed
in stable ID order; requests by tick, sequence, then actor. Deferred
searches retain the order. Queue length is capped at eight.

Host benchmark (`test-production-orders.cpp`, authored map, two across-map
orders for 1,000 fresh ticks): **2,000 searches, 48,000 expanded cells,
~87–97 ms total (~87–97 μs/tick)** in this Linux environment. Wall clock
is machine-dependent; the deterministic expansion cap is not.

```sh
g++ -std=c++11 -Wall -Wextra -Werror -Ibrowser/engine \
  browser/engine/test-production-orders.cpp -o build/test-production-orders
build/test-production-orders
node browser/engine/test-simulation-bridge.js
node docs/rts-milestones/validate-roadmap.js
```

The browser-engine CI compiles the real VanillaTD WASM module and runs
Chromium acceptance: four independently ordered production infantry cross
the obstacles without cell overlap, then hold/guard/stop/restart. Its
existing Courier extraction/combat regression still runs independently.
No proprietary game content is packaged.
