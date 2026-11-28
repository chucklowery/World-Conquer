// HD sprite layer compose rules (common/hdlayer.cpp, ADR-0006):
// - the page is scaled up;
// - a recorded sprite is repainted from its HD frame only where the page
//   still shows what its blit left (a later draw stays on top);
// - HD pixels the logical frame did not cover are painted over the
//   unchanged background; HD-transparent pixels the logical frame covered
//   show what was under the sprite;
// - shadow pixels go through the blit's ghost table on the pixel under the
//   sprite, and every pixel through its remap table, as the blitter does;
// - a recorded sprite on top of another leaves the lower one in HD under
//   its own transparent pixels, and a translucent overlay without a sheet
//   darkens the HD pixels under it;
// - records are cleared per group, and per area for the sidebar.
#include "hdlayer.h"
#include <cstdio>
#include <cstring>

static const char* registered = "TEST.SHP";
static const unsigned char shape_data = 0; // stands for the resident SHP
// Any non-null pointer but the page names the file registered last.
static const void* unnamed = nullptr;
const char* WC_Shape_Name(const void* data)
{
    return data && data != unnamed ? registered : nullptr;
}

static int failures = 0;
#define CHECK(cond, ...)                                                                                               \
    do {                                                                                                               \
        if (!(cond)) {                                                                                                 \
            printf("FAIL line %d: ", __LINE__);                                                                        \
            printf(__VA_ARGS__);                                                                                       \
            printf("\n");                                                                                              \
            failures++;                                                                                                \
        }                                                                                                              \
    } while (0)

int main()
{
    const int W = 8, H = 6, S = 2;
    HD::Set_Scale(S);

    // HD frame for a 2x2 logical sprite: 4x4, colour 20, with one shadow
    // pixel (4) in the top-right block and one transparent pixel in the
    // top-left block.
    unsigned char hd[16];
    memset(hd, 20, sizeof(hd));
    hd[3] = 4; // top-right block, row 0
    hd[0] = 0; // top-left block, row 0
    const unsigned char* frames[] = {hd};
    HD::Add_Sheet(registered, S, 2, 2, frames, 1);

    // Ghost table: lookup[4] = row 0, row 0 maps colour c to c + 1.
    static unsigned char ghost[256 + 256];
    memset(ghost, 0xFF, 256);
    ghost[4] = 0;
    for (int c = 0; c < 256; c++)
        ghost[256 + c] = (unsigned char)(c + 1);
    // Remap: 20 -> 21.
    unsigned char fade[256];
    for (int c = 0; c < 256; c++)
        fade[c] = (unsigned char)c;
    fade[20] = 21;

    unsigned char page[W * H];
    memset(page, 10, sizeof(page));

    // Window = whole page. Sprite at (2,2).
    HD::Blit b = {};
    b.shapefile = &shape_data;
    b.frame = 0;
    b.window = page;
    b.pitch = W;
    b.windowW = W;
    b.windowH = H;
    b.x = 2;
    b.y = 2;
    b.w = 2;
    b.h = 2;
    b.ghostLookup = ghost;
    b.fade = fade;
    b.fadeCount = 1;
    int token = HD::Begin(b);
    CHECK(token >= 0, "sprite with a sheet is recorded");
    // The logical blit: covers (2,2), (3,2), (2,3); (3,3) stays clear.
    page[2 * W + 2] = 30;
    page[2 * W + 3] = 30;
    page[3 * W + 2] = 30;
    HD::End(token);
    // A later draw (a health bar) over (2,3).
    page[3 * W + 2] = 99;

    // Wholly outside the window: not recorded ([hd-offscreen] is logged).
    {
        HD::Blit off = b;
        off.x = W + 4;
        CHECK(HD::Begin(off) < 0, "off-screen blit is not recorded");
        // A sheet that does not match the SHP frame size ([hd-reject]).
        HD::Blit bad = b;
        bad.w = 3;
        CHECK(HD::Begin(bad) < 0, "mismatched sheet is not used");
        bad = b;
        bad.frame = 5;
        CHECK(HD::Begin(bad) < 0, "frame past the sheet is not used");
    }

    unnamed = &page;
    b.shapefile = &page; // not a registered file
    CHECK(HD::Begin(b) < 0, "sprite without a sheet is not recorded");

    unsigned char out[W * S * H * S];
    HD::Compose(page, W, W, H, out, W * S);
    auto at = [&](int x, int y) { return out[y * W * S + x]; };

    // Background scaled up.
    CHECK(at(0, 0) == 10 && at(15, 11) == 10, "background %d %d", at(0, 0), at(15, 11));
    // Top-left block: HD-transparent pixel shows the background under the
    // sprite; the rest is HD colour 20 remapped to 21.
    CHECK(at(4, 4) == 10, "transparent HD pixel over a covered logical pixel shows what was under: %d", at(4, 4));
    CHECK(at(5, 4) == 21 && at(4, 5) == 21 && at(5, 5) == 21,
          "HD colour, remapped: %d %d %d",
          at(5, 4),
          at(4, 5),
          at(5, 5));
    // Top-right block: shadow pixel = ghost(background) = 11.
    CHECK(at(7, 4) == 11, "shadow through the ghost table: %d", at(7, 4));
    CHECK(at(6, 4) == 21, "HD colour: %d", at(6, 4));
    // Bottom-left block: the later draw stays on top.
    CHECK(at(4, 6) == 99 && at(5, 7) == 99, "later draw stays on top: %d %d", at(4, 6), at(5, 7));
    // Bottom-right block: the logical frame left it clear, the page is
    // unchanged, so the HD frame paints it.
    CHECK(at(6, 6) == 21 && at(7, 7) == 21, "HD pixels beyond the logical silhouette: %d %d", at(6, 6), at(7, 7));

    // The screen changes without a tactical redraw (a menu over the map):
    // the sprite's own pixels are gone, so it is not repainted even where a
    // pixel happens to match.
    {
        unsigned char menu[W * H];
        memcpy(menu, page, sizeof(menu));
        menu[2 * W + 2] = 50;
        menu[2 * W + 3] = 50; // (3,3) still matches: it was never painted
        HD::Compose(menu, W, W, H, out, W * S);
        CHECK(at(6, 6) == 10 && at(7, 7) == 10, "stale sprite not repainted: %d %d", at(6, 6), at(7, 7));
    }

    // A new tactical redraw forgets the sprite.
    HD::Clear();
    HD::Compose(page, W, W, H, out, W * S);
    CHECK(at(5, 4) == 30, "cleared records leave the scaled page: %d", at(5, 4));

    // Nothing changed since the last call: out is left as it is.
    CHECK(!HD::Compose(page, W, W, H, out, W * S), "unchanged frame is not recomposed");
    page[0] = 11;
    CHECK(HD::Compose(page, W, W, H, out, W * S), "changed page is recomposed");
    CHECK(at(0, 0) == 11 && at(1, 1) == 11, "recomposed page: %d", at(1, 1));

    // Stacking: a sprite on a recorded tile; a translucent overlay without a
    // sheet (the build clock over a cameo) on top of both.
    {
        HD::Clear();
        static const char* tile_name = "TILE.SHP";
        static const unsigned char tile_data = 0, clock_data = 0;
        registered = tile_name;
        unsigned char tile_hd[W * S * H * S];
        for (int i = 0; i < W * S * H * S; i++)
            tile_hd[i] = (unsigned char)(40 + (i & 1)); // a 2x-only pattern: 40 41 40 41
        const unsigned char* tile_frames[] = {tile_hd};
        HD::Add_Sheet(tile_name, S, W, H, tile_frames, 1);

        unsigned char pg[W * H];
        memset(pg, 7, sizeof(pg));
        HD::Blit t = {};
        t.group = HD::GROUP_SIDEBAR;
        t.shapefile = &tile_data;
        t.window = pg;
        t.pitch = W;
        t.windowW = W;
        t.windowH = H;
        t.w = W;
        t.h = H;
        int tok = HD::Begin(t);
        CHECK(tok >= 0, "tile recorded");
        memset(pg, 40, sizeof(pg));
        HD::End(tok);

        // The sprite (TEST.SHP above, 2x2) at (2,2), drawn over the tile.
        registered = "TEST.SHP";
        HD::Blit u = b;
        u.group = HD::GROUP_SIDEBAR;
        u.shapefile = &shape_data;
        u.window = pg;
        u.ghostLookup = nullptr;
        u.fade = nullptr;
        tok = HD::Begin(u);
        CHECK(tok >= 0, "sprite on the tile recorded");
        pg[2 * W + 2] = 30;
        pg[2 * W + 3] = 30;
        pg[3 * W + 2] = 30;
        HD::End(tok);

        // A translucent overlay with no sheet over column 6: one shadow pixel
        // per row (frame value 4 through the ghost table), the rest clear.
        static const char* overlay_name = "CLOCK.SHP";
        registered = overlay_name;
        unsigned char logical[W * H];
        memset(logical, 0, sizeof(logical));
        for (int y = 0; y < H; y++)
            logical[y * W + 6] = 4;
        HD::Blit c = {};
        c.group = HD::GROUP_SIDEBAR;
        c.shapefile = &clock_data;
        c.window = pg;
        c.pitch = W;
        c.windowW = W;
        c.windowH = H;
        c.w = W;
        c.h = H;
        c.ghostLookup = ghost;
        c.pixels = logical;
        tok = HD::Begin(c);
        CHECK(tok >= 0, "translucent overlay without a sheet is recorded");
        for (int y = 0; y < H; y++)
            pg[y * W + 6] = 41;
        HD::End(tok);
        HD::Blit opaque = c;
        opaque.ghostLookup = nullptr;
        CHECK(HD::Begin(opaque) < 0, "opaque sprite without a sheet is not recorded");

        HD::Compose(pg, W, W, H, out, W * S);
        CHECK(at(0, 0) == 40 && at(1, 0) == 41, "tile in HD: %d %d", at(0, 0), at(1, 0));
        CHECK(at(4, 4) == 40, "the tile in HD under the sprite's transparent pixel: %d", at(4, 4));
        CHECK(at(5, 4) == 20, "sprite in HD over the tile: %d", at(5, 4));
        CHECK(at(12, 0) == 41 && at(13, 0) == 42,
              "overlay darkens the HD tile pixel by pixel: %d %d",
              at(12, 0),
              at(13, 0));

        // The column is redrawn: its records go, the rest stay.
        HD::Clear_Area(HD::GROUP_SIDEBAR, 6, 0, 1, H);
        HD::Clear(HD::GROUP_TACTICAL);
        HD::Compose(pg, W, W, H, out, W * S);
        CHECK(at(12, 0) == 41 && at(13, 0) == 41,
              "cleared overlay and tile leave the scaled page: %d %d",
              at(12, 0),
              at(13, 0));
        CHECK(at(5, 4) == 20, "the sprite outside the cleared area stays: %d", at(5, 4));
        HD::Clear(HD::GROUP_SIDEBAR);
        HD::Compose(pg, W, W, H, out, W * S);
        CHECK(at(5, 4) == 30, "sidebar group cleared: %d", at(5, 4));
    }

    if (failures)
        return 1;
    printf("PASS: HD layer compose rules\n");
    return 0;
}
