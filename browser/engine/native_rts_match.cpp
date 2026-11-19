// R02/R03/R04 shared browser mode: R18 World owns canonical match state;
// real VanillaTD InfantryClass::AI and MapClass remain movement authority.
#ifdef __EMSCRIPTEN__
#include "courier_engine_map.h"
#include "rts_live_match.h"
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

namespace {
SDL_Window* window=nullptr;
SDL_Renderer* renderer=nullptr;
rts::LiveMatch match;
std::vector<InfantryClass*> live;
std::vector<courier::Point> previous;
HouseClass* houseAster=nullptr;
HouseClass* houseForge=nullptr;
Uint32 lastStep=0;
rts::EntityId selected=0;
orders::Kind clickKind=orders::Kind::Move;
// Bounded native tick-duration telemetry. This measures the synchronous
// simulation step (including publication), not the browser rAF interval.
std::vector<double> tickDurationsUs;

bool readFile(const char* path,size_t limit,std::string& data){
    FILE* file=std::fopen(path,"rb");
    if(!file)return false;
    data.clear();char chunk[2048];size_t n=0;
    while((n=std::fread(chunk,1,sizeof(chunk),file))!=0){
        if(data.size()+n>limit){std::fclose(file);return false;}
        data.append(chunk,n);
    }
    const bool okay=std::ferror(file)==0;
    std::fclose(file);return okay&&!data.empty();
}
CELL cell(courier::Point p){
    return static_cast<CELL>((p.y+16)*MAP_CELL_W+p.x+16);
}
void publish(){
    const rts::WorldSnapshot snapshot=match.snapshot();
    const std::string json=rts::worldJson(snapshot);
    EM_ASM({if(typeof WCRTS!=="undefined")WCRTS.receive(UTF8ToString($0),
             {allowWorldV3:true});},json.c_str());
}
bool place(){
    Houses.Set_Heap(HOUSE_MAX);
    Infantry.Set_Heap(INFANTRY_MAX);
    HouseClass::Init();InfantryClass::Init();
    houseAster=new HouseClass(HOUSE_GOOD);
    houseForge=new HouseClass(HOUSE_BAD);
    if(!houseAster||!houseForge)return false;
    // VanillaTD is movement authority here, not combat authority. Mutual
    // native alliances prevent MISSION_GUARD from acquiring targets and
    // entering firing animations; the R18 teams remain hostile and only the
    // R03 weapon system resolves damage, kills and match victory.
    houseAster->Make_Ally(HOUSE_BAD);
    houseForge->Make_Ally(HOUSE_GOOD);
    PlayerPtr=houseAster;houseAster->IsHuman=true;houseForge->IsHuman=false;
    GameActive=true;
    ++ScenarioInit;
    bool valid=true;
    for(const rts::LiveActor& actor:match.actors()){
        InfantryClass* inf=new InfantryClass(INFANTRY_E1,
            actor.owner==1?HOUSE_GOOD:HOUSE_BAD);
        if(!inf||!inf->Unlimbo(Cell_Coord(cell(actor.spawn)),DIR_E)){
            valid=false;break;
        }
        live.push_back(inf);previous.push_back(actor.spawn);
    }
    --ScenarioInit;
    std::printf("[rts-live] placed native infantry=%u houses=2 world-epoch=%u map=%s\n",
                static_cast<unsigned>(live.size()),match.world().epoch(),
                match.authored().mapId.c_str());
    return valid&&live.size()==match.actors().size();
}
bool restart(){
    if(!match.restart())return false;
    selected=0;
    ++ScenarioInit;
    bool valid=true;
    for(size_t i=0;i<live.size();i++){
        const courier::Point p=match.actors()[i].spawn;
        if(!live[i]||(!live[i]->IsInLimbo&&!live[i]->Limbo())||
           !live[i]->Unlimbo(Cell_Coord(cell(p)),DIR_E)){
            valid=false;break;
        }
        previous[i]=p;
    }
    --ScenarioInit;
    if(!valid)return false;
    std::printf("[rts-live] restarted epoch=%u actors=%u\n",
                match.world().epoch(),static_cast<unsigned>(live.size()));
    publish();return true;
}
void sync(){
    for(size_t i=0;i<live.size();i++){
        if(!live[i]||live[i]->IsInLimbo)continue;
        const rts::WorldEntity* entity=match.world().entity(match.actors()[i].id);
        if(!entity||entity->life!=rts::Life::Alive)continue;
        const CELL position=Coord_Cell(live[i]->Coord);
        const courier::Point p{Cell_X(position)-16,Cell_Y(position)-16};
        if(!(previous[i]==p)){
            if(!match.observePosition(i,p)){
                std::printf("[rts-live] ERROR: native position rejected actor=%u x=%d y=%d\n",
                            static_cast<unsigned>(i),p.x,p.y);
                continue;
            }
            previous[i]=p;
            std::printf("[rts-live] moved id=%u x=%d y=%d\n",entity->id,p.x,p.y);
        }
    }
}
void tick(){
    const Uint64 tickStarted=SDL_GetPerformanceCounter();
    sync();
    const std::vector<orders::Move> moves=match.plan();
    for(size_t i=0;i<live.size();i++){
        const rts::WorldEntity* entity=match.world().entity(match.actors()[i].id);
        if(!entity||entity->life!=rts::Life::Alive||live[i]->IsInLimbo)continue;
        const orders::Unit& order=match.navigation().unit(static_cast<int>(i));
        if(!order.hasOrder||order.status==orders::Status::Waiting||
           order.current.kind==orders::Kind::Hold||
           (order.current.kind==orders::Kind::Guard&&
            order.status==orders::Status::Guarding&&!order.inFlight)){
            live[i]->Stop_Driver();live[i]->Assign_Destination(TARGET_NONE);
            live[i]->Assign_Mission(MISSION_GUARD);
        }
    }
    for(const orders::Move& move:moves){
        live[move.actor]->Assign_Mission(MISSION_MOVE);
        live[move.actor]->Assign_Destination(::As_Target(cell(move.waypoint)));
    }
    ++Frame;
    for(size_t i=0;i<live.size();i++){
        const rts::WorldEntity* e=match.world().entity(match.actors()[i].id);
        if(live[i]&&!live[i]->IsInLimbo&&e&&e->life==rts::Life::Alive)
            live[i]->AI();
    }
    sync();
    if(!match.resolveCombat()){
        std::puts("[rts-live] ERROR: R03 combat/World HP divergence");
        emscripten_cancel_main_loop();return;
    }
    for(size_t i=0;i<live.size();i++){
        const rts::WorldEntity* e=match.world().entity(match.actors()[i].id);
        if(e&&e->life!=rts::Life::Alive&&!live[i]->IsInLimbo)
            live[i]->Limbo();
    }
    if(match.world().tick()%25==0){
        const orders::Budget& b=match.navigation().budget();
        std::printf("[rts-live] path budget searches=%d expansions=%d issued=%d\n",
                    b.searches,b.expansions,b.issued);
    }
    publish();
    if(tickDurationsUs.size()<4096)
        tickDurationsUs.push_back(1000000.0*static_cast<double>(
            SDL_GetPerformanceCounter()-tickStarted)/
            static_cast<double>(SDL_GetPerformanceFrequency()));
}
void paint(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b){
    const SDL_Rect rect={x,y,w,h};
    SDL_SetRenderDrawColor(renderer,r,g,b,255);SDL_RenderFillRect(renderer,&rect);
}
void draw(){
    const courier::State& map=match.authored();
    SDL_SetRenderDrawColor(renderer,14,28,31,255);SDL_RenderClear(renderer);
    for(int y=0;y<map.height;y++)for(int x=0;x<map.width;x++){
        const uint8_t terrain=map.terrain[y*map.width+x];
        const bool wall=map.blocked[y*map.width+x];
        paint(x*40+1,y*40+1,38,38,wall?79:terrain==3?45:terrain==2?74:37,
              wall?88:terrain==3?81:terrain==2?79:69,
              wall?95:terrain==3?74:terrain==2?60:61);
    }
    for(const courier::Resource& resource:map.resources)
        paint(resource.p.x*40+13,resource.p.y*40+13,14,14,147,207,103);
    for(size_t i=0;i<live.size();i++){
        const rts::WorldEntity* e=match.world().entity(match.actors()[i].id);
        if(!e||e->life!=rts::Life::Alive)continue;
        paint(e->x*40+7,e->y*40+7,26,26,e->owner==1?59:231,
              e->owner==1?194:99,e->owner==1?166:95);
        paint(e->x*40+7,e->y*40+3,26*e->hp/5,3,108,234,134);
        if(e->id==selected){
            SDL_Rect rect={e->x*40+4,e->y*40+4,32,32};
            SDL_SetRenderDrawColor(renderer,248,244,181,255);SDL_RenderDrawRect(renderer,&rect);
        }
        const orders::Unit& u=match.navigation().unit(static_cast<int>(i));
        if(u.hasOrder){
            SDL_SetRenderDrawColor(renderer,239,192,94,255);
            SDL_RenderDrawLine(renderer,e->x*40+20,e->y*40+20,
                               u.current.target.x*40+20,u.current.target.y*40+20);
        }
    }
    SDL_RenderPresent(renderer);
}
rts::WorldCode command(int kind,rts::HouseId issuer,rts::EntityId actor,
                       int x,int y,rts::EntityId target,bool append){
    switch(kind){
        case 0:return match.select(issuer,actor);
        case 1:return match.order(issuer,actor,orders::Kind::Move,{x,y},append);
        case 2:return match.order(issuer,actor,orders::Kind::AttackMove,{x,y},append);
        case 3:return match.order(issuer,actor,orders::Kind::Stop,{x,y});
        case 4:return match.order(issuer,actor,orders::Kind::Hold,{x,y});
        case 5:return match.order(issuer,actor,orders::Kind::Guard,{x,y},append,target);
        case 6:return match.order(issuer,actor,orders::Kind::Patrol,{x,y},append);
        case 7:return match.attack(issuer,actor,target);
        default:return rts::WorldCode::BadTarget;
    }
}
void frame(){
    SDL_Event event;
    while(SDL_PollEvent(&event)){
        if(event.type==SDL_QUIT){emscripten_cancel_main_loop();return;}
        if(event.type==SDL_KEYDOWN){
            const SDL_Keycode key=event.key.keysym.sym;
            if(key>=SDLK_1&&key<=SDLK_6){
                const size_t i=static_cast<size_t>(key-SDLK_1);
                if(i<match.actors().size()&&match.actors()[i].owner==1){
                    selected=match.actors()[i].id;
                    command(0,1,selected,0,0,0,false);
                }
            }else if(key==SDLK_s||key==SDLK_ESCAPE){
                if(selected)command(3,1,selected,0,0,0,false);
            }else if(key==SDLK_h){
                if(selected)command(4,1,selected,0,0,0,false);
            }else if(key==SDLK_p)clickKind=orders::Kind::Patrol;
            else if(key==SDLK_a)clickKind=orders::Kind::AttackMove;
            else if(key==SDLK_m)clickKind=orders::Kind::Move;
            else if(key==SDLK_g)clickKind=orders::Kind::Guard;
            else if(key==SDLK_r&&!restart())std::puts("[rts-live] ERROR: restart failed");
        }
        if(event.type==SDL_MOUSEBUTTONDOWN&&event.button.button==SDL_BUTTON_LEFT){
            const courier::Point p{event.button.x/40,event.button.y/40};
            if(p.x<0||p.y<0||p.x>=match.authored().width||p.y>=match.authored().height)
                continue;
            rts::EntityId found=0;
            for(const rts::LiveActor& a:match.actors()){
                const rts::WorldEntity* e=match.world().entity(a.id);
                if(e&&e->life==rts::Life::Alive&&e->x==p.x&&e->y==p.y){
                    found=a.id;break;
                }
            }
            if(found&&match.world().entity(found)->owner==1&&
               clickKind==orders::Kind::Move){
                selected=found;command(0,1,selected,0,0,0,false);
            }else if(selected){
                const bool append=(SDL_GetModState()&KMOD_CTRL)!=0;
                rts::WorldCode result=rts::WorldCode::BadTarget;
                if(clickKind==orders::Kind::Guard)result=command(5,1,selected,p.x,p.y,found,append);
                else if(found&&match.world().entity(found)->team!=1)
                    result=command(7,1,selected,p.x,p.y,found,false);
                else result=command(clickKind==orders::Kind::Patrol?6:
                    clickKind==orders::Kind::AttackMove?2:1,1,selected,p.x,p.y,0,append);
                std::printf("[rts-live] order id=%u code=%s\n",selected,rts::codeName(result));
                clickKind=orders::Kind::Move;
            }
        }
    }
    const Uint32 now=SDL_GetTicks();
    if(now-lastStep>=180){tick();lastStep=now;}
    draw();
}
}

extern "C" EMSCRIPTEN_KEEPALIVE int Browser_Live_World_Command(int kind,
    unsigned issuer,unsigned actor,int x,int y,unsigned target,int append){
    const rts::WorldCode result=command(kind,static_cast<rts::HouseId>(issuer),actor,
                                        x,y,target,append!=0);
    std::printf("[rts-live] api kind=%d issuer=%u actor=%u result=%s\n",
                kind,issuer,actor,rts::codeName(result));
    return static_cast<int>(result);
}
extern "C" EMSCRIPTEN_KEEPALIVE int Browser_Live_World_Restart(){return restart()?1:0;}
extern "C" EMSCRIPTEN_KEEPALIVE unsigned Browser_Live_Tick_Timing_Count(){
    // Only retained durations contribute to the exported percentile.
    return static_cast<unsigned>(tickDurationsUs.size());
}
extern "C" EMSCRIPTEN_KEEPALIVE double Browser_Live_Tick_Timing_P95_Us(){
    if(tickDurationsUs.empty())return -1.0;
    std::vector<double> sorted=tickDurationsUs;
    std::sort(sorted.begin(),sorted.end());
    return sorted[static_cast<size_t>((sorted.size()-1)*0.95)];
}

// R20 contract probe only. Normal gameplay continues publishing v3; this
// explicit opt-in exposes the native v4 producer to Chromium acceptance tests
// without replacing the live HUD snapshot or enabling R06 gameplay.
extern "C" EMSCRIPTEN_KEEPALIVE int Browser_Live_World_Economy_Probe(){
    if(match.world().epoch()==0)return 0;
    const std::string json=rts::worldJson(match.snapshot(false,true));
    EM_ASM({window.__r20EconomyProbe= UTF8ToString($0);},json.c_str());
    return 1;
}

int Browser_Live_RTS_Match(const char*){
    tickDurationsUs.clear();
    std::string source,definitions;
    if(!readFile("/COURIER.MAP",65536,source)||
       !readFile("/RTS.DEFS",16384,definitions)||
       !match.load(source,definitions))return 4;
    courier::WorldPlan placement={};
    if(!courier::planWorld(match.authored(),16,16,MAP_CELL_W,MAP_CELL_H,placement)||
       !courier::stageEngineMap(match.authored(),placement))return 5;
    if(SDL_Init(SDL_INIT_VIDEO)!=0)return 6;
    window=SDL_CreateWindow("World-Conquer integrated native RTS",
        SDL_WINDOWPOS_CENTERED,SDL_WINDOWPOS_CENTERED,
        match.authored().width*40,match.authored().height*40,SDL_WINDOW_SHOWN);
    if(!window)return 7;
    renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_ACCELERATED);
    if(!renderer)renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_SOFTWARE);
    if(!renderer)return 8;
    if(!place())return 9;
    std::printf("[rts-live] integration=R02+R03+R04 authority=R18 movement=InfantryClass::AI terrain=MapClass\n");
    publish();lastStep=SDL_GetTicks();
    emscripten_set_main_loop(frame,0,1);return 0;
}
#endif
