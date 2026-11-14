#pragma once
// Native VanillaTD target encoding boundary. No game-world globals are touched.
#include "native_slice_core.h"
#include "tiberiandawn/function.h"

namespace courier {
inline bool toEngineCell(Point tile,CELL& cell){
    if(tile.x<0||tile.y<0||tile.x>=18||tile.y>=11||
       tile.x>=MAP_CELL_W||tile.y>=MAP_CELL_H)return false;
    cell=static_cast<CELL>(tile.y*MAP_CELL_W+tile.x);
    return true;
}
inline bool toEngineTarget(Point tile,TARGET& target){
    CELL cell;
    if(!toEngineCell(tile,cell))return false;
    target=::As_Target(cell);return true;
}
inline bool fromEngineTarget(TARGET target,Point& tile){
    if(::Target_Kind(target)!=KIND_CELL)return false;
    const unsigned cell=::Target_Value(target);
    const Point candidate{static_cast<int>(cell%MAP_CELL_W),
                          static_cast<int>(cell/MAP_CELL_W)};
    CELL roundtrip;
    if(!toEngineCell(candidate,roundtrip)||static_cast<unsigned>(roundtrip)!=cell)return false;
    tile=candidate;return true;
}
}
