// Independent SDL2/Emscripten WebAssembly smoke test: not the VanillaTD engine.
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>

namespace {
SDL_Window* window = nullptr;
SDL_Renderer* renderer = nullptr;
bool toggled = false;

void frame() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            emscripten_cancel_main_loop();
            SDL_DestroyRenderer(renderer);
            SDL_DestroyWindow(window);
            SDL_Quit();
            return;
        }
        if (event.type == SDL_MOUSEBUTTONDOWN) {
            toggled = !toggled;
            std::printf("SDL2 mouse click toggled=%d\n", toggled);
        }
        if (event.type == SDL_KEYDOWN) {
            std::printf("SDL2 keycode=%d\n", event.key.keysym.sym);
        }
    }
    SDL_SetRenderDrawColor(renderer, 15, 22, 33, 255);
    SDL_RenderClear(renderer);
    const int x = 80 + static_cast<int>((SDL_GetTicks() / 12) % 460);
    SDL_Rect rectangle = {x, 100, 125, 125};
    if (toggled) SDL_SetRenderDrawColor(renderer, 243, 168, 60, 255);
    else SDL_SetRenderDrawColor(renderer, 48, 215, 144, 255);
    SDL_RenderFillRect(renderer, &rectangle);
    SDL_RenderPresent(renderer);
}
} // namespace

int main() {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        std::fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return 1;
    }
    window = SDL_CreateWindow("Browser SDL2 smoke", SDL_WINDOWPOS_CENTERED,
                              SDL_WINDOWPOS_CENTERED, 720, 360, SDL_WINDOW_SHOWN);
    if (!window) {
        std::fprintf(stderr, "SDL_CreateWindow failed: %s\n", SDL_GetError());
        SDL_Quit();
        return 2;
    }
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
    if (!renderer) renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    if (!renderer) {
        std::fprintf(stderr, "SDL_CreateRenderer failed: %s\n", SDL_GetError());
        SDL_DestroyWindow(window);
        SDL_Quit();
        return 3;
    }
    std::puts("SDL2 WebAssembly smoke ready; click canvas and press a key.");
    emscripten_set_main_loop(frame, 0, 1);
    return 0;
}
