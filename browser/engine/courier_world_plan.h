#pragma once
// Pure placement plan for translating Courier's verified 18x11 scenario into
// a larger VanillaTD cell grid. This deliberately does not touch MapClass.
#include "native_slice_core.h"
#include <limits>

namespace courier {
struct WorldPlan {
    std::array<int,198> cells;
    std::array<int,4> units;
    std::array<int,2> crates;
    int extraction;
    int blockedCount;
};
inline bool planWorld(const State& state,int originX,int originY,int mapWidth,int mapHeight,WorldPlan& output){
    if(originX<0||originY<0||mapWidth<18||mapHeight<11||
       originX>mapWidth-18||originY>mapHeight-11||
       static_cast<long long>(mapWidth)*mapHeight>std::numeric_limits<int>::max())return false;
    WorldPlan plan={};
    for(int y=0;y<11;y++)for(int x=0;x<18;x++){
        const int index=y*18+x;
        plan.cells[index]=(originY+y)*mapWidth+originX+x;
        if(state.blocked[index])++plan.blockedCount;
    }
    for(int i=0;i<4;i++){
        const Point p=state.units[i].p;
        if(!inside(state,p))return false;
        plan.units[i]=plan.cells[p.y*18+p.x];
        for(int j=0;j<i;j++)if(plan.units[i]==plan.units[j])return false;
    }
    for(int i=0;i<2;i++){
        const Point p=state.crates[i];
        if(!inside(state,p))return false;
        plan.crates[i]=plan.cells[p.y*18+p.x];
        for(int j=0;j<i;j++)if(plan.crates[i]==plan.crates[j])return false;
    }
    if(!inside(state,state.exit))return false;
    plan.extraction=plan.cells[state.exit.y*18+state.exit.x];
    output=plan;
    return true;
}
}
