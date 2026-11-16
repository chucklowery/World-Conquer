// R02 browser-playable production-unit orders. All four actors are real
// VanillaTD InfantryClass objects in staged MapClass cells. The order
// scheduler only chooses/reserves adjacent cells; InfantryClass::AI moves.
#ifdef __EMSCRIPTEN__
#include "courier_engine_map.h"
#include "production_orders.h"
#include "simulation_contract.h"
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <algorithm>
#include <cstdio>
#include <string>

namespace {
SDL_Window* window=nullptr;
SDL_Renderer* renderer=nullptr;
InfantryClass* live[orders::COUNT]={nullptr,nullptr,nullptr,nullptr};
HouseClass* playerHouse=nullptr;
courier::State mapState;
courier::WorldPlan placement={};
orders::Controller controller;
std::array<bool,orders::CELLS> blocked;
std::array<courier::Point,orders::COUNT> spawns;
int selected=0;
orders::Kind clickKind=orders::Kind::Move;
uint64_t sequence=1,frameNumber=0;
Uint32 lastStep=0;
std::vector<rts::Event> events;
std::array<courier::Point,orders::COUNT> previous;

void emit(rts::EventKind kind,rts::EntityId id,int x=0,int y=0,int value=0,
          uint64_t seq=0,rts::ResultCode code=rts::ResultCode::Accepted){
    events.push_back({kind,frameNumber,seq,id,x,y,value,code});
}
rts::ResultCode code(orders::Code value){
    switch(value){
    case orders::Code::Accepted:return rts::ResultCode::Accepted;
    case orders::Code::BadActor:return rts::ResultCode::UnknownEntity;
    case orders::Code::Dead:return rts::ResultCode::Dead;
    case orders::Code::BadTarget:return rts::ResultCode::BadTarget;
    case orders::Code::Blocked:return rts::ResultCode::Blocked;
    case orders::Code::Unreachable:return rts::ResultCode::Unreachable;
    case orders::Code::QueueFull:return rts::ResultCode::Blocked;
    }
    return rts::ResultCode::BadTarget;
}
CELL cell(courier::Point p){
    return static_cast<CELL>((p.y+16)*MAP_CELL_W+p.x+16);
}
bool place(){
    Houses.Set_Heap(HOUSE_MAX);
    Infantry.Set_Heap(INFANTRY_MAX);
    HouseClass::Init();
    InfantryClass::Init();
    playerHouse=new HouseClass(HOUSE_GOOD);
    if(!playerHouse)return false;
    PlayerPtr=playerHouse;
    playerHouse->IsHuman=true;
    GameActive=true;
    ++ScenarioInit;
    bool valid=true;
    for(int i=0;i<orders::COUNT;i++){
        live[i]=new InfantryClass(INFANTRY_E1,HOUSE_GOOD);
        if(!live[i]||!live[i]->Unlimbo(Cell_Coord(cell(spawns[i])),DIR_E)){
            valid=false;break;
        }
    }
    --ScenarioInit;
    if(valid)std::puts("[r02] production infantry=4 on-map=ready");
    return valid;
}
void sync(){
    for(int i=0;i<orders::COUNT;i++){
        if(!live[i]||live[i]->IsInLimbo){
            controller.update(i,controller.unit(i).position,false);
            continue;
        }
        const CELL position=Coord_Cell(live[i]->Coord);
        const courier::Point p{Cell_X(position)-16,Cell_Y(position)-16};
        controller.update(i,p,true);
        if(!(previous[i]==p)){
            previous[i]=p;
            emit(rts::EventKind::Position,1001+i,p.x,p.y);
            std::printf("[r02] moved unit=%d x=%d y=%d\n",i,p.x,p.y);
        }
    }
}
void publish(){
    rts::Snapshot s={};
    s.version=rts::SNAPSHOT_VERSION;
    s.tick=frameNumber;s.width=orders::WIDTH;s.height=orders::HEIGHT;
    s.selected=selected;s.selectedEntityId=1001+selected;s.cargo=0;s.phase=0;
    for(bool wall:blocked)s.terrain.push_back(wall?1:0);
    for(int i=0;i<orders::COUNT;i++){
        const orders::Unit& u=controller.unit(i);
        const courier::Point target=u.hasOrder?u.current.target:u.position;
        s.entities.push_back({static_cast<rts::EntityId>(1001+i),rts::Kind::Infantry,
            rts::PLAYER_HOUSE,rts::PLAYER_TEAM,u.position,u.alive?5:0,u.alive,u.hasOrder,target});
        s.commandStates.push_back({static_cast<rts::EntityId>(1001+i),
            orders::name(u.current.kind),orders::name(u.status),target,
            static_cast<unsigned>(u.queued.size())});
    }
    s.events.swap(events);
    const std::string payload=rts::json(s);
    EM_ASM({if(typeof WCRTS!=="undefined")WCRTS.receive(UTF8ToString($0));},payload.c_str());
}
void submit(int actor,orders::Kind kind,courier::Point target={0,0},
            bool append=false,int guard=-1){
    const orders::Request request={frameNumber+1,sequence++,actor,{kind,target,guard},append};
    const orders::Code result=controller.enqueue(request);
    std::printf("[r02] order seq=%llu unit=%d kind=%s append=%d result=%s x=%d y=%d\n",
        static_cast<unsigned long long>(request.sequence),actor,orders::name(kind),
        append?1:0,orders::name(result),target.x,target.y);
    if(result!=orders::Code::Accepted){
        for(const orders::Feedback& feedback:controller.takeFeedback())
            emit(rts::EventKind::Command,1001+feedback.actor,target.x,target.y,0,
                feedback.sequence,code(feedback.code));
    }
    publish();
}
void cancelNative(int i){
    live[i]->Stop_Driver();
    live[i]->Assign_Destination(TARGET_NONE);
    live[i]->Assign_Mission(MISSION_GUARD);
}
void tick(){
    ++frameNumber;
    sync();
    // Reconcile the order grid with the real, mutable MapClass terrain each
    // frame. Newly blocked waypoints are never dispatched.
    for(int y=0;y<orders::HEIGHT;y++)for(int x=0;x<orders::WIDTH;x++)
        blocked[y*orders::WIDTH+x]=Map[cell({x,y})].Land_Type()!=LAND_CLEAR;
    controller.updateTerrain(blocked);
    const std::vector<orders::Move> moves=controller.step(frameNumber);
    for(int i=0;i<orders::COUNT;i++){
        const orders::Unit& u=controller.unit(i);
        if(!u.alive)continue;
        if(!u.hasOrder||u.status==orders::Status::Waiting||
           u.current.kind==orders::Kind::Hold||
           (u.current.kind==orders::Kind::Guard&&u.status==orders::Status::Guarding&&!u.inFlight))
            cancelNative(i);
    }
    for(const orders::Move& move:moves){
        live[move.actor]->Assign_Mission(MISSION_MOVE);
        live[move.actor]->Assign_Destination(::As_Target(cell(move.waypoint)));
        std::printf("[r02] waypoint unit=%d x=%d y=%d nav-cell=%u\n",
                    move.actor,move.waypoint.x,move.waypoint.y,
                    ::Target_Value(live[move.actor]->NavCom));
    }
    for(const orders::Feedback& feedback:controller.takeFeedback()){
        const rts::ResultCode result=code(feedback.code);
        emit(rts::EventKind::Command,1001+feedback.actor,0,0,0,feedback.sequence,result);
        if(result!=rts::ResultCode::Accepted)
            std::printf("[r02] feedback unit=%d code=%s seq=%llu\n",feedback.actor,
                rts::name(result),static_cast<unsigned long long>(feedback.sequence));
    }
    ++Frame;
    for(int i=0;i<orders::COUNT;i++)
        if(live[i]&&controller.unit(i).alive)live[i]->AI();
    sync();
    if(frameNumber%25==0){
        std::printf("[r02] budget searches=%d expansions=%d max-open=%d waypoints=%d\n",
            controller.budget().searches,controller.budget().expansions,
            controller.budget().maxOpen,controller.budget().issued);
    }
    publish();
}
bool restart(){
    ++ScenarioInit;
    bool valid=true;
    for(int i=0;i<orders::COUNT;i++){
        if(!live[i]||(!live[i]->IsInLimbo&&!live[i]->Limbo())||
           !live[i]->Unlimbo(Cell_Coord(cell(spawns[i])),DIR_E)){
            valid=false;break;
        }
    }
    --ScenarioInit;
    if(!valid)return false;
    controller.reset(blocked,spawns);selected=0;sequence=1;frameNumber=0;
    for(int i=0;i<orders::COUNT;i++)previous[i]=spawns[i];
    events.clear();emit(rts::EventKind::Restart,0);
    std::puts("[r02] restarted production units");
    publish();
    return true;
}
void paint(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b){
    SDL_Rect rect={x,y,w,h};
    SDL_SetRenderDrawColor(renderer,r,g,b,255);SDL_RenderFillRect(renderer,&rect);
}
void frame(){
    SDL_Event event;
    while(SDL_PollEvent(&event)){
        if(event.type==SDL_QUIT){emscripten_cancel_main_loop();return;}
        if(event.type==SDL_KEYDOWN){
            const SDL_Keycode key=event.key.keysym.sym;
            if(key>=SDLK_1&&key<=SDLK_4){
                selected=key-SDLK_1;
                emit(rts::EventKind::Selection,1001+selected);
                std::printf("[r02] selected unit=%d\n",selected);publish();
            }else if(key==SDLK_ESCAPE||key==SDLK_s)submit(selected,orders::Kind::Stop);
            else if(key==SDLK_h)submit(selected,orders::Kind::Hold);
            else if(key==SDLK_g)clickKind=orders::Kind::Guard;
            else if(key==SDLK_p)clickKind=orders::Kind::Patrol;
            else if(key==SDLK_a)clickKind=orders::Kind::AttackMove;
            else if(key==SDLK_m)clickKind=orders::Kind::Move;
            else if(key==SDLK_r&&!restart())std::puts("[r02] ERROR: restart failed");
        }
        if(event.type==SDL_MOUSEBUTTONDOWN&&event.button.button==SDL_BUTTON_LEFT){
            const courier::Point p{event.button.x/40,event.button.y/40};
            if(p.x<0||p.y<0||p.x>=orders::WIDTH||p.y>=orders::HEIGHT)continue;
            const bool append=(SDL_GetModState()&KMOD_CTRL)!=0;
            const bool attack=(SDL_GetModState()&KMOD_SHIFT)!=0;
            if(clickKind==orders::Kind::Guard){
                int target=-1;
                for(int i=0;i<orders::COUNT;i++)
                    if(i!=selected&&controller.unit(i).alive&&controller.unit(i).position==p)
                        target=i;
                submit(selected,orders::Kind::Guard,p,append,target);
                clickKind=orders::Kind::Move;
            }else{
                int clicked=-1;
                for(int i=0;i<orders::COUNT;i++)
                    if(controller.unit(i).alive&&controller.unit(i).position==p)clicked=i;
                if(clicked>=0&&clickKind==orders::Kind::Move&&!attack){
                    selected=clicked;emit(rts::EventKind::Selection,1001+selected);
                    std::printf("[r02] selected unit=%d\n",selected);publish();
                }else{
                    submit(selected,attack?orders::Kind::AttackMove:clickKind,p,append);
                    clickKind=orders::Kind::Move;
                }
            }
        }
    }
    const Uint32 now=SDL_GetTicks();
    if(now-lastStep>=180){tick();lastStep=now;}
    SDL_SetRenderDrawColor(renderer,16,30,39,255);SDL_RenderClear(renderer);
    for(int y=0;y<orders::HEIGHT;y++)for(int x=0;x<orders::WIDTH;x++){
        const bool wall=blocked[y*orders::WIDTH+x];
        paint(x*40+1,y*40+1,38,38,wall?83:39,wall?93:72,wall?98:76);
        if(wall)paint(x*40+6,y*40+6,28,28,111,124,123);
    }
    for(int i=0;i<orders::COUNT;i++){
        const orders::Unit& u=controller.unit(i);
        if(!u.alive)continue;
        paint(u.position.x*40+7,u.position.y*40+7,26,26,
              i==0?80:90,i==1?185:219,i==2?235:179);
        if(i==selected){
            SDL_Rect rect={u.position.x*40+4,u.position.y*40+4,32,32};
            SDL_SetRenderDrawColor(renderer,255,255,255,255);SDL_RenderDrawRect(renderer,&rect);
        }
        if(u.hasOrder){
            const courier::Point goal=u.current.target;
            SDL_SetRenderDrawColor(renderer,243,192,87,255);
            SDL_RenderDrawLine(renderer,u.position.x*40+20,u.position.y*40+20,
                               goal.x*40+20,goal.y*40+20);
        }
    }
    SDL_RenderPresent(renderer);
}
}
int Browser_Production_Orders(const char*){
    if(SDL_Init(SDL_INIT_VIDEO)!=0)return 1;
    window=SDL_CreateWindow("World-Conquer R02 production commands",
        SDL_WINDOWPOS_CENTERED,SDL_WINDOWPOS_CENTERED,720,440,SDL_WINDOW_SHOWN);
    if(!window)return 2;
    renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_ACCELERATED);
    if(!renderer)renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_SOFTWARE);
    if(!renderer)return 3;
    if(FILE* file=std::fopen("/COURIER.MAP","rb")){
        char buffer[256];const size_t n=std::fread(buffer,1,sizeof(buffer),file);
        const int extra=std::fgetc(file);std::fclose(file);
        if(extra!=EOF||!courier::loadMap(mapState,std::string(buffer,n)))
            return 4;
    }
    // R02 is a fixed 18x11 diagnostic. R04's mission storage is dynamic;
    // reject other sizes before touching the production world, then copy its
    // validated passability into R02's existing fixed-size order contract.
    if(!orders::fixedTerrain(mapState,blocked))return 4;
    if(!courier::planWorld(mapState,16,16,MAP_CELL_W,MAP_CELL_H,placement)||
       !courier::stageEngineMap(mapState,placement))return 5;
    spawns={{mapState.units[0].p,mapState.units[1].p,{1,4},{2,5}}};
    for(int i=0;i<orders::COUNT;i++){
        if(blocked[spawns[i].y*orders::WIDTH+spawns[i].x])return 6;
        for(int j=0;j<i;j++)if(spawns[i]==spawns[j])return 7;
    }
    controller.reset(blocked,spawns);
    if(!place())return 8;
    for(int i=0;i<orders::COUNT;i++)previous[i]=spawns[i];
    std::puts("[r02] navigation=bounded-A* movement=InfantryClass::AI terrain=MapClass");
    std::puts("[r02] controls: 1-4 select, click move, Shift+click attack-move, P patrol, G guard, H hold, S/Esc stop, Ctrl queue, R restart");
    publish();lastStep=SDL_GetTicks();
    emscripten_set_main_loop(frame,0,1);
    return 0;
}
#endif
