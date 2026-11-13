// Native LCW decoder gate for selected generated gameplay-state frames.
// Uses the original engine decoder, not the JavaScript packer's decoder.
#include "lcw.h"
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>

struct FrameContract
{
    unsigned minimumFrames;
    std::vector<unsigned> probes;
};

static unsigned word(const std::vector<uint8_t>& bytes, size_t offset)
{
    return static_cast<unsigned>(bytes[offset]) | (static_cast<unsigned>(bytes[offset + 1]) << 8);
}

static unsigned dword(const std::vector<uint8_t>& bytes, size_t offset)
{
    return word(bytes, offset) | (word(bytes, offset + 2) << 16);
}

int main(int argc, char** argv)
{
    if (argc != 7)
        return 1;

    const std::vector<FrameContract> contracts = {
        {532, {0, 16, 64, 192, 418, 531}}, // E1 infantry choreography
        {64, {0, 31, 32, 63}},          // MTNK body and turret
        {64, {0, 31, 32, 63}},          // ORCA normal and high-speed facings
        {1, {0}},                       // FACT base (construction separate)
        {2, {0, 1}},                    // T01 normal and damaged
        {1, {0}}                        // ART-EXP1 dynamic effect length
    };
    for (int i = 0; i < 6; ++i) {
        std::ifstream file(argv[i + 1], std::ios::binary);
        if (!file)
            return 2;
        const std::vector<uint8_t> bytes{std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
        if (bytes.size() < 22)
            return 3;
        const unsigned count = word(bytes, 0);
        const unsigned width = word(bytes, 6);
        const unsigned height = word(bytes, 8);
        const size_t tableEnd = 14 + static_cast<size_t>(count) * 8;
        if (count < contracts[i].minimumFrames || !width || !height || width * height > 65535
            || tableEnd > bytes.size()) {
            return 4;
        }
        for (unsigned frame : contracts[i].probes) {
            if (frame >= count)
                return 5;
            const uint32_t entry = dword(bytes, 14 + frame * 8);
            const size_t offset = entry & 0xFFFFFF;
            if ((entry >> 24) != 0x80 || offset < tableEnd || offset >= bytes.size())
                return 6;
            std::vector<uint8_t> pixels(width * height);
            if (LCW_Uncompress(bytes.data() + offset, pixels.data(), pixels.size()) != pixels.size())
                return 7;
            bool visible = false;
            for (uint8_t color : pixels) {
                if (color > 7)
                    return 8;
                if (color > 1)
                    visible = true;
            }
            if (!visible)
                return 9;
        }
        std::printf("PASS: engine LCW decoded %zu state frames from %s (%u total)\n",
                    contracts[i].probes.size(), argv[i + 1], count);
    }
    return 0;
}
