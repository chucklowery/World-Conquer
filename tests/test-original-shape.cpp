// Decode the generated sample using the engine's actual LCW implementation.
// This tests a real component of Build_Frame without requiring game media.
#include "lcw.h"
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>

static unsigned word(const std::vector<uint8_t>& b, size_t p)
{
    return static_cast<unsigned>(b[p]) | (static_cast<unsigned>(b[p + 1]) << 8);
}

int main(int argc, char** argv)
{
    if (argc != 2)
        return 1;
    std::ifstream file(argv[1], std::ios::binary);
    if (!file)
        return 2;
    const std::vector<uint8_t> b{std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
    if (b.size() < 23 || word(b, 0) != 1 || word(b, 6) != 8 || word(b, 8) != 8)
        return 3;
    const uint32_t entry = static_cast<uint32_t>(b[14]) | (static_cast<uint32_t>(b[15]) << 8)
                           | (static_cast<uint32_t>(b[16]) << 16) | (static_cast<uint32_t>(b[17]) << 24);
    if ((entry >> 24) != 0x80)
        return 4;
    const size_t offset = entry & 0xFFFFFF;
    if (offset < 22 || offset >= b.size())
        return 5;
    uint8_t output[64] = {};
    if (LCW_Uncompress(b.data() + offset, output, sizeof(output)) != sizeof(output))
        return 6;
    // Top row: 0,0,0,3,3,0,0,0; central accent indexes are 7.
    if (output[3] != 3 || output[4] != 3 || output[27] != 7 || output[36] != 7)
        return 7;
    std::puts("PASS: engine LCW_Uncompress decodes generated tactical SHP");
    return 0;
}
