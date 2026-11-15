// A separate one-shot diagnostic for production house/infantry allocation.
// No campaign game loop, assets, Unlimbo or combat/AI are started here.
#ifdef __EMSCRIPTEN__
#include "courier_engine_map.h"
#include <cstdio>

int Browser_Unit_Probe(){
    courier::State mission;
    courier::WorldPlan plan={};
    if(!courier::planWorld(mission,16,16,MAP_CELL_W,MAP_CELL_H,plan)||
       !courier::stageEngineMap(mission,plan)){
        std::puts("[browser-unit-probe] ERROR: production map unavailable");
        return 2;
    }
    // These fixed pools are normally allocated by Init_Game(). Their capacity
    // must exist before either class's custom operator new can be invoked.
    Houses.Set_Heap(HOUSE_MAX);
    Infantry.Set_Heap(INFANTRY_MAX);
    HouseClass::Init();
    InfantryClass::Init();
    HouseClass* owner=new HouseClass(HOUSE_GOOD);
    if(!owner){std::puts("[browser-unit-probe] ERROR: house allocation failed");return 3;}
    InfantryClass* scout=new InfantryClass(INFANTRY_E1,HOUSE_GOOD);
    if(!scout){std::puts("[browser-unit-probe] ERROR: infantry allocation failed");return 4;}
    PlayerPtr=owner;
    owner->IsHuman=true;
    GameActive=true;
    ++ScenarioInit; // bypass full campaign placement constraints during staging
    const bool placed=scout->Unlimbo(Cell_Coord(static_cast<CELL>(plan.units[0])),DIR_E);
    --ScenarioInit;
    if(!placed||Coord_Cell(scout->Coord)!=static_cast<CELL>(plan.units[0])){
        std::puts("[browser-unit-probe] ERROR: infantry Unlimbo failed");return 6;
    }
    const TARGET destination=::As_Target(static_cast<CELL>(plan.cells[2*18+4]));
    // Use the base command setter for this placement diagnostic; the full
    // movement mission will use the virtual InfantryClass movement path.
    scout->FootClass::Assign_Destination(destination);
    if(scout->House!=owner||scout->NavCom!=destination){
        std::puts("[browser-unit-probe] ERROR: infantry command mismatch");return 5;
    }
    std::printf("[browser-unit-probe] native house=created infantry=created nav-target=%u on-map=yes cell=%d\n",
                ::Target_Value(scout->NavCom),static_cast<int>(Coord_Cell(scout->Coord)));
    // The one-shot module is discarded on page reload. Avoid running global
    // scenario destructors without the remaining production game lifecycle.
    return 0;
}
#endif
