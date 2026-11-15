#pragma once
// Pure placement plan for translating any validated tactical scenario into
// a larger VanillaTD cell grid. This deliberately does not touch MapClass.
#include "native_slice_core.h"
#include <limits>

namespace courier {
struct WorldPlan {
    std::vector<int> cells;
    std::array<int,4> units;
    std::array<int,2> crates;
    int extraction;
    int blockedCount;
};
inline bool planWorld(const State& state,int originX,int originY,int mapWidth,int mapHeight,WorldPlan& output){
    if(originX<0||originY<0||state.width<8||state.width>32||state.height<8||state.height>24||
       mapWidth<state.width||mapHeight<state.height||
       originX>mapWidth-state.width||originY>mapHeight-state.height||
       state.blocked.size()!=static_cast<size_t>(state.width*state.height)||
       state.terrain.size()!=state.blocked.size()||
       static_cast<long long>(mapWidth)*mapHeight>std::numeric_limits<int>::max())return false;
    WorldPlan plan={};
    plan.cells.resize(state.width*state.height);
    for(int y=0;y<state.height;y++)for(int x=0;x<state.width;x++){
        const int index=y*state.width+x;
        plan.cells[index]=(originY+y)*mapWidth+originX+x;
        if(state.blocked[index])++plan.blockedCount;
    }
    for(int i=0;i<4;i++){
        const Point p=state.units[i].p;
        if(!inside(state,p))return false;
        plan.units[i]=plan.cells[p.y*state.width+p.x];
        for(int j=0;j<i;j++)if(plan.units[i]==plan.units[j])return false;
    }
    for(int i=0;i<2;i++){
        const Point p=state.crates[i];
        if(!inside(state,p))return false;
        plan.crates[i]=plan.cells[p.y*state.width+p.x];
        for(int j=0;j<i;j++)if(plan.crates[i]==plan.crates[j])return false;
    }
    if(!inside(state,state.exit))return false;
    plan.extraction=plan.cells[state.exit.y*state.width+state.exit.x];
    output=plan;
    return true;
}
}
