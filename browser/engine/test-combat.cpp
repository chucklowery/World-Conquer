#include "courier_combat.h"
#include <cassert>
#include <cstdio>

// Pinned pre-R03 Courier rules. Do not replace this oracle with a second call
// into the new weapon model: it protects the original extraction balance.
static void legacyTick(courier::State& s,courier::Combat& combat){
    if(s.phase!=0)return;
    ++s.frame;
    if(s.frame%3==0)for(int i=0;i<2;i++){
        const courier::Unit& player=s.units[i];
        if(player.hp<=0)continue;
        int enemy=combat.focus[i];
        if(enemy<2||enemy>=4||s.units[enemy].hp<=0||courier::distance(player.p,s.units[enemy].p)>2){
            enemy=-1;
            for(int j=2;j<4;j++)if(s.units[j].hp>0&&courier::distance(player.p,s.units[j].p)<=2){
                enemy=j;break;
            }
        }
        if(enemy>=2){
            --s.units[enemy].hp;
            combat.lastShot[i]=s.frame;
            combat.lastHit[enemy]=s.frame;
            if(s.units[enemy].hp<=0)for(int k=0;k<2;k++)if(combat.focus[k]==enemy)combat.focus[k]=-1;
        }
    }
    for(int j=2;j<4;j++){
        courier::Unit& enemy=s.units[j];
        if(enemy.hp<=0)continue;
        int nearest=-1;
        for(int i=0;i<2;i++)if(s.units[i].hp>0&&
           (nearest<0||courier::distance(enemy.p,s.units[i].p)<courier::distance(enemy.p,s.units[nearest].p)))nearest=i;
        if(nearest<0)break;
        const int d=courier::distance(enemy.p,s.units[nearest].p);
        if(d==1&&s.frame%12==0){
            --s.units[nearest].hp;
            combat.lastShot[j]=s.frame;
            combat.lastHit[nearest]=s.frame;
        }else if(d>1&&d<=6&&s.frame%4==0){
            const courier::Point directions[]={{1,0},{-1,0},{0,1},{0,-1}};
            for(courier::Point step:directions){
                courier::Point candidate{enemy.p.x+step.x,enemy.p.y+step.y};
                if(courier::inside(s,candidate)&&!courier::occupied(s,candidate,j)&&
                   courier::distance(candidate,s.units[nearest].p)<d){enemy.p=candidate;break;}
            }
        }
    }
    if(s.units[0].hp<=0&&s.units[1].hp<=0)s.phase=2;
}

static void parity(){
    courier::State oldState,liveState;
    oldState.units[0].p=liveState.units[0].p={8,2};
    oldState.units[1].p=liveState.units[1].p={12,8};
    courier::Combat oldCombat,liveCombat;
    assert(courier::orderAttack(oldState,oldCombat,0,2));
    assert(courier::orderAttack(liveState,liveCombat,0,2));
    for(int t=0;t<48;t++){
        legacyTick(oldState,oldCombat);courier::tickCombat(liveState,liveCombat);
        assert(oldState.frame==liveState.frame&&oldState.phase==liveState.phase);
        for(int i=0;i<4;i++){
            assert(oldState.units[i].hp==liveState.units[i].hp);
            assert(oldState.units[i].p==liveState.units[i].p);
            assert(oldCombat.lastShot[i]==liveCombat.lastShot[i]);
            assert(oldCombat.lastHit[i]==liveCombat.lastHit[i]);
        }
        for(int i=0;i<2;i++)assert(oldCombat.focus[i]==liveCombat.focus[i]);
    }
}

int main(){
    parity();
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
