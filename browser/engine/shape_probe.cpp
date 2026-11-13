// Project-owned tactical SHP diagnostic, compiled into the real engine.
// Uses the game's own CC_Draw_Shape(), not a separate sprite blitter.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <cstdint>
#include <vector>
#include "common/keyframe.h"
#include "common/paths.h"
#include "common/ccfile.h"
#include "tiberiandawn/function.h"

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
    // Render to a small offscreen indexed GraphicBufferClass, using exactly
    // the same CC_Draw_Shape entry point as game units. Restore global draw
    // state immediately; probe UI uses the resulting pixel buffer only.
    const int screenSize = 64;
    std::vector<uint8_t> indexed(screenSize * screenSize, 1);
    GraphicBufferClass backing(screenSize, screenSize, indexed.data(), indexed.size());
    GraphicViewPortClass* previousPage = LogicPage;
    const int oldX = WindowList[WINDOW_TACTICAL][WINDOWX];
    const int oldY = WindowList[WINDOW_TACTICAL][WINDOWY];
    const int oldWidth = WindowList[WINDOW_TACTICAL][WINDOWWIDTH];
    const int oldHeight = WindowList[WINDOW_TACTICAL][WINDOWHEIGHT];
    WindowList[WINDOW_TACTICAL][WINDOWX] = 0;
    WindowList[WINDOW_TACTICAL][WINDOWY] = 0;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH] = screenSize;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT] = screenSize;
    LogicPage = &backing;
    std::vector<uint8_t> shapeScratch(131072);
    Set_Shape_Buffer(shapeScratch.data(), shapeScratch.size());
    UseBigShapeBuffer = false;
    CC_Draw_Shape(bytes.data(), 0, 28, 28, WINDOW_TACTICAL, SHAPE_NORMAL);
    Set_Shape_Buffer(nullptr, 0);
    LogicPage = previousPage;
    WindowList[WINDOW_TACTICAL][WINDOWX] = oldX;
    WindowList[WINDOW_TACTICAL][WINDOWY] = oldY;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH] = oldWidth;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT] = oldHeight;
    if (indexed[28 * screenSize + 28] != 1 || // transparent pixel retains background
        indexed[28 * screenSize + 31] != 3 || indexed[31 * screenSize + 31] != 7) {
        std::fprintf(stderr, "[browser-shape] tactical draw pixel verification failed\n");
        return 11;
    }
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
        SDL_TEXTUREACCESS_STATIC, screenSize, screenSize);
    if (!shapeTexture) return 9;
    SDL_SetTextureBlendMode(shapeTexture, SDL_BLENDMODE_BLEND);
    if (SDL_UpdateTexture(shapeTexture, nullptr, rgba.data(), screenSize * sizeof(uint32_t)) != 0) return 10;
    std::printf("[browser-shape] CC_Draw_Shape rendered original tactical SHP via engine buffer: %dx%d\n", width, height);
    emscripten_set_main_loop(ShapeFrame, 0, 1);
    return 0;
}
#endif
