// Diagnostic loop in the real VanillaTD executable; no game data is required.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>

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
#endif
