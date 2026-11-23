// M2b CC0-1.0 host validation against the stock iconset.cpp accessors.
// Generated data only: no proprietary files.
#include "tile.h"
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>
int main(int argc, char** argv)
{
    if (argc != 2)
        return 1;
    std::ifstream file(argv[1], std::ios::binary);
    const std::vector<uint8_t> b{std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>()};
    if (b.size() < 32)
        return 2;
    const void* icon = b.data();
    if (Get_Icon_Set_Size(icon) != static_cast<int>(b.size()))
        return 3;
    if (Get_Icon_Set_Width(icon) != 24 || Get_Icon_Set_Height(icon) != 24)
        return 4;
    if (Get_Icon_Set_Count(icon) != 1)
        return 5;
    const auto* pixels = static_cast<const uint8_t*>(Get_Icon_Set_Icondata(icon));
    const auto* map = static_cast<const uint8_t*>(Get_Icon_Set_Map(icon));
    const auto* flags = static_cast<const uint8_t*>(Get_Icon_Set_Trans(icon));
    if (pixels != b.data() + 32 || pixels[0] == 0 || pixels[25] == 0)
        return 6;
    if (map < b.data() + 32 || map >= b.data() + b.size() || map[0] != 0)
        return 7;
    if (flags < b.data() + 32 || flags >= b.data() + b.size())
        return 8;
    std::puts("PASS: native VanillaTD icon-set accessors on original tile");
    return 0;
}
