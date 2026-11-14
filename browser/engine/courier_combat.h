#pragma once
// Original-content tactical combat rules for the browser alpha. Movement of
// the two player units stays owned by VanillaTD's live InfantryClass objects;
// these deterministic rules own sentry reactions and mission health only.
#include "native_slice_core.h"

namespace courier {
struct Combat {
    std::array<int,2> focus;
    std::array<int,4> lastShot;
    std::array<int,4> lastHit;
    Combat():focus{{-1,-1}},lastShot{{-100,-100,-100,-100}},
        lastHit{{-100,-100,-100,-100}}{}
};

inline bool orderAttack(const State& s,Combat& combat,int player,int enemy){
    if(s.phase!=0||player<0||player>=2||enemy<2||enemy>=4||
       s.units[player].hp<=0||s.units[enemy].hp<=0)return false;
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

    // The squad auto-defends within two tiles. Explicit attack orders choose
    // which sentry to focus when more than one is in range.
    if(s.frame%3==0)for(int i=0;i<2;i++){
        const Unit& player=s.units[i];
        if(player.hp<=0)continue;
        int enemy=combat.focus[i];
        if(enemy<2||enemy>=4||s.units[enemy].hp<=0||distance(player.p,s.units[enemy].p)>2){
            enemy=-1;
            for(int j=2;j<4;j++)if(s.units[j].hp>0&&distance(player.p,s.units[j].p)<=2){
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

    // Sentries pursue nearby living squad members and engage only on contact.
    // A low fire rate gives players time to react and keeps extraction viable.
    for(int j=2;j<4;j++){
        Unit& enemy=s.units[j];
        if(enemy.hp<=0)continue;
        int nearest=-1;
        for(int i=0;i<2;i++)if(s.units[i].hp>0&&
            (nearest<0||distance(enemy.p,s.units[i].p)<distance(enemy.p,s.units[nearest].p)))nearest=i;
        if(nearest<0)break;
        const int d=distance(enemy.p,s.units[nearest].p);
        if(d==1&&s.frame%12==0){
            --s.units[nearest].hp;
            combat.lastShot[j]=s.frame;
            combat.lastHit[nearest]=s.frame;
        }else if(d>1&&d<=6&&s.frame%4==0){
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
