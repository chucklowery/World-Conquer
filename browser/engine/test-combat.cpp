#include "courier_combat.h"
#include <cassert>
#include <cstdio>

int main(){
    courier::State s;
    courier::Combat combat;
    s.units[0].p={8,2};s.units[1].p={1,3};
    assert(courier::orderAttack(s,combat,0,2));
    assert(combat.focus[0]==2);
    assert(!courier::orderAttack(s,combat,0,1));
    for(int i=0;i<9;i++)courier::tickCombat(s,combat);
    assert(s.units[2].hp<=0);
    assert(combat.focus[0]==-1);
    assert(combat.lastShot[0]>=3);
    assert(s.units[0].hp>0);
    courier::Point candidate{-1,-1};
    assert(courier::approachEnemy(s,0,3,candidate));
    assert(courier::inside(s,candidate));
    assert(courier::distance(candidate,s.units[3].p)<=2);
    courier::State lost;
    lost.units[0].hp=lost.units[1].hp=0;
    courier::tickCombat(lost,combat);
    assert(lost.phase==2);
    assert(!courier::orderAttack(lost,combat,0,3));
    courier::State chasing;
    chasing.units[0].p={8,2};
    chasing.units[1].p={1,3};
    for(int i=0;i<4;i++)courier::tickCombat(chasing,combat);
    const courier::Point pursued{9,2};
    assert(chasing.units[2].p==pursued);
    std::puts("PASS: tactical combat orders, sentry pursuit, auto-defense, damage and defeat");
}
