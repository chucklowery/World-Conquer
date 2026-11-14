// Project-owned tactical SHP diagnostic, compiled into the real engine.
// Uses the game's own CC_Draw_Shape(), not a separate sprite blitter.
#ifdef __EMSCRIPTEN__
#include <SDL2/SDL.h>
#include <emscripten/emscripten.h>
#include <cstdio>
#include <cstring>
#include <cstdint>
#include <vector>
#include "common/keyframe.h"
#include "common/paths.h"
#include "common/cdfile.h"
#include "common/ccfile.h"
#include "tiberiandawn/function.h"

namespace {
SDL_Window* shapeWindow = nullptr;
SDL_Renderer* shapeRenderer = nullptr;
SDL_Texture* shapeTexture = nullptr;
SDL_Rect shapeDestination = {232, 72, 256, 256};

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
bool ValidateTactical(const std::vector<uint8_t>& bytes, int& w, int& h, int frameIndex = 0)
{
    if (bytes.size() < 23) return false;
    const unsigned frames = word(bytes, 0);
    const size_t tableEnd = 14 + static_cast<size_t>(frames) * 8;
    if (!frames || frameIndex < 0 || static_cast<unsigned>(frameIndex) >= frames || tableEnd > bytes.size()) return false;
    w = word(bytes, 6);
    h = word(bytes, 8);
    if (!w || !h || static_cast<size_t>(w) * h > 65535) return false;
    const uint32_t keyframe = dword(bytes, 14 + static_cast<size_t>(frameIndex) * 8);
    if ((keyframe >> 24) != 0x80) return false;
    size_t pos = keyframe & 0xFFFFFF;
    if (pos < tableEnd || pos >= bytes.size()) return false;
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
    SDL_RenderCopy(shapeRenderer, shapeTexture, nullptr, &shapeDestination);
    SDL_RenderPresent(shapeRenderer);
}

int StartShapePreview(const std::vector<uint8_t>& indexed, const std::vector<uint8_t>& pal,
                      int width, int height, const char* title, SDL_Rect destination)
{
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
    shapeWindow = SDL_CreateWindow(title, SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
                                   720, 400, SDL_WINDOW_SHOWN);
    if (!shapeWindow) return 7;
    shapeRenderer = SDL_CreateRenderer(shapeWindow, -1, SDL_RENDERER_ACCELERATED);
    if (!shapeRenderer) shapeRenderer = SDL_CreateRenderer(shapeWindow, -1, SDL_RENDERER_SOFTWARE);
    if (!shapeRenderer) return 8;
    shapeTexture = SDL_CreateTexture(shapeRenderer, SDL_PIXELFORMAT_ARGB8888,
                                     SDL_TEXTUREACCESS_STATIC, width, height);
    if (!shapeTexture) return 9;
    SDL_SetTextureBlendMode(shapeTexture, SDL_BLENDMODE_BLEND);
    if (SDL_UpdateTexture(shapeTexture, nullptr, rgba.data(), width * sizeof(uint32_t)) != 0) return 10;
    shapeDestination = destination;
    emscripten_set_main_loop(ShapeFrame, 0, 1);
    return 0;
}
}

int Browser_Shape_Probe(const char* argv0)
{
    Paths.Init("vanillatd", "CONQUER.INI", "CONQUER.MIX", argv0);
    CDFileClass::Refresh_Search_Drives();
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
    std::printf("[browser-shape] CC_Draw_Shape rendered original tactical SHP via engine buffer: %dx%d\n", width, height);
    return StartShapePreview(indexed, pal, screenSize, screenSize,
                             "World-Conquer original sprite probe", {232, 72, 256, 256});
}

// A six-class integration gate for the generated wireframe manifest: this
// exercises the actual engine's loose-file lookup and SHP draw path, without
// implying that the full animation contracts or standalone missions work.
int Browser_Wireframe_Probe(const char* argv0)
{
    Paths.Init("vanillatd", "CONQUER.INI", "CONQUER.MIX", argv0);
    CDFileClass::Refresh_Search_Drives();
    std::vector<uint8_t> pal;
    if (!ReadEngineFile("WIREFRAME.PAL", pal, 768)) {
        std::fprintf(stderr, "[browser-wireframes] engine palette lookup failed\n"); return 20;
    }
    const char* filenames[] = {"E1.SHP", "MTNK.SHP", "ORCA.SHP", "FACT.SHP", "T01.SHP", "ART-EXP1.SHP"};
    const int actionFrames[] = {64, 32, 32, 5, 1, 0}; // C++-audited action probes; see contracts.json.
    constexpr int cell = 96, columns = 3, rows = 2;
    constexpr int screenWidth = columns * cell, screenHeight = rows * cell;
    std::vector<uint8_t> indexed(screenWidth * screenHeight, 1);
    GraphicBufferClass backing(screenWidth, screenHeight, indexed.data(), indexed.size());
    GraphicViewPortClass* previousPage = LogicPage;
    const int oldX = WindowList[WINDOW_TACTICAL][WINDOWX];
    const int oldY = WindowList[WINDOW_TACTICAL][WINDOWY];
    const int oldWidth = WindowList[WINDOW_TACTICAL][WINDOWWIDTH];
    const int oldHeight = WindowList[WINDOW_TACTICAL][WINDOWHEIGHT];
    WindowList[WINDOW_TACTICAL][WINDOWX] = 0;
    WindowList[WINDOW_TACTICAL][WINDOWY] = 0;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH] = screenWidth;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT] = screenHeight;
    LogicPage = &backing;
    std::vector<uint8_t> shapeScratch(131072);
    Set_Shape_Buffer(shapeScratch.data(), shapeScratch.size());
    UseBigShapeBuffer = false;
    int failed = 0;
    for (int i = 0; i < columns * rows; ++i) {
        std::vector<uint8_t> bytes;
        int width = 0, height = 0;
        if (!ReadEngineFile(filenames[i], bytes) || !ValidateTactical(bytes, width, height) ||
            !ValidateTactical(bytes, width, height, actionFrames[i]) ||
            width > cell / 2 || height > cell) {
            std::fprintf(stderr, "[browser-wireframes] invalid/missing shape %s\n", filenames[i]);
            failed = 21; break;
        }
        const int x = (i % columns) * cell + cell / 4;
        const int y = (i / columns) * cell + cell / 2;
        CC_Draw_Shape(bytes.data(), 0, x, y, WINDOW_TACTICAL, SHAPE_NORMAL);
        CC_Draw_Shape(bytes.data(), actionFrames[i], x + cell / 2, y, WINDOW_TACTICAL, SHAPE_NORMAL);
        int baseDrawn = 0, actionDrawn = 0;
        for (int py = (i / columns) * cell; py < ((i / columns) + 1) * cell; ++py) {
            for (int px = (i % columns) * cell; px < ((i % columns) + 1) * cell; ++px) {
                if (px < (i % columns) * cell + cell / 2) {
                    baseDrawn += indexed[py * screenWidth + px] != 1;
                } else {
                    actionDrawn += indexed[py * screenWidth + px] != 1;
                }
            }
        }
        if (!baseDrawn || !actionDrawn) {
            std::fprintf(stderr, "[browser-wireframes] empty engine render %s base=%d action=%d\n",
                         filenames[i], baseDrawn, actionDrawn);
            failed = 22; break;
        }
        std::printf("[browser-wireframes] CC_Draw_Shape %s %dx%d base=%d state-frame=%d pixels=%d\n",
                    filenames[i], width, height, baseDrawn, actionFrames[i], actionDrawn);
    }
    Set_Shape_Buffer(nullptr, 0);
    LogicPage = previousPage;
    WindowList[WINDOW_TACTICAL][WINDOWX] = oldX;
    WindowList[WINDOW_TACTICAL][WINDOWY] = oldY;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH] = oldWidth;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT] = oldHeight;
    if (failed) return failed;
    std::printf("[browser-wireframes] rendered 6 original placeholder shapes via native engine\n");
    return StartShapePreview(indexed, pal, screenWidth, screenHeight,
                             "World-Conquer wireframe states (base + action)", {72, 8, 576, 384});
}

// Reuse the real indexed tactical drawing path in the standalone native
// mission. Returns null for missing/unverified content; no proprietary media.
SDL_Texture* Browser_Load_Original_Shape(SDL_Renderer* renderer, const char* argv0, const char* filename)
{
    if(!filename||(std::strcmp(filename,"E1.SHP")!=0&&std::strcmp(filename,"T01.SHP")!=0))return nullptr;
    Paths.Init("vanillatd", "CONQUER.INI", "CONQUER.MIX", argv0);
    CDFileClass::Refresh_Search_Drives();
    std::vector<uint8_t> shape, pal;
    int w=0,h=0;
    if(!ReadEngineFile(filename,shape)||!ReadEngineFile("WIREFRAME.PAL",pal,768)||
       !ValidateTactical(shape,w,h,0)||w>64||h>64)return nullptr;
    constexpr int size=64;
    std::vector<uint8_t> indexed(size*size,0);
    GraphicBufferClass backing(size,size,indexed.data(),indexed.size());
    GraphicViewPortClass* previousPage=LogicPage;
    const int oldX=WindowList[WINDOW_TACTICAL][WINDOWX];
    const int oldY=WindowList[WINDOW_TACTICAL][WINDOWY];
    const int oldWidth=WindowList[WINDOW_TACTICAL][WINDOWWIDTH];
    const int oldHeight=WindowList[WINDOW_TACTICAL][WINDOWHEIGHT];
    WindowList[WINDOW_TACTICAL][WINDOWX]=0;
    WindowList[WINDOW_TACTICAL][WINDOWY]=0;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH]=size;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT]=size;
    LogicPage=&backing;
    std::vector<uint8_t> scratch(131072);
    Set_Shape_Buffer(scratch.data(),scratch.size());
    UseBigShapeBuffer=false;
    CC_Draw_Shape(shape.data(),0,size/2,size/2,WINDOW_TACTICAL,SHAPE_NORMAL);
    Set_Shape_Buffer(nullptr,0);
    LogicPage=previousPage;
    WindowList[WINDOW_TACTICAL][WINDOWX]=oldX;
    WindowList[WINDOW_TACTICAL][WINDOWY]=oldY;
    WindowList[WINDOW_TACTICAL][WINDOWWIDTH]=oldWidth;
    WindowList[WINDOW_TACTICAL][WINDOWHEIGHT]=oldHeight;
    std::vector<uint32_t> rgba(size*size,0);
    int painted=0;
    for(size_t i=0;i<indexed.size();i++){
        const unsigned index=indexed[i];
        if(!index)continue;
        ++painted;
        const unsigned p=index*3;
        rgba[i]=0xff000000u|((static_cast<uint32_t>(pal[p])<<2)<<16)|
            ((static_cast<uint32_t>(pal[p+1])<<2)<<8)|(static_cast<uint32_t>(pal[p+2])<<2);
    }
    if(!painted)return nullptr;
    SDL_Texture* texture=SDL_CreateTexture(renderer,SDL_PIXELFORMAT_ARGB8888,
                                          SDL_TEXTUREACCESS_STATIC,size,size);
    if(!texture)return nullptr;
    SDL_SetTextureBlendMode(texture,SDL_BLENDMODE_BLEND);
    if(SDL_UpdateTexture(texture,nullptr,rgba.data(),size*sizeof(uint32_t))!=0){
        SDL_DestroyTexture(texture);return nullptr;
    }
    std::printf("[browser-native-slice] CC_Draw_Shape %s texture pixels=%d\n",filename,painted);
    return texture;
}
#endif
