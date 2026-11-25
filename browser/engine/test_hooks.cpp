// Test-only hooks for the browser CI (roadmap M3, automated win; ADR-0004).
//
// The engine declares a skirmish won only when every other house has no
// buildings, units, infantry or aircraft left (house.cpp, MPlayer_Defeated).
// Beating the computer player by scripted play is slow and unreliable, so the
// test asks for this setup instead:
//
//   request 1 ("reduce"): every computer house loses all of its units,
//     infantry, aircraft and all buildings but one. The kept building is the
//     first one that neither builds nor shoots. The others are removed the
//     way the engine removes a sabotaged building (Limbo, then delete;
//     scenario.cpp): no death and no explosion. Destroying them instead
//     killed the kept building with their death explosions (CI runs
//     45546655452 and 45549805362).
//     The house also stops selling: its expert AI is switched off
//     (IQ 0 and IsBaseBuilding false, house.cpp:932 and 1596; no fire sale
//     or power sale; run 45553930818 set only IsBaseBuilding, which the
//     engine turned back on, and the AI sold the building) and it is
//     given enough credits that a damaged building repairs rather than sells
//     itself (building.cpp:1187). In CI run 45551864057 the computer sold the
//     kept building (logged as a kill with no attacker) before the player's
//     units arrived. Safe to repeat.
//     The area around the kept building is revealed to the player, so a
//     click on it is an attack order rather than a move into the shroud
//     (run 45556700656).
//   request 2 ("show"): centres the view on the kept building and, on the
//     next frame, logs its screen position.
//   request 3 ("units"): centres the view on the player's own units and, on
//     the next frame, logs how many there are and how many are on screen, so
//     the test can box-select them. They start around the MCV's spawn cell,
//     which the test may have driven away from before deploying.
//
// The test then destroys the last building with real units and real input,
// so the engine's own defeat check, win screen and restart all run.
//
// Inert unless main() received --browser-test-hooks (only the CI test passes
// it); Browser_Test_Request() returns 0 otherwise.
#ifdef __EMSCRIPTEN__
#include "test_hooks.h"
#include <emscripten/emscripten.h>
#include <cstdio>
#include <cstring>
#include "tiberiandawn/function.h"

namespace {
bool enabled = false;
int pending = 0;          // 0 none, 1 reduce, 2 show, 3 units
bool reportNextFrame = false;
bool reportUnitsNextFrame = false;
BuildingClass* target = nullptr;

bool Is_Computer_House(HouseClass* house)
{
    return house && house != PlayerPtr && !house->IsHuman && !house->IsDefeated && house->Class->House >= HOUSE_MULTI1
           && house->Class->House <= HOUSE_MULTI6;
}

void Remove(TechnoClass* object)
{
    // As scenario.cpp removes a sabotaged building: off the map and out of
    // the logic list, then deleted. No death, so nothing explodes.
    object->Limbo();
    delete object;
}

bool Target_Alive()
{
    if (!target)
        return false;
    for (int i = 0; i < Buildings.Count(); i++) {
        if (Buildings.Ptr(i) == target)
            return target->IsActive && target->Strength > 0;
    }
    return false;
}

void Reduce()
{
    TechnoClass* doomed[1024];
    int count = 0;
    if (!Target_Alive())
        target = nullptr;
    // Keep one building per call: the first that neither builds nor shoots.
    for (int i = 0; i < Buildings.Count() && !target; i++) {
        BuildingClass* b = Buildings.Ptr(i);
        if (!b->IsInLimbo && Is_Computer_House(b->House) && b->Class->ToBuild == RTTI_NONE
            && b->Class->Primary == WEAPON_NONE) {
            target = b;
        }
    }
    for (int i = 0; i < Buildings.Count() && !target; i++) {
        BuildingClass* b = Buildings.Ptr(i);
        if (!b->IsInLimbo && Is_Computer_House(b->House))
            target = b;
    }
    // Collect first: removing objects changes the lists being walked.
    for (int i = 0; i < Buildings.Count() && count < 1024; i++) {
        BuildingClass* b = Buildings.Ptr(i);
        if (b != target && !b->IsInLimbo && Is_Computer_House(b->House))
            doomed[count++] = b;
    }
    for (int i = 0; i < Units.Count() && count < 1024; i++) {
        UnitClass* u = Units.Ptr(i);
        if (!u->IsInLimbo && Is_Computer_House(u->House))
            doomed[count++] = u;
    }
    for (int i = 0; i < Infantry.Count() && count < 1024; i++) {
        InfantryClass* n = Infantry.Ptr(i);
        if (!n->IsInLimbo && Is_Computer_House(n->House))
            doomed[count++] = n;
    }
    for (int i = 0; i < Aircraft.Count() && count < 1024; i++) {
        AircraftClass* a = Aircraft.Ptr(i);
        if (!a->IsInLimbo && Is_Computer_House(a->House))
            doomed[count++] = a;
    }
    for (int i = 0; i < count; i++)
        Remove(doomed[i]);
    // Stop the computer selling what is left (see the file comment).
    for (int h = HOUSE_MULTI1; h <= HOUSE_MULTI6; h++) {
        HouseClass* house = HouseClass::As_Pointer((HousesType)h);
        if (Is_Computer_House(house)) {
            // IQ 0 too: house.cpp:932 turns base building back on every tick
            // while IQ >= Rule.IQProduction (CI run 45553930818).
            house->IQ = 0;
            house->IsBaseBuilding = false;
            house->State = STATE_BUILDUP;
            if (house->Credits < 5000)
                house->Credits = 5000;
        }
    }
    if (target) {
        Map.Sight_From(PlayerPtr, Coord_Cell(target->Center_Coord()), 4, false);
        printf("[browser-event] test-reduced removed=%d target=%s house=%s cell=%d,%d\n",
               count,
               target->Class->IniName,
               target->House->Class->IniName,
               Cell_X(Coord_Cell(target->Coord)),
               Cell_Y(Coord_Cell(target->Coord)));
    } else {
        printf("[browser-event] test-reduced removed=%d target=none\n", count);
    }
    fflush(stdout);
}
// The player's mobile units (not in limbo); fills `out` and returns the count.
int Player_Units(FootClass** out, int max)
{
    int count = 0;
    for (int i = 0; i < Units.Count() && count < max; i++) {
        UnitClass* u = Units.Ptr(i);
        if (u->IsActive && !u->IsInLimbo && u->House == PlayerPtr)
            out[count++] = u;
    }
    for (int i = 0; i < Infantry.Count() && count < max; i++) {
        InfantryClass* n = Infantry.Ptr(i);
        if (n->IsActive && !n->IsInLimbo && n->House == PlayerPtr)
            out[count++] = n;
    }
    return count;
}
} // namespace

extern "C" EMSCRIPTEN_KEEPALIVE int Browser_Test_Request(int request)
{
    if (!enabled || request < 1 || request > 3)
        return 0;
    pending = request;
    return 1;
}

void Browser_Test_Hooks_Parse(int& argc, char** argv)
{
    int out = 0;
    for (int i = 0; i < argc; i++) {
        if (i > 0 && strcmp(argv[i], "--browser-test-hooks") == 0) {
            enabled = true;
            continue;
        }
        argv[out++] = argv[i];
    }
    argc = out;
    if (enabled) {
        printf("[browser-test] test hooks enabled\n");
        fflush(stdout);
    }
}

void Browser_Test_Hooks_Frame()
{
    if (!enabled)
        return;
    if (reportNextFrame) {
        reportNextFrame = false;
        int x, y;
        if (Target_Alive() && Map.Coord_To_Pixel(target->Center_Coord(), x, y)) {
            printf("[browser-event] test-target name=%s x=%d y=%d\n",
                   target->Class->IniName,
                   x + Map.TacPixelX,
                   y + Map.TacPixelY);
        } else {
            printf("[browser-event] test-target name=none\n");
        }
        fflush(stdout);
    }
    if (reportUnitsNextFrame) {
        reportUnitsNextFrame = false;
        FootClass* units[256];
        int total = Player_Units(units, 256), visible = 0;
        for (int i = 0; i < total; i++) {
            int x, y;
            if (Map.Coord_To_Pixel(units[i]->Center_Coord(), x, y))
                visible++;
        }
        printf("[browser-event] test-units total=%d visible=%d\n", total, visible);
        fflush(stdout);
    }
    int request = pending;
    pending = 0;
    if (request == 1) {
        Reduce();
    } else if (request == 2) {
        if (Target_Alive()) {
            Map.Center_Map(target->Center_Coord());
            Map.Flag_To_Redraw(true);
        }
        reportNextFrame = true;
    } else if (request == 3) {
        FootClass* units[256];
        int total = Player_Units(units, 256);
        if (total) {
            long x = 0, y = 0;
            for (int i = 0; i < total; i++) {
                x += Coord_X(units[i]->Center_Coord());
                y += Coord_Y(units[i]->Center_Coord());
            }
            Map.Center_Map(XY_Coord((int)(x / total), (int)(y / total)));
            Map.Flag_To_Redraw(true);
        }
        reportUnitsNextFrame = true;
    }
}
#endif
