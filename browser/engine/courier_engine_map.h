#pragma once
// Standalone browser native-slice map staging. This modifies MapClass only in
// the dedicated browser mode, before any campaign world is initialized.
#include "courier_engine_foot.h"
#include "courier_world_plan.h"

namespace courier {
inline bool stageEngineMap(const State& mission,const WorldPlan& plan){
    // The editor initialization path intentionally omits UI/theater loading.
    // It is safe only once in a fresh browser-native-slice process.
    Map.One_Time_Editor();
    Map.Init_Cells();
    Map.Set_Map_Dimensions(16,16,mission.width,mission.height);
    const auto landAt=[&](size_t i)->LandType{
        if(mission.blocked[i])return LAND_ROCK;
        const int x=static_cast<int>(i%mission.width),y=static_cast<int>(i/mission.width);
        for(const Resource& node:mission.resources)if(node.p==Point{x,y})return LAND_TIBERIUM;
        return mission.terrain[i]==3?LAND_TIBERIUM:mission.terrain[i]==2?LAND_BEACH:LAND_CLEAR;
    };
    for(size_t i=0;i<plan.cells.size();i++){
        const CELL cell=static_cast<CELL>(plan.cells[i]);
        if(!Map.In_Radar(cell))return false;
        Map[cell].Override_Land_Type(landAt(i));
    }
    for(size_t i=0;i<plan.cells.size();i++){
        const CELL cell=static_cast<CELL>(plan.cells[i]);
        if(Map[cell].Land_Type()!=landAt(i))return false;
    }
    return true;
}
}
