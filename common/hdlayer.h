// HD sprite layer (option 3 of the M5 resolution review; ADR-0006).
//
// The engine keeps drawing every frame at its logical resolution (640x400,
// 8-bit). While it draws, sprites that have a high-resolution version
// (NAME.HD2 next to NAME.SHP) are recorded: where they landed, their frame,
// their remap and shadow tables, and the page pixels under them just before
// and just after the blit. When the frame is presented, the page is scaled up
// and each recorded sprite is repainted from its HD frame wherever the page
// still shows what that blit left behind. Anything drawn on top later (shroud,
// health bars, text, other sprites) changes those pixels, so it stays on top
// without the layer knowing the engine's draw order.
//
// Sprites without an HD file, and draws the layer does not handle (cloaked
// "predator" draws), are simply left at the scaled-up logical resolution.
#ifndef COMMON_HDLAYER_H
#define COMMON_HDLAYER_H

#ifdef WC_HD

namespace HD
{

    struct Blit
    {
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
    };

    // Presentation scale (1 = off). Set from Settings.Video.HDScale.
    int Scale();
    void Set_Scale(int scale);

    // Use these frames for shape_name instead of loading NAME.HD2 (tests).
    // Each frame is (w*scale) x (h*scale) palette indices.
    void Add_Sheet(const char* shape_name, int scale, int w, int h, const unsigned char* const* frames, int count);

    // Forget every recorded sprite (called when the tactical view is redrawn).
    void Clear();

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
