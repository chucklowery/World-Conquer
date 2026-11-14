#include "native_slice_core.h"
#include <cassert>
#include <cstdio>
#include <fstream>
#include <iterator>
int main(){
    std::ifstream source("game/content/missions/courier-extraction.map");
    assert(source.good());
    const std::string map((std::istreambuf_iterator<char>(source)),std::istreambuf_iterator<char>());
    courier::State s;
    assert(courier::loadMap(s,map));
    assert((s.units[0].p==courier::Point{1,2}));
    assert(!courier::inside(s,{5,2}));
    const courier::State baseline=s;
    assert(!courier::loadMap(s,map+"unexpected"));
    assert(s.units[0].p==baseline.units[0].p);
    assert(s.phase==0&&s.cargo==0&&s.units[0].hp==5);
    assert(!courier::inside({5,2}));
    assert(courier::route(s,0,{5,2}).empty());
    courier::click(s,{7,2});
    assert(!s.units[0].route.empty());
    assert(s.hasNav[0]&&(s.navTargets[0]==courier::Point{7,2}));
    for(auto p:s.units[0].route)assert(courier::inside(p));
    assert(!courier::assignDestination(s,0,{5,2}));
    assert(s.hasNav[0]&&(s.navTargets[0]==courier::Point{7,2}));
    assert(courier::assignDestination(s,0,{4,2}));
    assert((s.navTargets[0]==courier::Point{4,2}));
    s.units[2].hp=s.units[3].hp=0;
    s.units[1].p={3,2}; // another squad member temporarily blocks the next step
    courier::tick(s);
    assert((s.units[0].p==courier::Point{2,2}));
    assert(s.hasNav[0]);
    s.units[1].p={3,3};
    courier::tick(s);
    assert((s.units[0].p==courier::Point{3,2}));
    courier::tick(s);
    assert((s.units[0].p==courier::Point{4,2}));
    assert(!s.hasNav[0]&&s.units[0].route.empty());
    assert(courier::assignDestination(s,0,{4,2}));
    assert(!s.hasNav[0]);
    courier::State win;
    win.units[2].hp=win.units[3].hp=0;
    win.units[0].p={7,2};courier::tick(win);assert(win.cargo==1);
    win.units[0].p={15,4};courier::tick(win);assert(win.cargo==2);
    win.units[0].p={16,8};courier::tick(win);assert(win.phase==1);
    courier::State lost;lost.units[0].hp=lost.units[1].hp=0;
    courier::tick(lost);assert(lost.phase==2);
    std::puts("PASS: native C++ Courier mission pathing, supply extraction, victory, defeat");
}
