#pragma once
// Small deterministic native tactical mission, independent of EA media.
// Kept header-only to exercise the exact simulation with a host C++11 test.
#include <algorithm>
#include <array>
#include <cstdlib>
#include <queue>
#include <sstream>
#include <limits>
#include <cstdint>
#include <string>
#include <vector>

namespace courier {
struct Point { int x,y; };
inline bool operator==(Point a,Point b){return a.x==b.x&&a.y==b.y;}
inline int distance(Point a,Point b){return std::abs(a.x-b.x)+std::abs(a.y-b.y);}
struct Unit { Point p;int hp;bool enemy;std::vector<Point> route; };
struct Rect { int x,y,w,h; };
struct Resource { Point p;int amount; };
// One canonical terrain table, shared by pathfinding, engine staging and HUD.
// Codes: clear, rock, rough, marsh, cliff. Rock/cliff are impassable.
inline bool passableTerrain(uint8_t type){return type!=1&&type!=4;}
inline int movementCost(uint8_t type){return type==2?2:type==3?3:passableTerrain(type)?1:0;}
inline uint8_t terrainCode(char token){
    const std::string symbols=".#:~^";
    const size_t index=symbols.find(token);
    return index==std::string::npos?255:static_cast<uint8_t>(index);
}
// Optional observer for accepted orders, including cancellation. The observer
// must not mutate State and is never called for rejected destinations.
typedef void (*OrderSink)(int index,bool hasTarget,Point target,void* context);
struct State {
    std::array<Unit,4> units;
    std::array<Point,2> crates;
    std::array<bool,2> collected;
    Point exit;
    int width,height;
    std::vector<uint8_t> terrain;
    std::vector<bool> blocked;
    std::vector<Resource> resources;
    std::array<Rect,2> spawnZones;
    std::array<Point,2> bases;
    Rect victory;
    std::string mapId,title,biome;
    std::array<Point,2> navTargets;
    std::array<bool,2> hasNav;
    OrderSink orderSink;
    void* orderContext;
    int selected,frame,cargo; // phase: 0 playing, 1 victory, 2 defeat
    int phase;
    State():units{{{{1,2},5,false,{}},{{2,3},6,false,{}},{{10,2},3,true,{}},{{14,6},3,true,{}}}},
        crates{{{7,2},{15,4}}},collected{{false,false}},exit{16,9},
        width(18),height(11),terrain(198,0),blocked(198,false),
        spawnZones{{{0,0,5,5},{10,2,8,9}}},bases{{{0,0},{17,10}}},victory{15,8,3,3},
        mapId("courier-extraction"),title("Courier Extraction"),biome("temperate"),
        navTargets{{{0,0},{0,0}}},hasNav{{false,false}},orderSink(nullptr),orderContext(nullptr),
        selected(0),frame(0),cargo(0),phase(0){
        const Point walls[]={{5,2},{5,3},{5,4},{5,5},{5,6},{9,5},{10,5},
            {11,5},{12,5},{12,6},{12,7},{3,8},{4,8},{5,8}};
        for(Point p:walls){blocked[p.y*width+p.x]=true;terrain[p.y*width+p.x]=1;}
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
    return p.x>=0&&p.x<s.width&&p.y>=0&&p.y<s.height&&!s.blocked[p.y*s.width+p.x];
}
inline bool inRect(Point p,Rect r){return p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.w&&p.y<r.y+r.h;}
inline bool loadLegacyMap(State& state,const std::string& source){
    // Validate an entire fixed-size mission before committing any state.
    State candidate;
    candidate.blocked.assign(198,false);candidate.terrain.assign(198,0);
    std::array<int,7> counts;counts.fill(0);
    const std::string symbols="SRAB12X";
    size_t offset=0;
    for(int y=0;y<11;y++){
        if(offset+18>source.size())return false;
        for(int x=0;x<18;x++){
            const char token=source[offset+x];
            if(token=='#'){candidate.blocked[y*18+x]=true;candidate.terrain[y*18+x]=1;}
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
// WC-MAP 2 is intentionally a small, bounded, strict line format. Parsing is
// transactional; malformed content cannot mutate the active mission.
inline bool loadMapV2(State& state,const std::string& source){
    if(source.size()>65536||source.empty()||source.find('\r')!=std::string::npos||
       source.find('\0')!=std::string::npos)return false;
    std::istringstream input(source);std::string line;
    const auto next=[&](const std::string& expected)->bool{
        return static_cast<bool>(std::getline(input,line))&&line==expected;
    };
    const auto field=[&](const std::string& key,std::string& value)->bool{
        if(!std::getline(input,line)||line.compare(0,key.size()+1,key+" ")!=0)return false;
        value=line.substr(key.size()+1);
        if(value.empty()||value.size()>64)return false;
        for(char c:value)if(c<32||c>126||c=='"'||c=='\\')return false;
        return true;
    };
    const auto numbers=[&](const std::string& key,int* values,int count)->bool{
        if(!std::getline(input,line))return false;
        std::istringstream parts(line);std::string name,extra;
        if(!(parts>>name)||name!=key)return false;
        for(int i=0;i<count;i++)if(!(parts>>values[i])||values[i]<0||values[i]>100000)return false;
        return !(parts>>extra);
    };
    if(!next("WC-MAP 2"))return false;
    State candidate;
    if(!field("id",candidate.mapId)||candidate.mapId.find_first_not_of("abcdefghijklmnopqrstuvwxyz0123456789-")!=std::string::npos||
       !field("title",candidate.title)||!field("biome",candidate.biome))return false;
    int size[2];if(!numbers("size",size,2))return false;
    candidate.width=size[0];candidate.height=size[1];
    if(candidate.width<8||candidate.width>32||candidate.height<8||candidate.height>24||
       !next("terrain"))return false;
    candidate.terrain.clear();candidate.blocked.clear();
    for(int y=0;y<candidate.height;y++){
        if(!std::getline(input,line)||static_cast<int>(line.size())!=candidate.width)return false;
        for(char c:line){
            const uint8_t type=terrainCode(c);if(type==255)return false;
            candidate.terrain.push_back(type);
            candidate.blocked.push_back(!passableTerrain(type));
        }
    }
    if(!next("endterrain"))return false;
    for(int house=0;house<2;house++){
        int values[5];if(!numbers("spawn",values,5)||values[0]!=house+1)return false;
        const Rect r={values[1],values[2],values[3],values[4]};
        if(!r.w||!r.h||r.x+r.w>candidate.width||r.y+r.h>candidate.height)return false;
        candidate.spawnZones[house]=r;
    }
    for(int house=0;house<2;house++){
        int values[3];if(!numbers("base",values,3)||values[0]!=house+1)return false;
        candidate.bases[house]={values[1],values[2]};
        if(!inside(candidate,candidate.bases[house])||
           !inRect(candidate.bases[house],candidate.spawnZones[house]))return false;
    }
    const std::string labels="SRAB";
    for(int i=0;i<4;i++){
        if(!std::getline(input,line))return false;
        std::istringstream parts(line);std::string directive,label,extra;int x=-1,y=-1;
        if(!(parts>>directive>>label>>x>>y)||directive!="unit"||label!=labels.substr(i,1)||
           (parts>>extra)||x<0||y<0)return false;
        candidate.units[i].p={x,y};
        if(!inside(candidate,candidate.units[i].p)||
           !inRect(candidate.units[i].p,candidate.spawnZones[i<2?0:1]))return false;
        for(int j=0;j<i;j++)if(candidate.units[j].p==candidate.units[i].p)return false;
    }
    for(int i=0;i<2;i++){
        int values[3];if(!numbers("crate",values,3)||values[0]!=i+1)return false;
        candidate.crates[i]={values[1],values[2]};
        if(!inside(candidate,candidate.crates[i])||
           (i&&candidate.crates[0]==candidate.crates[i]))return false;
    }
    candidate.resources.clear();
    // Exactly 0..16 resource directives, followed by victory. Reject duplicate
    // nodes, out-of-bounds positions and zero/overflowing amounts.
    if(!std::getline(input,line))return false;
    while(line.compare(0,9,"resource ")==0){
        if(candidate.resources.size()>=16)return false;
        std::istringstream parts(line);std::string name,extra;int x=-1,y=-1,amount=0;
        if(!(parts>>name>>x>>y>>amount)||(parts>>extra)||amount<1||amount>100000)return false;
        const Point p={x,y};if(!inside(candidate,p))return false;
        for(const Resource& r:candidate.resources)if(r.p==p)return false;
        candidate.resources.push_back({p,amount});
        if(!std::getline(input,line))return false;
    }
    {
        std::istringstream parts(line);std::string name,extra;Rect& r=candidate.victory;
        if(!(parts>>name>>r.x>>r.y>>r.w>>r.h)||name!="victory"||
           (parts>>extra)||r.x<0||r.y<0||r.w<1||r.h<1||
           r.x>=candidate.width||r.y>=candidate.height||
           r.w>candidate.width-r.x||r.h>candidate.height-r.y)return false;
    }
    int exit[2];if(!numbers("exit",exit,2))return false;
    candidate.exit={exit[0],exit[1]};
    if(!inside(candidate,candidate.exit)||!inRect(candidate.exit,candidate.victory)||
       !next("endmap"))return false;
    // One optional final LF; never permit trailing directives or control data.
    if(std::getline(input,line))return false;
    state=candidate;return true;
}
inline bool loadMap(State& state,const std::string& source){
    if(source.size()>65536)return false;
    return source.compare(0,9,"WC-MAP 2\n")==0?loadMapV2(state,source):loadLegacyMap(state,source);
}
inline bool occupied(const State& s,Point p,int ignore){
    for(int i=0;i<4;i++)if(i!=ignore&&s.units[i].hp>0&&s.units[i].p==p)return true;
    return false;
}
inline std::vector<Point> route(const State& s,int index,Point goal){
    if(!inside(s,goal)||occupied(s,goal,index))return {};
    const Point start=s.units[index].p;
    const int size=s.width*s.height,source=start.y*s.width+start.x,target=goal.y*s.width+goal.x;
    std::vector<int> previous(size,-1),best(size,std::numeric_limits<int>::max());
    typedef std::pair<int,std::pair<int,int>> Entry; // cost, insertion order, tile
    std::priority_queue<Entry,std::vector<Entry>,std::greater<Entry>> pending;
    int sequence=0;pending.push({0,{sequence++,source}});best[source]=0;previous[source]=source;
    const Point directions[]={{1,0},{0,1},{-1,0},{0,-1}};
    while(!pending.empty()){
        const Entry entry=pending.top();pending.pop();
        const int id=entry.second.second;if(entry.first!=best[id])continue;
        if(id==target)break;
        Point p{id%s.width,id/s.width};
        for(Point d:directions){Point next{p.x+d.x,p.y+d.y};
            if(!inside(s,next)||occupied(s,next,index))continue;
            const int n=next.y*s.width+next.x;
            const int cost=entry.first+movementCost(s.terrain[n]);
            if(cost>=best[n])continue;
            best[n]=cost;previous[n]=id;pending.push({cost,{sequence++,n}});
        }
    }
    if(previous[target]<0)return {};
    std::vector<Point> result;
    for(int n=target;n!=source;n=previous[n])result.push_back({n%s.width,n/s.width});
    std::reverse(result.begin(),result.end());return result;
}
// Adapter boundary mirrors FootClass::Assign_Destination/NavCom semantics:
// the command persists independently of the current path. It may later be
// forwarded to a real FootClass once the production game is initialized.
inline bool assignDestination(State& s,int index,Point target){
    if(index<0||index>=2||s.units[index].hp<=0||!inside(s,target))return false;
    if(target==s.units[index].p){
        s.hasNav[index]=false;s.units[index].route.clear();
        if(s.orderSink)s.orderSink(index,false,target,s.orderContext);
        return true;
    }
    const std::vector<Point> path=route(s,index,target);
    if(path.empty())return false;
    s.navTargets[index]=target;s.hasNav[index]=true;s.units[index].route=path;
    if(s.orderSink)s.orderSink(index,true,target,s.orderContext);
    return true;
}
inline void click(State& s,Point p){
    if(s.phase!=0||!inside(s,p))return;
    for(int i=0;i<2;i++)if(s.units[i].hp>0&&s.units[i].p==p){s.selected=i;return;}
    assignDestination(s,s.selected,p);
}
inline void tick(State& s){
    if(s.phase!=0)return;
    ++s.frame;
    if(s.units[0].hp<=0&&s.units[1].hp<=0){s.phase=2;return;}
    for(int i=0;i<2;i++){
        Unit& u=s.units[i];
        if(u.hp<=0){s.hasNav[i]=false;u.route.clear();continue;}
        if(!s.hasNav[i])continue;
        if(u.route.empty()||occupied(s,u.route.front(),i)){
            u.route=route(s,i,s.navTargets[i]);
        }
        if(u.route.empty())continue; // destination remains assigned for retry
        Point next=u.route.front();
        if(occupied(s,next,i))continue;
        u.p=next;u.route.erase(u.route.begin());
        if(u.p==s.navTargets[i]){s.hasNav[i]=false;u.route.clear();}
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
    else if(s.cargo==2)for(int i=0;i<2;i++)if(s.units[i].hp>0&&
        (s.mapId=="courier-extraction"?distance(s.units[i].p,s.exit)<=1:
         inRect(s.units[i].p,s.victory)))s.phase=1;
}
}
