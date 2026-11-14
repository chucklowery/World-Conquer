#pragma once
// Opt-in bridge to live VanillaTD units. Must only be enabled after the
// production map, houses, infantry types and objects are initialized.
#include "courier_engine_target.h"

namespace courier {
struct EngineFootBridge {
    FootClass* units[2];
    bool worldReady;
    unsigned delivered;
    EngineFootBridge():units{nullptr,nullptr},worldReady(false),delivered(0){}
    static void onOrder(int index,bool hasTarget,Point tile,void* context){
        EngineFootBridge& bridge=*static_cast<EngineFootBridge*>(context);
        if(!bridge.worldReady||index<0||index>=2||!bridge.units[index])return;
        TARGET target=TARGET_NONE;
        if(hasTarget&&!toEngineTarget(tile,target))return;
        bridge.units[index]->Assign_Destination(target);
        ++bridge.delivered;
    }
};
}
