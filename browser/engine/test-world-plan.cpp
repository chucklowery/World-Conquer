#include "courier_world_plan.h"
#include <cassert>
#include <cstdio>
#include <fstream>
#include <iterator>
int main(){
    std::ifstream source("game/content/missions/courier-extraction.map");
    assert(source.good());
    const std::string data((std::istreambuf_iterator<char>(source)),std::istreambuf_iterator<char>());
    courier::State state;
    assert(courier::loadMap(state,data));
    courier::WorldPlan plan={};
    assert(courier::planWorld(state,16,16,128,128,plan));
    assert(plan.cells[0]==16*128+16);
    assert(plan.cells[197]==26*128+33);
    assert(plan.units[0]==18*128+17);
    assert(plan.units[1]==19*128+18);
    assert(plan.crates[0]==18*128+23);
    assert(plan.extraction==25*128+32);
    assert(plan.blockedCount==14);
    const courier::WorldPlan prior=plan;
    assert(!courier::planWorld(state,-1,16,128,128,plan));
    assert(!courier::planWorld(state,120,16,128,128,plan));
    assert(!courier::planWorld(state,16,120,128,128,plan));
    assert(!courier::planWorld(state,0,0,0,0,plan));
    assert(!courier::planWorld(state,16,16,2147483647,2147483647,plan));
    assert(plan.cells==prior.cells);
    state.units[0].p={5,2}; // obstructed spawn must never stage
    assert(!courier::planWorld(state,16,16,128,128,plan));
    std::puts("PASS: Courier map safely plans a 128x128 VanillaTD cell footprint");
}
