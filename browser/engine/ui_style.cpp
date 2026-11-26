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

#ifdef WC_BROWSER_UI
namespace
{
    // Gold accent (palette fire ramp, art/palette.js) for header ornaments.
    const int GOLD = 146;
    const int GOLD_DARK = 149;

    // "== TITLE ==": a centred bold heading with gold chevron bars either side.
    void Header(char const* text, int cx, int y)
    {
        Fancy_Text_Print(text, cx, y, CC_GREEN, TBLACK, TPF_GREEN12 | TPF_USE_GRAD_PAL | TPF_CENTER | TPF_NOSHADOW);
        int half = String_Pixel_Width(text) / 2 + 8;
        for (int side = -1; side <= 1; side += 2) {
            int x0 = cx + side * half;
            int x1 = cx + side * (half + 22);
            LogicPage->Draw_Line(x0, y + 3, x1, y + 3, GOLD);
            LogicPage->Draw_Line(x0 + side * 3, y + 5, x1 + side * 4, y + 5, GOLD_DARK);
        }
    }

    // A recessed sub-panel with a teal rim and a notched top edge.
    void Sub_Panel(int x, int y, int w, int h)
    {
        LogicPage->Draw_Rect(x, y, x + w, y + h, STEEL_DARK);
        LogicPage->Draw_Rect(x + 1, y + 1, x + w - 1, y + h - 1, TEAL_DIM);
        LogicPage->Draw_Line(x + 2, y + 2, x + w - 2, y + 2, STEEL_LIGHT);
        LogicPage->Draw_Line(x + w / 2 - 40, y, x + w / 2 + 40, y, TEAL);
    }

    void Label(char const* text, int x, int y)
    {
        Fancy_Text_Print(text, x, y, CC_GREEN, TBLACK, TPF_6PT_GRAD | TPF_USE_GRAD_PAL | TPF_RIGHT | TPF_NOSHADOW);
    }

    void Value_Well(int x, int y, int w, int h)
    {
        // Black: the dialog prints the values on BLACK (nulldlg.cpp).
        LogicPage->Fill_Rect(x, y, x + w, y + h, BLACK);
        LogicPage->Draw_Rect(x, y, x + w, y + h, TEAL_DIM);
    }
} // namespace

void Browser_Skirmish_Layout(BrowserSkirmishLayout& l)
{
    l.dialog = {20, 4, 600, 392};
    l.name = {44, 38, 176, 20};
    l.house = {238, 38, 150, 46};
    l.color = {440, 38, 26, 20};
    l.maps = {48, 98, 532, 88};
    l.gauge_x = 168;
    l.gauge_w = 92;
    l.gauge_h = 12;
    l.gauge_y[0] = 216;
    l.gauge_y[1] = 238;
    l.gauge_y[2] = 260;
    l.gauge_y[3] = 282;
    l.options = {346, 214, 226, 76};
    l.difficulty_y = 322;
    l.difficulty_h = 22;
    l.difficulty_x[0] = 110;
    l.difficulty_x[1] = 250;
    l.difficulty_x[2] = 390;
    l.difficulty_w = 140;
    l.ok = {44, 356, 170, 28};
    l.cancel = {426, 356, 170, 28};
}

void Browser_Skirmish_Background(BrowserSkirmishLayout const& l)
{
    Header("PLAYER NAME", l.name.x + l.name.w / 2, 20);
    Header("SIDE", l.house.x + l.house.w / 2, 20);
    Header("COLOR", l.color.x + l.color.w * 3, 20);

    Sub_Panel(l.maps.x - 10, l.maps.y - 24, l.maps.w + 20, l.maps.h + 32);
    Header("SELECT MAP", l.maps.x + l.maps.w / 2, l.maps.y - 18);

    Sub_Panel(36, 204, 280, 94);
    static char const* const labels[4] = {"UNIT COUNT", "TECH LEVEL", "START CREDITS", "AI PLAYERS"};
    for (int i = 0; i < 4; i++) {
        Label(labels[i], l.gauge_x - 8, l.gauge_y[i]);
        Value_Well(l.gauge_x + l.gauge_w + 6, l.gauge_y[i] - 2, 44, l.gauge_h + 3);
    }

    Sub_Panel(l.options.x - 12, 204, l.options.w + 24, 94);

    Header("DIFFICULTY", l.dialog.x + l.dialog.w / 2, l.difficulty_y - 16);

    // A hatched strip between the two main buttons.
    for (int x = l.ok.x + l.ok.w + 20; x < l.cancel.x - 20; x += 6) {
        LogicPage->Draw_Line(x, l.ok.y + l.ok.h - 6, x + 5, l.ok.y + 6, TEAL_DIM);
    }
}

void Browser_Skirmish_Report(BrowserSkirmishLayout const& l, int list_row_height)
{
    // Positions for the browser tests (check-stock-scenario.js), in game pixels.
    printf("[browser-event] skirmish-dialog ok=%d,%d,%d,%d cancel=%d,%d,%d,%d maps=%d,%d,%d,%d row=%d\n",
           l.ok.x,
           l.ok.y,
           l.ok.w,
           l.ok.h,
           l.cancel.x,
           l.cancel.y,
           l.cancel.w,
           l.cancel.h,
           l.maps.x,
           l.maps.y,
           l.maps.w,
           l.maps.h,
           list_row_height);
    fflush(stdout);
}
#endif
