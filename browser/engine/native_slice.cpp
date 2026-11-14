// Native C++ gameplay in the real VanillaTD WebAssembly module.
// Original geometry, no game archives; deliberately isolated from campaigns.
#ifdef __EMSCRIPTEN__
#include "native_slice_core.h"
#include "courier_engine_foot.h"
#include "courier_engine_map.h"
#include "courier_combat.h"
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <vector>
SDL_Texture* Browser_Load_Original_Shape(SDL_Renderer*,const char*,const char*);

namespace {
SDL_Window* window=nullptr;
SDL_Renderer* renderer=nullptr;
SDL_Texture* cargoTexture=nullptr;
SDL_Texture* infantryTexture=nullptr;
SDL_Texture* sceneryTexture=nullptr;
courier::State mission;
courier::Combat combat;
courier::EngineFootBridge footBridge;
courier::WorldPlan worldPlacement={};
bool engineOwned=false;
InfantryClass* liveUnits[2]={nullptr,nullptr};
HouseClass* liveHouse=nullptr;
std::string missionSource;
Uint32 lastStep=0;
int priorCargo=0,priorPhase=0;

bool placeLiveUnits(){
    Houses.Set_Heap(HOUSE_MAX);
    Infantry.Set_Heap(INFANTRY_MAX);
    HouseClass::Init();
    InfantryClass::Init();
    liveHouse=new HouseClass(HOUSE_GOOD);
    if(!liveHouse)return false;
    PlayerPtr=liveHouse;
    liveHouse->IsHuman=true;
    GameActive=true;
    ++ScenarioInit;
    bool placed=true;
    for(int i=0;i<2;i++){
        liveUnits[i]=new InfantryClass(INFANTRY_E1,HOUSE_GOOD);
        if(!liveUnits[i]||!liveUnits[i]->Unlimbo(
            Cell_Coord(static_cast<CELL>(worldPlacement.units[i])),DIR_E)){
            placed=false;break;
        }
    }
    --ScenarioInit;
    if(!placed)return false;
    footBridge.units[0]=liveUnits[0];footBridge.units[1]=liveUnits[1];
    footBridge.originX=16;footBridge.originY=16;
    footBridge.issueMoveMission=true;
    footBridge.worldReady=true;
    std::puts("[browser-engine-courier] production infantry=2 on-map=ready");
    return true;
}

void synchronizeLivePositions(){
    for(int i=0;i<2;i++)if(liveUnits[i]&&mission.units[i].hp>0){
        const CELL cell=Coord_Cell(liveUnits[i]->Coord);
        mission.units[i].p={Cell_X(cell)-16,Cell_Y(cell)-16};
    }
}

void tickEngineMission(){
    if(mission.phase!=0)return;
    ++Frame;
    for(int i=0;i<2;i++)if(liveUnits[i]&&mission.units[i].hp>0)liveUnits[i]->AI();
    const courier::Point before[2]={mission.units[0].p,mission.units[1].p};
    synchronizeLivePositions();
    for(int i=0;i<2;i++)if(!(before[i]==mission.units[i].p))
        std::printf("[browser-engine-courier] moved unit=%d x=%d y=%d\n",i,
                    mission.units[i].p.x,mission.units[i].p.y);
    const courier::Point sentriesBefore[2]={mission.units[2].p,mission.units[3].p};
    const int priorHP[4]={mission.units[0].hp,mission.units[1].hp,
                          mission.units[2].hp,mission.units[3].hp};
    courier::tickCombat(mission,combat);
    for(int j=2;j<4;j++)if(!(sentriesBefore[j-2]==mission.units[j].p))
        std::printf("[browser-engine-courier] sentry moved unit=%d x=%d y=%d\n",j,
                    mission.units[j].p.x,mission.units[j].p.y);
    for(int i=0;i<4;i++)if(mission.units[i].hp!=priorHP[i]){
        std::printf("[browser-engine-courier] combat unit=%d hp=%d\n",i,mission.units[i].hp);
        if(i<2&&mission.units[i].hp<=0&&liveUnits[i]){
            liveUnits[i]->Limbo();
            footBridge.units[i]=nullptr;
            if(mission.selected==i&&mission.units[1-i].hp>0)mission.selected=1-i;
        }
        if(i>=2&&mission.units[i].hp<=0)
            std::printf("[browser-engine-courier] sentry defeated=%d\n",i);
    }
    if(mission.phase!=0)return;
    for(int j=0;j<2;j++)if(!mission.collected[j])for(int i=0;i<2;i++)
        if(mission.units[i].hp>0&&courier::distance(mission.units[i].p,mission.crates[j])<=1){
            mission.collected[j]=true;++mission.cargo;
            std::printf("[browser-engine-courier] crate collected=%d\n",j);
            break;
        }
    if(mission.cargo==2)for(int i=0;i<2;i++)
        if(mission.units[i].hp>0&&courier::distance(mission.units[i].p,mission.exit)<=1)mission.phase=1;
}

bool restartEngineMission(){
    if(!engineOwned)return false;
    ++ScenarioInit;
    bool reset=true;
    for(int i=0;i<2;i++)if(!liveUnits[i]||
       (!liveUnits[i]->IsInLimbo&&!liveUnits[i]->Limbo())||
       !liveUnits[i]->Unlimbo(Cell_Coord(static_cast<CELL>(worldPlacement.units[i])),DIR_E)){
        reset=false;break;
    }
    --ScenarioInit;
    if(!reset)return false;
    mission=courier::State();
    if(!missionSource.empty())courier::loadMap(mission,missionSource);
    combat=courier::Combat();
    footBridge.units[0]=liveUnits[0];footBridge.units[1]=liveUnits[1];
    mission.orderSink=courier::EngineFootBridge::onOrder;
    mission.orderContext=&footBridge;
    priorCargo=priorPhase=0;
    std::puts("[browser-engine-courier] mission restarted");
    return true;
}

void fill(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b){
    SDL_Rect rect={x,y,w,h};
    SDL_SetRenderDrawColor(renderer,r,g,b,255);
    SDL_RenderFillRect(renderer,&rect);
}
void outline(int x,int y,int w,int h,Uint8 r,Uint8 g,Uint8 b){
    SDL_Rect rect={x,y,w,h};
    SDL_SetRenderDrawColor(renderer,r,g,b,255);
    SDL_RenderDrawRect(renderer,&rect);
}
void frame(){
    SDL_Event event;
    while(SDL_PollEvent(&event)){
        if(event.type==SDL_MOUSEBUTTONDOWN&&event.button.button==SDL_BUTTON_LEFT){
            int x=event.button.x/40,y=event.button.y/40;
            if(engineOwned)synchronizeLivePositions();
            bool attackOrdered=false;
            if(engineOwned&&mission.phase==0&&mission.units[mission.selected].hp>0){
                for(int j=2;j<4;j++)if(mission.units[j].hp>0&&
                    (mission.units[j].p==courier::Point{x,y})){
                    attackOrdered=courier::orderAttack(mission,combat,mission.selected,j);
                    if(attackOrdered){
                        std::printf("[browser-engine-courier] attack-order unit=%d enemy=%d\n",
                                    mission.selected,j);
                        if(courier::distance(mission.units[mission.selected].p,mission.units[j].p)>2){
                            courier::Point approach{0,0};
                            if(courier::approachEnemy(mission,mission.selected,j,approach))
                                courier::assignDestination(mission,mission.selected,approach);
                        }
                    }
                    break;
                }
            }
            if(!attackOrdered){
                const int selectedBefore=mission.selected;
                courier::click(mission,{x,y});
                if(engineOwned&&mission.selected==selectedBefore&&courier::inside(mission,{x,y})&&
                   !(mission.units[selectedBefore].p==courier::Point{x,y}))combat.focus[selectedBefore]=-1;
            }
            std::printf("[browser-native-slice] click x=%d y=%d selected=%d route=%u\n",
                        x,y,mission.selected,static_cast<unsigned>(mission.units[mission.selected].route.size()));
            if(engineOwned&&liveUnits[mission.selected]&&mission.hasNav[mission.selected]){
                const TARGET liveTarget=liveUnits[mission.selected]->NavCom;
                std::printf("[browser-engine-courier] live orders=%u nav-cell=%u\n",
                            footBridge.delivered,::Target_Value(liveTarget));
            }
            if(mission.hasNav[mission.selected]){
                TARGET destination=TARGET_NONE;
                if(!engineOwned&&courier::toEngineTarget(mission.navTargets[mission.selected],destination)){
                    courier::Point decoded{-1,-1};
                    if(courier::fromEngineTarget(destination,decoded))
                        std::printf("[browser-native-slice] engine CELL target=%u x=%d y=%d\n",
                                    ::Target_Value(destination),decoded.x,decoded.y);
                }
            }
        }else if(event.type==SDL_KEYDOWN&&event.key.keysym.sym==SDLK_r){
            if(engineOwned){
                if(!restartEngineMission())std::puts("[browser-engine-courier] ERROR: restart failed");
                continue;
            }
            mission=courier::State();
            if(!missionSource.empty())courier::loadMap(mission,missionSource);
            mission.orderSink=courier::EngineFootBridge::onOrder;
            mission.orderContext=&footBridge;
            priorCargo=priorPhase=0;
            std::puts("[browser-native-slice] mission restarted");
        }else if(engineOwned&&mission.phase==0&&event.type==SDL_KEYDOWN&&
                 (event.key.keysym.sym==SDLK_1||event.key.keysym.sym==SDLK_2)){
            const int index=event.key.keysym.sym==SDLK_1?0:1;
            if(mission.units[index].hp>0){
                mission.selected=index;
                std::printf("[browser-engine-courier] selected unit=%d\n",index);
            }
        }else if(engineOwned&&mission.phase==0&&event.type==SDL_KEYDOWN&&
                 event.key.keysym.sym==SDLK_ESCAPE){
            combat.focus[mission.selected]=-1;
            courier::assignDestination(mission,mission.selected,mission.units[mission.selected].p);
            std::printf("[browser-engine-courier] cancelled unit=%d\n",mission.selected);
        }else if(event.type==SDL_QUIT){
            emscripten_cancel_main_loop();return;
        }
    }
    const Uint32 now=SDL_GetTicks();
    if(now-lastStep>=180){
        if(engineOwned)tickEngineMission();
        else courier::tick(mission);
        lastStep=now;
        if(priorCargo!=mission.cargo){
            priorCargo=mission.cargo;
            std::printf("[browser-native-slice] crates=%d/2\n",priorCargo);
        }
        if(priorPhase!=mission.phase){
            priorPhase=mission.phase;
            std::printf("[browser-native-slice] result=%s\n",priorPhase==1?"victory":"defeat");
        }
    }
    SDL_SetRenderDrawColor(renderer,16,30,39,255);SDL_RenderClear(renderer);
    for(int y=0;y<11;y++)for(int x=0;x<18;x++){
        const bool blocked=!courier::inside(mission,{x,y});
        fill(x*40+1,y*40+1,38,38,
             blocked?74:(x+y)%2?48:52,blocked?85:(x+y)%2?74:82,
             blocked?92:(x+y)%2?67:73);
        if(blocked){
            if(sceneryTexture){SDL_Rect tree={x*40-4,y*40-8,48,48};
                SDL_RenderCopy(renderer,sceneryTexture,nullptr,&tree);
            }else fill(x*40+5,y*40+5,30,4,109,122,119);
        }
    }
    fill((mission.exit.x-1)*40,(mission.exit.y-1)*40,120,80,126,175,187);
    if(cargoTexture){SDL_Rect destination={(mission.exit.x-2)*40,(mission.exit.y-2)*40,160,160};
        SDL_RenderCopy(renderer,cargoTexture,nullptr,&destination);
    }else fill(mission.exit.x*40+7,mission.exit.y*40-11,26,55,178,223,212);
    for(int i=0;i<2;i++)if(!mission.collected[i]){
        const courier::Point p=mission.crates[i];fill(p.x*40+9,p.y*40+9,22,22,238,199,122);
        outline(p.x*40+9,p.y*40+9,22,22,91,72,42);
    }
    for(int i=0;i<4;i++){
        const courier::Unit& u=mission.units[i];if(u.hp<=0)continue;
        if(infantryTexture){
            SDL_SetTextureColorMod(infantryTexture,u.enemy?245:155,u.enemy?135:255,u.enemy?140:195);
            SDL_Rect target={u.p.x*40-4,u.p.y*40-4,48,48};
            SDL_RenderCopy(renderer,infantryTexture,nullptr,&target);
        }else fill(u.p.x*40+7,u.p.y*40+7,26,26,u.enemy?231:99,u.enemy?127:226,u.enemy?120:175);
        if(i==mission.selected)outline(u.p.x*40+5,u.p.y*40+5,30,30,255,255,255);
        if(engineOwned&&i>=2&&
           (combat.focus[0]==i||combat.focus[1]==i))outline(u.p.x*40+3,u.p.y*40+3,34,34,255,207,98);
        fill(u.p.x*40+10,u.p.y*40+29,u.hp*3,3,17,37,39);
    }
    if(engineOwned)for(int i=0;i<4;i++)if(combat.lastShot[i]>=mission.frame-1){
        int target=-1;
        if(i<2){
            target=combat.focus[i];
            if(target<2||target>=4||mission.units[target].hp<=0){
                for(int j=2;j<4;j++)if(combat.lastHit[j]>=mission.frame-1){target=j;break;}
            }
        }else{
            for(int j=0;j<2;j++)if(combat.lastHit[j]>=mission.frame-1){target=j;break;}
        }
        if(target>=0&&target<4){
            const courier::Point a=mission.units[i].p,b=mission.units[target].p;
            SDL_SetRenderDrawColor(renderer,i<2?255:255,i<2?224:89,i<2?108:89,255);
            SDL_RenderDrawLine(renderer,a.x*40+20,a.y*40+20,b.x*40+20,b.y*40+20);
        }
    }
    if(mission.phase!=0){
        // Visible outcome banner; R restarts without reloading the WASM module.
        fill(185,10,350,28,mission.phase==1?34:130,mission.phase==1?141:43,73);
    }
    SDL_RenderPresent(renderer);
}
}

int Launch_Courier_Slice(const char* argv0,bool withEngineUnits){
    engineOwned=withEngineUnits;
    if(SDL_Init(SDL_INIT_VIDEO)!=0){std::fprintf(stderr,"[browser-native-slice] SDL_Init failed: %s\n",SDL_GetError());return 1;}
    window=SDL_CreateWindow("Courier Extraction (native C++)",SDL_WINDOWPOS_CENTERED,
                             SDL_WINDOWPOS_CENTERED,720,440,SDL_WINDOW_SHOWN);
    if(!window)return 2;
    renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_ACCELERATED);
    if(!renderer)renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_SOFTWARE);
    if(!renderer)return 3;
    infantryTexture=Browser_Load_Original_Shape(renderer,argv0,"E1.SHP");
    sceneryTexture=Browser_Load_Original_Shape(renderer,argv0,"T01.SHP");
    std::printf("[browser-native-slice] tactical infantry sprite=%s\n",infantryTexture?"loaded":"fallback");
    std::printf("[browser-native-slice] tactical terrain sprite=%s\n",sceneryTexture?"loaded":"fallback");
    if(FILE* map=std::fopen("/COURIER.MAP","rb")){
        char buffer[256];const size_t count=std::fread(buffer,1,sizeof(buffer),map);
        const int extra=std::fgetc(map);std::fclose(map);
        if(extra==EOF&&count>0){
            std::string source(buffer,count);
            if(courier::loadMap(mission,source)){
                missionSource=source;
                std::puts("[browser-native-slice] verified external mission map loaded");
            }else std::puts("[browser-native-slice] invalid external map; using built-in fallback");
        }
    }
    // The observer starts disabled; engine-owned mode binds it only after
    // MapClass staging and successful production infantry placement.
    mission.orderSink=courier::EngineFootBridge::onOrder;
    mission.orderContext=&footBridge;
    std::puts("[browser-native-slice] engine FootClass dispatch=deferred (world not initialized)");
    bool mapStaged=false;
    if(courier::planWorld(mission,16,16,MAP_CELL_W,MAP_CELL_H,worldPlacement)){
        std::printf("[browser-native-slice] engine world plan=ready cells=198 walls=%d scout-cell=%d\n",
                    worldPlacement.blockedCount,worldPlacement.units[0]);
        mapStaged=courier::stageEngineMap(mission,worldPlacement);
        std::printf("[browser-native-slice] engine MapClass terrain=%s\n",mapStaged?"staged":"invalid");
    }else std::puts("[browser-native-slice] engine world plan=invalid");
    if(engineOwned){
        if(!mapStaged||!placeLiveUnits()){
            std::puts("[browser-engine-courier] ERROR: production units could not initialize");
            return 4;
        }
        std::puts("[browser-engine-courier] movement source=InfantryClass::AI");
    }
    // Browser JS writes verified, decoded RGBA bytes to this exact MEMFS path.
    // The fallback marker above is used if the pack is not present/valid.
    if(FILE* input=std::fopen("/COURIER.RGBA","rb")){
        std::vector<unsigned char> bytes(512u*512u*4u);
        const size_t count=std::fread(bytes.data(),1,bytes.size(),input);
        const int extra=std::fgetc(input);
        std::fclose(input);
        if(count==bytes.size()&&extra==EOF){
            cargoTexture=SDL_CreateTexture(renderer,SDL_PIXELFORMAT_RGBA32,
                                           SDL_TEXTUREACCESS_STATIC,512,512);
            if(cargoTexture){
                SDL_SetTextureBlendMode(cargoTexture,SDL_BLENDMODE_BLEND);
                if(SDL_UpdateTexture(cargoTexture,nullptr,bytes.data(),512*4)!=0){
                    SDL_DestroyTexture(cargoTexture);cargoTexture=nullptr;
                }
            }
        }
    }
    std::printf("[browser-native-slice] verified HD aircraft texture=%s\n",cargoTexture?"loaded":"fallback");
    std::puts("[browser-native-slice] C++ tactical mission started; click units/destinations, R restarts");
    lastStep=SDL_GetTicks();
    emscripten_set_main_loop(frame,0,1);
    return 0;
}
int Browser_Native_Slice(const char* argv0){return Launch_Courier_Slice(argv0,false);}
int Browser_Engine_Courier(const char* argv0){return Launch_Courier_Slice(argv0,true);}
#endif
