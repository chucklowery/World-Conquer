// The M5 skirmish roster (roadmap M5; ADR-0005).
//
// M5 ships final art for a minimum roster only: six structures (construction
// yard, power plant, refinery, barracks, vehicle factory, guard tower) and
// four units (harvester, rifle infantry, light vehicle, medium tank), plus the
// mobile base vehicle every match starts with. Every other object type would
// still be drawn with a wireframe placeholder, so in this build it cannot be
// built by anyone, human or computer:
//
// - IsBuildable is cleared on every other building, unit, infantry and
//   aircraft type. HouseClass::Can_Build (house.cpp:557) checks it before
//   anything else, including the computer's "can always build everything"
//   shortcut, so the AI's base and unit choices stay inside the roster.
// - The roster is made ownable by both sides (Ownable, house.cpp:557). Stock
//   rules give the barracks, guard tower, light vehicle and medium tank to
//   one side only; both factions now share the roster until M7 adds content.
// - The construction yard keeps its stock IsBuildable (it comes from the
//   mobile base vehicle); the base vehicle itself is not buildable.
//
// Starting units for "bases off" matches are limited the same way in
// scenarioini.cpp (Create_Units, under WC_MINIMUM_ROSTER).
#ifdef WC_MINIMUM_ROSTER
#include "roster.h"
#include "tiberiandawn/function.h"

namespace
{
    const StructType RosterBuildings[] = {STRUCT_POWER, STRUCT_REFINERY, STRUCT_BARRACKS, STRUCT_WEAP, STRUCT_GTOWER};
    const UnitType RosterUnits[] = {UNIT_HARVESTER, UNIT_JEEP, UNIT_MTANK};
    const InfantryType RosterInfantry[] = {INFANTRY_E1};

    template <class T, class E, size_t N> bool In(E value, const T (&list)[N])
    {
        for (size_t i = 0; i < N; i++)
            if (list[i] == value)
                return true;
        return false;
    }

    void Set(TechnoTypeClass const& type, bool buildable)
    {
        TechnoTypeClass& t = const_cast<TechnoTypeClass&>(type);
        t.IsBuildable = buildable;
        if (buildable)
            t.Ownable |= HOUSEF_GOOD | HOUSEF_BAD;
    }
} // namespace

void Browser_Apply_Roster()
{
    for (int i = 0; i < STRUCT_COUNT; i++) {
        StructType s = (StructType)i;
        BuildingTypeClass const& type = BuildingTypeClass::As_Reference(s);
        if (s == STRUCT_CONST)
            continue;
        Set(type, In(s, RosterBuildings));
    }
    for (int i = 0; i < UNIT_COUNT; i++)
        Set(UnitTypeClass::As_Reference((UnitType)i), In((UnitType)i, RosterUnits));
    for (int i = 0; i < INFANTRY_COUNT; i++)
        Set(InfantryTypeClass::As_Reference((InfantryType)i), In((InfantryType)i, RosterInfantry));
    for (int i = 0; i < AIRCRAFT_COUNT; i++)
        Set(AircraftTypeClass::As_Reference((AircraftType)i), false);
    printf("[browser-event] roster structures=%d units=%d infantry=%d\n",
           (int)(sizeof(RosterBuildings) / sizeof(RosterBuildings[0])),
           (int)(sizeof(RosterUnits) / sizeof(RosterUnits[0])),
           (int)(sizeof(RosterInfantry) / sizeof(RosterInfantry[0])));
    fflush(stdout);
}
#endif
