#include "courier_engine_foot.h"
#include <cassert>

// Compile against VanillaTD's real FootClass virtual API. The disabled
// branch is safe to run without production globals; live delivery requires
// the game-initialization sequence and is exercised in a later milestone.
int main(){
    courier::EngineFootBridge bridge;
    assert(!bridge.worldReady&&bridge.units[0]==nullptr);
    courier::EngineFootBridge::onOrder(0,true,{4,2},&bridge);
    courier::EngineFootBridge::onOrder(0,false,{4,2},&bridge);
    assert(bridge.delivered==0);
}
