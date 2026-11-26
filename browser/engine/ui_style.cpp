// Browser menu style (WC_BROWSER_UI; the Emscripten build sets it in
// tiberiandawn/CMakeLists.txt). Native builds keep the stock look.
//
// Draw_Box (tiberiandawn/dialog.cpp) draws every dialog frame, button, list
// box and slider from a few fixed palette colours; with the generated palette
// several of its edges were black on black. This draws the same boxes in the
// M5 command-console style instead (docs/milestones/UI-command-interface.md):
// brushed-steel panels, a teal inner edge, bevelled buttons that light up when
// pressed, and dark list wells with a teal rim. Layout and behaviour are
// unchanged: only the pixels inside each box's rectangle differ.
#ifdef WC_BROWSER_UI
#include "tiberiandawn/function.h"
#include "ui_style.h"

extern void CC_Texture_Fill(void const* shapefile, int shapenum, int xpos, int ypos, int width, int height);

namespace
{
    // Palette indices (tools/content/art/palette.js; test-art.js checks them):
    // steel ramp 48-63 (bright to dark) and the dialog entries 140, 141, 159, 167.
    const int STEEL_LIGHT = 51;
    const int STEEL_MID = 56;
    const int STEEL_DARK = 61;
    const int WELL = 62;
    const int TEAL_DIM = 140;
    const int PANEL = 141;
    const int TEAL = 159;
    const int TEAL_BRIGHT = 167;

    void Frame_Rect(int x0, int y0, int x1, int y1, int c)
    {
        LogicPage->Draw_Rect(x0, y0, x1, y1, c);
    }

    void Bevel(int x, int y, int w, int h, int light, int dark)
    {
        LogicPage->Draw_Line(x, y, x + w, y, light);
        LogicPage->Draw_Line(x, y, x, y + h, light);
        LogicPage->Draw_Line(x, y + h, x + w, y + h, dark);
        LogicPage->Draw_Line(x + w, y, x + w, y + h, dark);
    }

    void Panel_Fill(int x, int y, int w, int h)
    {
        void const* texture = MFCD::Retrieve("BTEXTURE.SHP");
        if (texture) {
            CC_Texture_Fill(texture, InMainLoop, x, y, w, h);
        } else {
            LogicPage->Fill_Rect(x, y, x + w, y + h, PANEL);
        }
    }
} // namespace

bool Browser_Draw_Box(int x, int y, int w, int h, BoxStyleEnum style, bool filled)
{
    if (w < 3 || h < 3) {
        return false;
    }
    w--;
    h--;
    switch (style) {
    case BOXSTYLE_GREEN_BORDER: // dialog frame
        if (filled) {
            Panel_Fill(x, y, w, h);
        }
        Frame_Rect(x, y, x + w, y + h, STEEL_DARK);
        Bevel(x + 1, y + 1, w - 2, h - 2, STEEL_LIGHT, STEEL_DARK);
        Frame_Rect(x + 3, y + 3, x + w - 3, y + h - 3, TEAL_DIM);
        Frame_Rect(x + 4, y + 4, x + w - 4, y + h - 4, TEAL);
        return true;

    case BOXSTYLE_GREEN_RAISED: // button, up
        if (filled) {
            Panel_Fill(x, y, w, h);
        }
        Frame_Rect(x, y, x + w, y + h, STEEL_DARK);
        Bevel(x + 1, y + 1, w - 2, h - 2, STEEL_LIGHT, STEEL_DARK);
        LogicPage->Draw_Line(x + 2, y + h - 2, x + w - 2, y + h - 2, TEAL_DIM);
        return true;

    case BOXSTYLE_GREEN_DOWN: // button, pressed or selected
        if (filled) {
            LogicPage->Fill_Rect(x, y, x + w, y + h, TEAL_DIM);
        }
        Frame_Rect(x, y, x + w, y + h, TEAL_BRIGHT);
        Frame_Rect(x + 1, y + 1, x + w - 1, y + h - 1, TEAL);
        return true;

    case BOXSTYLE_GREEN_DIS_RAISED:
    case BOXSTYLE_GREEN_DIS_DOWN:
        if (filled) {
            LogicPage->Fill_Rect(x, y, x + w, y + h, WELL);
        }
        Frame_Rect(x, y, x + w, y + h, STEEL_MID);
        return true;

    case BOXSTYLE_GREEN_BOX: // list box and menu box
        if (filled) {
            LogicPage->Fill_Rect(x, y, x + w, y + h, WELL);
        }
        Frame_Rect(x, y, x + w, y + h, TEAL);
        return true;

    default:
        return false;
    }
}
#endif
