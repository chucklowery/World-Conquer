// Compares the generated palette tables (tools/content/fading.js) with the
// engine's own builders in common/fading.cpp, run on the same palette.
#include "fading.h"
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

static std::vector<unsigned char> load(const std::string& path)
{
    std::vector<unsigned char> data;
    FILE* f = std::fopen(path.c_str(), "rb");
    if (!f) {
        return data;
    }
    unsigned char buf[4096];
    size_t n;
    while ((n = std::fread(buf, 1, sizeof(buf), f)) > 0) {
        data.insert(data.end(), buf, buf + n);
    }
    std::fclose(f);
    return data;
}

static int check(const std::string& dir, const char* name, const unsigned char* expect, size_t size)
{
    std::vector<unsigned char> got = load(dir + "/" + name);
    if (got.size() != size || std::memcmp(got.data(), expect, size) != 0) {
        std::printf("FAIL: %s differs from the engine builder\n", name);
        return 1;
    }
    return 0;
}

int main(int argc, char** argv)
{
    if (argc != 2) {
        std::printf("usage: %s <dir with TEMPERAT.PAL and T*.MRF>\n", argv[0]);
        return 2;
    }
    const std::string dir = argv[1];
    std::vector<unsigned char> pal = load(dir + "/TEMPERAT.PAL");
    if (pal.size() != 768) {
        std::printf("FAIL: palette missing\n");
        return 1;
    }
    std::memset(&pal[32 * 3], 0x3F, 7 * 3); // display.cpp: cycle colours excluded from remapping
    unsigned char t[256];
    int fails = 0;
    Build_Fading_Table(pal.data(), t, 3, 110); // GREEN
    fails += check(dir, "TGREEN.MRF", t, 256);
    Build_Fading_Table(pal.data(), t, 5, 140); // YELLOW
    fails += check(dir, "TYELLOW.MRF", t, 256);
    Build_Fading_Table(pal.data(), t, 8, 140); // RED
    fails += check(dir, "TRED.MRF", t, 256);
    Conquer_Build_Fading_Table(pal.data(), t, 12, 150); // SHADE: BLACK
    fails += check(dir, "TSHADE.MRF", t, 256);
    Conquer_Build_Fading_Table(pal.data(), t, 15, 85); // LIGHT: WHITE
    fails += check(dir, "TLIGHT.MRF", t, 256);
    unsigned char units[512];
    std::memset(units, 0xFF, 256);
    units[4] = 0; // UNITS: LTGREEN becomes the translucent shadow row
    Conquer_Build_Fading_Table(pal.data(), units + 256, 12, 130);
    fails += check(dir, "TUNITS.MRF", units, 512);
    if (!fails) {
        std::printf("PASS: generated palette tables match the engine builders\n");
    }
    return fails ? 1 : 0;
}
