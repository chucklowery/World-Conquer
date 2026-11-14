#include "courier_engine_target.h"
#include <cassert>
#include <cstdio>

int main(){
    for(int y=0;y<11;y++)for(int x=0;x<18;x++){
        const courier::Point original{x,y};
        TARGET target=TARGET_NONE;
        assert(courier::toEngineTarget(original,target));
        assert(::Target_Kind(target)==KIND_CELL);
        assert(::Target_Value(target)==static_cast<unsigned>(y*MAP_CELL_W+x));
        courier::Point decoded{-1,-1};
        assert(courier::fromEngineTarget(target,decoded));
        assert(decoded==original);
    }
    TARGET target=TARGET_NONE;
    assert(!courier::toEngineTarget({-1,2},target));
    assert(!courier::toEngineTarget({18,2},target));
    assert(!courier::toEngineTarget({1,11},target));
    courier::Point output{7,7};
    assert(!courier::fromEngineTarget(TARGET_NONE,output));
    assert((output==courier::Point{7,7}));
    assert(!courier::fromEngineTarget(::As_Target(static_cast<CELL>(12*MAP_CELL_W)),output));
    assert(!courier::fromEngineTarget(::Build_Target(KIND_UNIT,1),output));
    std::puts("PASS: Courier tile orders use production VanillaTD cell TARGET encoding");
}
