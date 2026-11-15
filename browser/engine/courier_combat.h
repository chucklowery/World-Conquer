#pragma once
// Original-content tactical combat rules for the browser alpha. Movement of
// the two player units stays owned by VanillaTD's live InfantryClass objects;
// these deterministic rules own sentry reactions and mission health only.
#include "native_slice_core.h"
#include "rts_weapon_system.h"

namespace courier {
struct Combat {
    std::array<int,2> focus;
    std::array<int,4> lastShot;
    std::array<int,4> lastHit;
    rtscombat::System weapons;
    bool initialized;
    bool drill;
    std::vector<rtscombat::Event> events;
    Combat():focus{{-1,-1}},lastShot{{-100,-100,-100,-100}},
        lastHit{{-100,-100,-100,-100}},initialized(false),drill(false){}
};

inline void synchronizeCombat(const State& s,Combat& combat){
    if(!combat.initialized){
        // Courier compatibility profile. These IDs are R00's permanent IDs;
        // future factions may register their own weapons and actor classes.
        const rtscombat::Weapon rifle={1,2,3,1,rtscombat::Infantry,
            rtscombat::SmallArms,rtscombat::Instant,0,0,3,false,true,rtscombat::EnemiesOnly};
        const rtscombat::Weapon sentry={2,1,12,1,rtscombat::Infantry,
            rtscombat::SmallArms,rtscombat::Instant,0,0,12,false,true,rtscombat::EnemiesOnly};
        const rtscombat::Weapon armoredSentry={3,3,3,1,rtscombat::Infantry,
            rtscombat::SmallArms,rtscombat::Instant,0,0,3,true,false,rtscombat::EnemiesOnly};
        combat.weapons.addWeapon(rifle);combat.weapons.addWeapon(sentry);
        combat.weapons.addWeapon(armoredSentry);
        std::vector<uint8_t> terrain;
        for(bool blocked:s.blocked)terrain.push_back(blocked?1:0);
        combat.weapons.setTerrain(terrain);
        for(int i=0;i<4;i++){
            const Unit& u=s.units[i];
            combat.weapons.addActor({static_cast<uint32_t>(i<2?1001+i:1999+i),
                static_cast<uint16_t>(i<2?1:2),static_cast<uint16_t>(i<2?1:2),
                i>=2&&combat.drill?rtscombat::Vehicle:rtscombat::Infantry,
                i>=2&&combat.drill?rtscombat::Heavy:rtscombat::Soft,
                {u.p.x,u.p.y},u.hp,
                static_cast<uint16_t>(i<2?1:combat.drill?3:2),true,0,-1});
        }
        combat.initialized=true;
    }
    for(int i=0;i<4;i++){
        rtscombat::Actor* actor=combat.weapons.find(i<2?1001+i:1999+i);
        if(actor){actor->hp=s.units[i].hp;actor->position={s.units[i].p.x,s.units[i].p.y};}
    }
}

inline bool orderAttack(const State& s,Combat& combat,int player,int enemy){
    if(s.phase!=0||player<0||player>=2||enemy<2||enemy>=4||
       s.units[player].hp<=0||s.units[enemy].hp<=0||combat.drill)return false;
    synchronizeCombat(s,combat);
    if(!combat.weapons.orderAttack(1001+player,1999+enemy))return false;
    combat.focus[player]=enemy;
    return true;
}

inline bool approachEnemy(const State& s,int player,int enemy,Point& destination){
    if(player<0||player>=2||enemy<2||enemy>=4||
       s.units[player].hp<=0||s.units[enemy].hp<=0)return false;
    const Point target=s.units[enemy].p;
    int best=100000;
    bool found=false;
    for(int y=target.y-2;y<=target.y+2;y++)for(int x=target.x-2;x<=target.x+2;x++){
        const Point candidate{x,y};
        if(distance(candidate,target)>2||!inside(s,candidate)||occupied(s,candidate,player))continue;
        const std::vector<Point> path=route(s,player,candidate);
        if(path.empty()&&!(candidate==s.units[player].p))continue;
        const int score=static_cast<int>(path.size())*4+distance(candidate,target);
        if(score<best){best=score;destination=candidate;found=true;}
    }
    return found;
}

inline void tickCombat(State& s,Combat& combat){
    if(s.phase!=0)return;
    ++s.frame;
    synchronizeCombat(s,combat);
    for(int i=0;i<2;i++){
        if(combat.focus[i]<0)combat.weapons.cancel(1001+i);
        else if(!combat.weapons.orderAttack(1001+i,1999+combat.focus[i]))combat.focus[i]=-1;
    }
    combat.weapons.tick(static_cast<uint64_t>(s.frame));
    combat.events=combat.weapons.events();
    for(const rtscombat::Actor& a:combat.weapons.actors()){
        const int i=a.id<2000?static_cast<int>(a.id-1001):static_cast<int>(a.id-1999);
        s.units[i].hp=a.hp;
    }
    for(const rtscombat::Event& event:combat.events){
        const int source=event.source<2000?static_cast<int>(event.source-1001):static_cast<int>(event.source-1999);
        const int target=event.target<2000?static_cast<int>(event.target-1001):static_cast<int>(event.target-1999);
        if(event.type==rtscombat::Shot)combat.lastShot[source]=s.frame;
        if(event.type==rtscombat::Hit)combat.lastHit[target]=s.frame;
    }
    for(int i=0;i<2;i++)if(combat.focus[i]>=2&&s.units[combat.focus[i]].hp<=0)
        combat.focus[i]=-1;
    for(int i=0;i<2;i++)if(s.units[i].hp<=0){
        s.hasNav[i]=false;s.units[i].route.clear();combat.focus[i]=-1;
    }

    // Sentry pathing remains Courier-owned. All damage, including the legacy
    // contact shot, is now applied only by the weapon system above.
    for(int j=2;j<4;j++){
        Unit& enemy=s.units[j];
        if(enemy.hp<=0)continue;
        int nearest=-1;
        for(int i=0;i<2;i++)if(s.units[i].hp>0&&
            (nearest<0||distance(enemy.p,s.units[i].p)<distance(enemy.p,s.units[nearest].p)))nearest=i;
        if(nearest<0)break;
        const int d=distance(enemy.p,s.units[nearest].p);
        if(d>1&&d<=6&&s.frame%4==0){
            const Point directions[]={{1,0},{-1,0},{0,1},{0,-1}};
            for(Point step:directions){
                Point candidate{enemy.p.x+step.x,enemy.p.y+step.y};
                if(inside(s,candidate)&&!occupied(s,candidate,j)&&
                   distance(candidate,s.units[nearest].p)<d){enemy.p=candidate;break;}
            }
        }
    }
    if(s.units[0].hp<=0&&s.units[1].hp<=0)s.phase=2;
}
}
