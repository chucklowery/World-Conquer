// HD sprite layer (option 3 of the M5 resolution review; ADR-0006).
//
// The engine keeps drawing every frame at its logical resolution (640x400,
// 8-bit). While it draws, sprites that have a high-resolution version
// (NAME.HD2 next to NAME.SHP) are recorded: where they landed, their frame,
// their remap and shadow tables, and the page pixels under them just before
// and just after the blit. When the frame is presented, the page is scaled up
// and each recorded sprite is repainted from its HD frame wherever the page
// still shows what that blit left behind. Anything drawn on top later (shroud,
// health bars, text) changes those pixels, so it stays on top without the
// layer knowing the engine's draw order. A recorded sprite drawn on top of
// another (a unit on a terrain tile, the build clock over a cameo) leaves
// the one under it visible through its own HD pixels: the layer follows the
// chain down while each sprite's "after" matches the "before" of the one
// above it.
//
// Sprites without an HD file, and draws the layer does not handle (cloaked
// "predator" draws), are simply left at the scaled-up logical resolution;
// except translucent overlays (SHAPE_GHOST, such as the build clock), which
// are recorded from their logical frame so they darken the HD pixels under
// them instead of hiding them.
#ifndef COMMON_HDLAYER_H
#define COMMON_HDLAYER_H

#ifdef WC_HD

namespace HD
{

    // Records are kept per group: the tactical view is redrawn whole and
    // forgets its records each time; the sidebar redraws one column at a time.
    enum Group
    {
        GROUP_TACTICAL = 0,
        GROUP_SIDEBAR = 1,
        GROUP_COUNT
    };

    struct Blit
    {
        int group;                        // Group
        const void* shapefile;            // resident SHP data, named by the MIX loader
        int frame;                        // frame number inside it
        unsigned char* window;            // page pixel at the window's top-left corner
        int pitch;                        // page bytes per row
        int windowX, windowY;             // window position on the page
        int windowW, windowH;             // window size (the blit is clipped to it)
        int x, y, w, h;                   // frame rectangle relative to the window, after centring
        const unsigned char* ghostLookup; // SHAPE_GHOST table (256 lookup + rows), or null
        const unsigned char* fade;        // SHAPE_FADING remap table, or null
        int fadeCount;                    // times the remap is applied
        const unsigned char* pixels;      // the decoded logical frame (w x h), or null
    };

    // Presentation scale (1 = off). Set from Settings.Video.HDScale.
    int Scale();
    void Set_Scale(int scale);

    // Use these frames for shape_name instead of loading NAME.HD2 (tests).
    // Each frame is (w*scale) x (h*scale) palette indices.
    void Add_Sheet(const char* shape_name, int scale, int w, int h, const unsigned char* const* frames, int count);

    // Forget every recorded sprite of a group (the tactical view: on each
    // redraw), or those of a group that overlap a page rectangle (a sidebar
    // column, before it redraws).
    void Clear(int group = GROUP_TACTICAL);
    void Clear_Area(int group, int x, int y, int w, int h);

    // Around a blit: Begin returns a token, or -1 if the sprite is not recorded.
    int Begin(const Blit& blit);
    void End(int token);

    // Scale the presented page (w x h, palette indices) into out ((w*s) x (h*s))
    // and repaint the recorded sprites in HD.
    // Returns false (and leaves out alone) when neither the page nor the
    // records changed since the last call with the same out buffer.
    bool Compose(const unsigned char* page, int pitch, int w, int h, unsigned char* out, int out_pitch);

} // namespace HD

#endif // WC_HD
#endif
