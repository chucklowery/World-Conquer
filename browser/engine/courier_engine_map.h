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
    Map.Set_Map_Dimensions(16,16,18,11);
    for(int i=0;i<198;i++){
        const CELL cell=static_cast<CELL>(plan.cells[i]);
        if(!Map.In_Radar(cell))return false;
        Map[cell].Override_Land_Type(mission.blocked[i]?LAND_ROCK:LAND_CLEAR);
    }
    for(int i=0;i<198;i++){
        const CELL cell=static_cast<CELL>(plan.cells[i]);
        if(Map[cell].Land_Type()!=(mission.blocked[i]?LAND_ROCK:LAND_CLEAR))return false;
    }
    return true;
}
}
