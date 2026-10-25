// Diagnostic loop in the real VanillaTD executable; no game data is required.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include "cooperative.h"

namespace {
SDL_Window* window = nullptr;
SDL_Renderer* renderer = nullptr;
bool orange = false;
void Frame()
{
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_MOUSEBUTTONDOWN) {
            orange = !orange;
            std::printf("[browser-probe] mouse button=%d\n", event.button.button);
        } else if (event.type == SDL_KEYDOWN) {
            std::printf("[browser-probe] key code=%d\n", event.key.keysym.sym);
        } else if (event.type == SDL_QUIT) {
            emscripten_cancel_main_loop();
            return;
        }
    }
    SDL_SetRenderDrawColor(renderer, 17, 26, 37, 255);
    SDL_RenderClear(renderer);
    SDL_Rect r = {50 + static_cast<int>((SDL_GetTicks() / 15) % 490), 130, 120, 110};
    if (orange) SDL_SetRenderDrawColor(renderer, 232, 164, 60, 255);
    else SDL_SetRenderDrawColor(renderer, 62, 216, 155, 255);
    SDL_RenderFillRect(renderer, &r);
    SDL_RenderPresent(renderer);
}
}

int Browser_Probe()
{
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        std::fprintf(stderr, "[browser-probe] SDL_Init: %s\n", SDL_GetError());
        return 1;
    }
    window = SDL_CreateWindow("VanillaTD Browser Probe", SDL_WINDOWPOS_CENTERED,
                              SDL_WINDOWPOS_CENTERED, 720, 400, SDL_WINDOW_SHOWN);
    if (!window) {
        std::fprintf(stderr, "[browser-probe] SDL_CreateWindow: %s\n", SDL_GetError());
        return 2;
    }
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (!renderer) renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    if (!renderer) {
        std::fprintf(stderr, "[browser-probe] SDL_CreateRenderer: %s\n", SDL_GetError());
        return 3;
    }
    std::puts("[browser-probe] real VanillaTD module; click canvas and press a key.");
    emscripten_set_main_loop(Frame, 0, 1);
    return 0;
}

// Prove Asyncify can resume an actual synchronous C++ while loop across
// browser turns. Unlike Browser_Probe(), this does NOT use
// emscripten_set_main_loop: it exercises the same yield primitive used by
// Main_Game, Select_Game and Frame_Limiter.
int Browser_Cooperative_Probe()
{
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        std::fprintf(stderr, "[browser-cooperative] SDL_Init: %s\n", SDL_GetError());
        return 1;
    }
    SDL_Window* probeWindow =
        SDL_CreateWindow("VanillaTD Cooperative Loop", SDL_WINDOWPOS_CENTERED,
                         SDL_WINDOWPOS_CENTERED, 720, 400, SDL_WINDOW_SHOWN);
    if (!probeWindow) {
        std::fprintf(stderr, "[browser-cooperative] window: %s\n", SDL_GetError());
        return 2;
    }
    SDL_Renderer* probeRenderer = SDL_CreateRenderer(probeWindow, -1, SDL_RENDERER_ACCELERATED);
    if (!probeRenderer) {
        probeRenderer = SDL_CreateRenderer(probeWindow, -1, SDL_RENDERER_SOFTWARE);
    }
    if (!probeRenderer) {
        std::fprintf(stderr, "[browser-cooperative] renderer: %s\n", SDL_GetError());
        SDL_DestroyWindow(probeWindow);
        return 3;
    }

    bool alternate = false;
    bool done = false;
    unsigned frames = 0;
    const Uint32 started = SDL_GetTicks();
    std::puts("[browser-cooperative] synchronous loop started; Asyncify yields to browser.");

    // Deliberately use a native-style blocking loop, like the real game.
    // Browser_Cooperative_Yield suspends and then restores the C++ stack.
    while (!done && SDL_GetTicks() - started < 10000) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_MOUSEBUTTONDOWN) {
                alternate = !alternate;
                std::printf("[browser-cooperative] mouse button=%d\n", event.button.button);
            } else if (event.type == SDL_KEYDOWN) {
                std::printf("[browser-cooperative] key code=%d\n", event.key.keysym.sym);
            } else if (event.type == SDL_QUIT) {
                done = true;
            }
        }

        SDL_SetRenderDrawColor(probeRenderer, 17, 26, 37, 255);
        SDL_RenderClear(probeRenderer);
        SDL_Rect rect = {30 + static_cast<int>((SDL_GetTicks() / 15) % 520), 135, 115, 100};
        if (alternate) SDL_SetRenderDrawColor(probeRenderer, 235, 175, 71, 255);
        else SDL_SetRenderDrawColor(probeRenderer, 96, 171, 249, 255);
        SDL_RenderFillRect(probeRenderer, &rect);
        SDL_RenderPresent(probeRenderer);
        ++frames;
        Browser_Cooperative_Yield();
    }

    std::printf("[browser-cooperative] loop exited after %u frames\n", frames);
    SDL_DestroyRenderer(probeRenderer);
    SDL_DestroyWindow(probeWindow);
    return 0;
}

#endif
