// Test-only hooks for the browser CI (roadmap M3, automated win; ADR-0004).
//
// The engine declares a skirmish won only when every other house has no
// buildings, units, infantry or aircraft left (house.cpp, MPlayer_Defeated).
// Beating the computer player by scripted play is slow and unreliable, so the
// test asks for this setup instead:
//
//   request 1 ("reduce"): every computer house loses all of its units,
//     infantry, aircraft and all buildings but one. The kept building is the
//     first one that neither builds nor shoots, and is left at 10% strength.
//     Objects are destroyed through Take_Damage, so the normal death path
//     runs. Safe to repeat (for example after a unit leaves a building).
//   request 2 ("show"): centres the view on the kept building and, on the
//     next frame, logs its screen position.
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
int pending = 0;          // 0 none, 1 reduce, 2 show
bool reportNextFrame = false;
BuildingClass* target = nullptr;

bool Is_Computer_House(HouseClass* house)
{
    return house && house != PlayerPtr && !house->IsHuman && !house->IsDefeated && house->Class->House >= HOUSE_MULTI1
           && house->Class->House <= HOUSE_MULTI6;
}

void Destroy(TechnoClass* object)
{
    // Through Take_Damage, so kill events, explosions and scans update as
    // in normal play. Strength 1 makes the outcome independent of armour.
    object->Strength = 1;
    int damage = 1000;
    object->Take_Damage(damage, 0, WARHEAD_HE, nullptr);
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
    // Collect first: destroying objects changes the lists being walked.
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
        Destroy(doomed[i]);
    if (target) {
        int weak = target->Class->MaxStrength / 10;
        if (target->Strength > weak)
            target->Strength = weak > 0 ? weak : 1;
        printf("[browser-event] test-reduced destroyed=%d target=%s house=%s cell=%d,%d\n",
               count,
               target->Class->IniName,
               target->House->Class->IniName,
               Cell_X(Coord_Cell(target->Coord)),
               Cell_Y(Coord_Cell(target->Coord)));
    } else {
        printf("[browser-event] test-reduced destroyed=%d target=none\n", count);
    }
    fflush(stdout);
}
} // namespace

extern "C" EMSCRIPTEN_KEEPALIVE int Browser_Test_Request(int request)
{
    if (!enabled || request < 1 || request > 2)
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
    }
}
#endif
