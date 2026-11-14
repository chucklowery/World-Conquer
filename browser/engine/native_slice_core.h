#pragma once
// Small deterministic native tactical mission, independent of EA media.
// Kept header-only to exercise the exact simulation with a host C++11 test.
#include <algorithm>
#include <array>
#include <cstdlib>
#include <queue>
#include <string>
#include <vector>

namespace courier {
struct Point { int x,y; };
inline bool operator==(Point a,Point b){return a.x==b.x&&a.y==b.y;}
inline int distance(Point a,Point b){return std::abs(a.x-b.x)+std::abs(a.y-b.y);}
struct Unit { Point p;int hp;bool enemy;std::vector<Point> route; };
struct State {
    std::array<Unit,4> units;
    std::array<Point,2> crates;
    std::array<bool,2> collected;
    Point exit;
    std::array<bool,198> blocked;
    int selected,frame,cargo; // phase: 0 playing, 1 victory, 2 defeat
    int phase;
    State():units{{{{1,2},5,false,{}},{{2,3},6,false,{}},{{10,2},3,true,{}},{{14,6},3,true,{}}}},
        crates{{{7,2},{15,4}}},collected{{false,false}},exit{16,9},selected(0),frame(0),cargo(0),phase(0){
        blocked.fill(false);
        const Point walls[]={{5,2},{5,3},{5,4},{5,5},{5,6},{9,5},{10,5},
            {11,5},{12,5},{12,6},{12,7},{3,8},{4,8},{5,8}};
        for(Point p:walls)blocked[p.y*18+p.x]=true;
    }
};
inline bool inside(Point p){
    if(p.x<0||p.x>=18||p.y<0||p.y>=11)return false;
    static const Point walls[]={{5,2},{5,3},{5,4},{5,5},{5,6},{9,5},{10,5},
        {11,5},{12,5},{12,6},{12,7},{3,8},{4,8},{5,8}};
    for(Point wall:walls)if(wall==p)return false;
    return true;
}
inline bool inside(const State& s,Point p){
    return p.x>=0&&p.x<18&&p.y>=0&&p.y<11&&!s.blocked[p.y*18+p.x];
}
inline bool loadMap(State& state,const std::string& source){
    // Validate an entire fixed-size mission before committing any state.
    State candidate;
    candidate.blocked.fill(false);
    std::array<int,7> counts;counts.fill(0);
    const std::string symbols="SRAB12X";
    size_t offset=0;
    for(int y=0;y<11;y++){
        if(offset+18>source.size())return false;
        for(int x=0;x<18;x++){
            const char token=source[offset+x];
            if(token=='#')candidate.blocked[y*18+x]=true;
            else if(token!='.'){
                const size_t index=symbols.find(token);
                if(index==std::string::npos||++counts[index]!=1)return false;
                const Point p{x,y};
                if(index<4)candidate.units[index].p=p;
                else if(index<6)candidate.crates[index-4]=p;
                else candidate.exit=p;
            }
        }
        offset+=18;
        if(y<10){
            if(offset>=source.size()||source[offset]!='\n')return false;
            offset++;
        }
    }
    if(offset<source.size()&&source[offset]=='\n')offset++;
    if(offset!=source.size())return false;
    for(int count:counts)if(count!=1)return false;
    state=candidate;return true;
}
inline bool occupied(const State& s,Point p,int ignore){
    for(int i=0;i<4;i++)if(i!=ignore&&s.units[i].hp>0&&s.units[i].p==p)return true;
    return false;
}
inline std::vector<Point> route(const State& s,int index,Point goal){
    if(!inside(s,goal)||occupied(s,goal,index))return {};
    const Point start=s.units[index].p;
    const int size=18*11,source=start.y*18+start.x,target=goal.y*18+goal.x;
    std::array<int,size> previous;previous.fill(-1);
    std::queue<int> pending;pending.push(source);previous[source]=source;
    const Point directions[]={{1,0},{0,1},{-1,0},{0,-1}};
    while(!pending.empty()&&previous[target]<0){
        int id=pending.front();pending.pop();Point p{id%18,id/18};
        for(Point d:directions){Point next{p.x+d.x,p.y+d.y};
            if(!inside(s,next)||occupied(s,next,index))continue;
            int n=next.y*18+next.x;if(previous[n]>=0)continue;
            previous[n]=id;pending.push(n);
        }
    }
    if(previous[target]<0)return {};
    std::vector<Point> result;
    for(int n=target;n!=source;n=previous[n])result.push_back({n%18,n/18});
    std::reverse(result.begin(),result.end());return result;
}
inline void click(State& s,Point p){
    if(s.phase!=0||!inside(s,p))return;
    for(int i=0;i<2;i++)if(s.units[i].hp>0&&s.units[i].p==p){s.selected=i;return;}
    if(s.units[s.selected].hp>0)s.units[s.selected].route=route(s,s.selected,p);
}
inline void tick(State& s){
    if(s.phase!=0)return;
    ++s.frame;
    if(s.units[0].hp<=0&&s.units[1].hp<=0){s.phase=2;return;}
    for(int i=0;i<2;i++){
        Unit& u=s.units[i];if(u.hp<=0||u.route.empty())continue;
        Point next=u.route.front();
        if(occupied(s,next,i)){u.route.clear();continue;}
        u.p=next;u.route.erase(u.route.begin());
    }
    for(int j=0;j<2;j++)if(!s.collected[j])for(int i=0;i<2;i++){
        if(s.units[i].hp>0&&distance(s.units[i].p,s.crates[j])<=1){
            s.collected[j]=true;++s.cargo;break;
        }
    }
    for(int j=2;j<4;j++){
        Unit& enemy=s.units[j];if(enemy.hp<=0)continue;
        int player=-1;
        for(int i=0;i<2;i++)if(s.units[i].hp>0&&
            (player<0||distance(enemy.p,s.units[i].p)<distance(enemy.p,s.units[player].p)))player=i;
        if(player<0)break;
        const int d=distance(enemy.p,s.units[player].p);
        if(d==1&&s.frame%4==0)--s.units[player].hp;
        else if(d>1&&d<=6&&s.frame%3==0){
            const Point directions[]={{1,0},{-1,0},{0,1},{0,-1}};
            for(Point step:directions){Point candidate{enemy.p.x+step.x,enemy.p.y+step.y};
                if(inside(s,candidate)&&!occupied(s,candidate,j)&&
                    distance(candidate,s.units[player].p)<distance(enemy.p,s.units[player].p)){
                    enemy.p=candidate;break;
                }
            }
        }
    }
    if(s.frame%3==0)for(int i=0;i<2;i++)if(s.units[i].hp>0)
        for(int j=2;j<4;j++)if(s.units[j].hp>0&&distance(s.units[i].p,s.units[j].p)==1){
            --s.units[j].hp;break;
        }
    if(s.units[0].hp<=0&&s.units[1].hp<=0)s.phase=2;
    else if(s.cargo==2)for(int i=0;i<2;i++)if(s.units[i].hp>0&&distance(s.units[i].p,s.exit)<=1)s.phase=1;
}
}
