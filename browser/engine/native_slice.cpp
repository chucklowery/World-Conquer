// Native C++ gameplay in the real VanillaTD WebAssembly module.
// Original geometry, no game archives; deliberately isolated from campaigns.
#ifdef __EMSCRIPTEN__
#include "native_slice_core.h"
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <vector>
SDL_Texture* Browser_Load_Original_Infantry(SDL_Renderer*,const char*);

namespace {
SDL_Window* window=nullptr;
SDL_Renderer* renderer=nullptr;
SDL_Texture* cargoTexture=nullptr;
SDL_Texture* infantryTexture=nullptr;
courier::State mission;
std::string missionSource;
Uint32 lastStep=0;
int priorCargo=0,priorPhase=0;

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
            courier::click(mission,{x,y});
            std::printf("[browser-native-slice] click x=%d y=%d selected=%d route=%u\n",
                        x,y,mission.selected,static_cast<unsigned>(mission.units[mission.selected].route.size()));
        }else if(event.type==SDL_KEYDOWN&&event.key.keysym.sym==SDLK_r){
            mission=courier::State();
            if(!missionSource.empty())courier::loadMap(mission,missionSource);
            priorCargo=priorPhase=0;
            std::puts("[browser-native-slice] mission restarted");
        }else if(event.type==SDL_QUIT){
            emscripten_cancel_main_loop();return;
        }
    }
    const Uint32 now=SDL_GetTicks();
    if(now-lastStep>=180){
        courier::tick(mission);lastStep=now;
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
        if(blocked)fill(x*40+5,y*40+5,30,4,109,122,119);
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
        fill(u.p.x*40+10,u.p.y*40+29,u.hp*3,3,17,37,39);
    }
    if(mission.phase!=0){
        // Visible outcome banner; R restarts without reloading the WASM module.
        fill(185,10,350,28,mission.phase==1?34:130,mission.phase==1?141:43,73);
    }
    SDL_RenderPresent(renderer);
}
}

int Browser_Native_Slice(const char* argv0){
    if(SDL_Init(SDL_INIT_VIDEO)!=0){std::fprintf(stderr,"[browser-native-slice] SDL_Init failed: %s\n",SDL_GetError());return 1;}
    window=SDL_CreateWindow("Courier Extraction (native C++)",SDL_WINDOWPOS_CENTERED,
                             SDL_WINDOWPOS_CENTERED,720,440,SDL_WINDOW_SHOWN);
    if(!window)return 2;
    renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_ACCELERATED);
    if(!renderer)renderer=SDL_CreateRenderer(window,-1,SDL_RENDERER_SOFTWARE);
    if(!renderer)return 3;
    infantryTexture=Browser_Load_Original_Infantry(renderer,argv0);
    std::printf("[browser-native-slice] tactical infantry sprite=%s\n",infantryTexture?"loaded":"fallback");
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
#endif
