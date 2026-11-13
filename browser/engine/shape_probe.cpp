// Project-owned indexed SHP sample diagnostic, compiled into the real engine.
// This deliberately does not claim full gameplay renderer integration.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <cstdint>
#include <vector>

namespace {
SDL_Window* shapeWindow = nullptr;
SDL_Renderer* shapeRenderer = nullptr;
SDL_Texture* shapeTexture = nullptr;

unsigned word(const std::vector<uint8_t>& b, size_t p)
{
    return static_cast<unsigned>(b[p]) | (static_cast<unsigned>(b[p + 1]) << 8);
}

unsigned dword(const std::vector<uint8_t>& b, size_t p)
{
    return word(b, p) | (word(b, p + 2) << 16);
}

// Decode the ShapeType=2 (no LCW compression) zero-run variant.
bool Decode(const std::vector<uint8_t>& bytes, std::vector<uint32_t>& rgba, int& w, int& h)
{
    if (bytes.size() < 16 || word(bytes, 0) != 1) return false;
    const size_t p = 2 + dword(bytes, 2);
    if (p > bytes.size() || bytes.size() - p < 10 || word(bytes, p) != 2) return false;
    w = word(bytes, p + 3);
    h = bytes[p + 2];
    const size_t length = word(bytes, p + 8);
    const size_t size = word(bytes, p + 6);
    if (!w || !h || length != static_cast<size_t>(w) * h ||
        length > 65535 || size < 10 || size > bytes.size() - p) return false;
    const uint32_t palette[] = {0x00000000, 0xff172a36, 0xff277e68,
        0xff45cba2, 0xff4e97c8, 0xffa1e7d3, 0xffd7a45b, 0xfff4e6bd};
    rgba.clear();
    rgba.reserve(length);
    for (size_t i = p + 10; i < p + size;) {
        const uint8_t color = bytes[i++];
        if (color) {
            if (color >= sizeof(palette) / sizeof(palette[0])) return false;
            rgba.push_back(palette[color]);
        } else {
            if (i == p + size || bytes[i] == 0) return false;
            const unsigned run = bytes[i++];
            if (rgba.size() + run > length) return false;
            rgba.insert(rgba.end(), run, 0);
        }
        if (rgba.size() > length) return false;
    }
    return rgba.size() == length;
}

void ShapeFrame()
{
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) { emscripten_cancel_main_loop(); return; }
    }
    SDL_SetRenderDrawColor(shapeRenderer, 17, 26, 37, 255);
    SDL_RenderClear(shapeRenderer);
    SDL_Rect dst = {232, 72, 256, 256};
    SDL_RenderCopy(shapeRenderer, shapeTexture, nullptr, &dst);
    SDL_RenderPresent(shapeRenderer);
}
}

int Browser_Shape_Probe()
{
    FILE* file = std::fopen("/game/SCOUT.SHP", "rb");
    if (!file) { std::fprintf(stderr, "[browser-shape] missing /game/SCOUT.SHP\n"); return 1; }
    if (std::fseek(file, 0, SEEK_END) != 0) { std::fclose(file); return 2; }
    const long length = std::ftell(file);
    if (length < 16 || length > 1024 * 1024 || std::fseek(file, 0, SEEK_SET) != 0) {
        std::fclose(file); return 3;
    }
    std::vector<uint8_t> bytes(static_cast<size_t>(length));
    const bool read = std::fread(bytes.data(), 1, bytes.size(), file) == bytes.size();
    std::fclose(file);
    if (!read) return 4;
    int width = 0, height = 0;
    std::vector<uint32_t> rgba;
    if (!Decode(bytes, rgba, width, height)) {
        std::fprintf(stderr, "[browser-shape] invalid indexed sprite\n"); return 5;
    }
    if (SDL_Init(SDL_INIT_VIDEO) != 0) return 6;
    shapeWindow = SDL_CreateWindow("World-Conquer original sprite probe", SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED, 720, 400, SDL_WINDOW_SHOWN);
    if (!shapeWindow) return 7;
    shapeRenderer = SDL_CreateRenderer(shapeWindow, -1, SDL_RENDERER_ACCELERATED);
    if (!shapeRenderer) shapeRenderer = SDL_CreateRenderer(shapeWindow, -1, SDL_RENDERER_SOFTWARE);
    if (!shapeRenderer) return 8;
    shapeTexture = SDL_CreateTexture(shapeRenderer, SDL_PIXELFORMAT_ARGB8888,
        SDL_TEXTUREACCESS_STATIC, width, height);
    if (!shapeTexture) return 9;
    SDL_SetTextureBlendMode(shapeTexture, SDL_BLENDMODE_BLEND);
    if (SDL_UpdateTexture(shapeTexture, nullptr, rgba.data(), width * sizeof(uint32_t)) != 0) return 10;
    std::printf("[browser-shape] original indexed SHP decoded and uploaded to SDL2 texture: %dx%d\n", width, height);
    emscripten_set_main_loop(ShapeFrame, 0, 1);
    return 0;
}
#endif
