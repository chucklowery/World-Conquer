#pragma once
// Opt-in bridge to live VanillaTD units. Must only be enabled after the
// production map, houses, infantry types and objects are initialized.
#include "courier_engine_target.h"

namespace courier {
struct EngineFootBridge {
    FootClass* units[2];
    bool worldReady;
    int originX,originY;
    bool issueMoveMission;
    unsigned delivered;
    EngineFootBridge():units{nullptr,nullptr},worldReady(false),originX(0),originY(0),
        issueMoveMission(false),delivered(0){}
    static void onOrder(int index,bool hasTarget,Point tile,void* context){
        EngineFootBridge& bridge=*static_cast<EngineFootBridge*>(context);
        if(!bridge.worldReady||index<0||index>=2||!bridge.units[index])return;
        TARGET target=TARGET_NONE;
        if(hasTarget){
            const int x=tile.x+bridge.originX,y=tile.y+bridge.originY;
            if(tile.x<0||tile.x>=18||tile.y<0||tile.y>=11||
               x<0||x>=MAP_CELL_W||y<0||y>=MAP_CELL_H)return;
            const CELL cell=static_cast<CELL>(y*MAP_CELL_W+x);
            if(!Map.In_Radar(cell))return;
            target=::As_Target(cell);
        }
        if(hasTarget&&bridge.issueMoveMission)bridge.units[index]->Assign_Mission(MISSION_MOVE);
        bridge.units[index]->Assign_Destination(target);
        ++bridge.delivered;
    }
};
}
