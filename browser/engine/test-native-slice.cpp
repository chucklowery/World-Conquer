#include "native_slice_core.h"
#include <cassert>
#include <cstdio>
int main(){
    courier::State s;
    assert(s.phase==0&&s.cargo==0&&s.units[0].hp==5);
    assert(!courier::inside({5,2}));
    assert(courier::route(s,0,{5,2}).empty());
    courier::click(s,{7,2});
    assert(!s.units[0].route.empty());
    for(auto p:s.units[0].route)assert(courier::inside(p));
    courier::State win;
    win.units[2].hp=win.units[3].hp=0;
    win.units[0].p={7,2};courier::tick(win);assert(win.cargo==1);
    win.units[0].p={15,4};courier::tick(win);assert(win.cargo==2);
    win.units[0].p={16,8};courier::tick(win);assert(win.phase==1);
    courier::State lost;lost.units[0].hp=lost.units[1].hp=0;
    courier::tick(lost);assert(lost.phase==2);
    std::puts("PASS: native C++ Courier mission pathing, supply extraction, victory, defeat");
}
