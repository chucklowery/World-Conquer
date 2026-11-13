// Project-owned indexed SHP sample diagnostic, compiled into the real engine.
// This deliberately does not claim full gameplay renderer integration.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <cstdint>
#include <vector>
#include "common/keyframe.h"
#include "common/paths.h"
#include "common/ccfile.h"

namespace {
SDL_Window* shapeWindow = nullptr;
SDL_Renderer* shapeRenderer = nullptr;
SDL_Texture* shapeTexture = nullptr;

bool ReadEngineFile(const char* filename, std::vector<uint8_t>& bytes, int expected = 0)
{
    CCFileClass file(filename);
    if (!file.Is_Available() || !file.Open(READ)) return false;
    const int length = file.Size();
    if (length < 1 || length > 1024 * 1024 || (expected && length != expected)) {
        file.Close(); return false;
    }
    bytes.resize(length);
    const bool ok = file.Read(bytes.data(), length) == length;
    file.Close();
    return ok;
}

unsigned word(const std::vector<uint8_t>& b, size_t p)
{
    return static_cast<unsigned>(b[p]) | (static_cast<unsigned>(b[p + 1]) << 8);
}

unsigned dword(const std::vector<uint8_t>& b, size_t p)
{
    return word(b, p) | (word(b, p + 2) << 16);
}

// Bound the literal-only LCW stream before calling the original engine's
// Build_Frame(), whose decoder assumes an internally valid asset.
bool ValidateTactical(const std::vector<uint8_t>& bytes, int& w, int& h)
{
    if (bytes.size() < 23 || word(bytes, 0) != 1) return false;
    w = word(bytes, 6);
    h = word(bytes, 8);
    if (!w || !h || static_cast<size_t>(w) * h > 65535) return false;
    const uint32_t keyframe = dword(bytes, 14);
    if ((keyframe >> 24) != 0x80) return false;
    size_t pos = keyframe & 0xFFFFFF;
    if (pos < 22 || pos >= bytes.size()) return false;
    size_t decoded = 0;
    const size_t total = static_cast<size_t>(w) * h;
    while (decoded < total) {
        if (pos >= bytes.size()) return false;
        const unsigned op = bytes[pos++];
        if (op == 0x80 || (op & 0xC0) != 0x80) return false;
        const unsigned count = op & 0x3F;
        if (!count || count > total - decoded || count > bytes.size() - pos) return false;
        for (unsigned i = 0; i < count; i++) {
            if (bytes[pos + i] > 7) return false; // sample palette has indices 0..7
        }
        pos += count;
        decoded += count;
    }
    return true;
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

int Browser_Shape_Probe(const char* argv0)
{
    Paths.Init("vanillatd", "CONQUER.INI", "CONQUER.MIX", argv0);
    std::vector<uint8_t> bytes, pal;
    if (!ReadEngineFile("SCOUT.SHP", bytes) || !ReadEngineFile("SCOUT.PAL", pal, 768)) {
        std::fprintf(stderr, "[browser-shape] engine CCFileClass lookup failed\n"); return 1;
    }
    int width = 0, height = 0;
    if (!ValidateTactical(bytes, width, height)) {
        std::fprintf(stderr, "[browser-shape] invalid tactical keyframe sprite\n"); return 5;
    }
    UseBigShapeBuffer = false;
    std::vector<uint8_t> indexed(static_cast<size_t>(width) * height);
    if (!Build_Frame(bytes.data(), 0, indexed.data()) ||
        Get_Build_Frame_Width(bytes.data()) != width ||
        Get_Build_Frame_Height(bytes.data()) != height) return 11;
    std::vector<uint32_t> rgba;
    rgba.reserve(indexed.size());
    for (uint8_t color : indexed) {
        const unsigned p = color * 3;
        const uint32_t r = static_cast<uint32_t>(pal[p]) << 2;
        const uint32_t g = static_cast<uint32_t>(pal[p + 1]) << 2;
        const uint32_t b = static_cast<uint32_t>(pal[p + 2]) << 2;
        rgba.push_back(color ? (0xff000000 | (r << 16) | (g << 8) | b) : 0);
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
    std::printf("[browser-shape] CCFileClass loaded original palette and tactical SHP; engine Build_Frame decoded %dx%d\n", width, height);
    emscripten_set_main_loop(ShapeFrame, 0, 1);
    return 0;
}
#endif
