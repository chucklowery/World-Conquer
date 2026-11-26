// Browser menu style; see ui_style.cpp.
#pragma once
#ifdef WC_BROWSER_UI
// Include after tiberiandawn/function.h (for BoxStyleEnum).

// Draws a dialog box in the browser style; returns false for styles it does
// not handle (Draw_Box then draws them as before).
bool Browser_Draw_Box(int x, int y, int w, int h, BoxStyleEnum style, bool filled);

// Skirmish setup dialog (nulldlg.cpp Com_Scenario_Dialog), hi-res only: the
// layout of the owner's reference mock-up. Same controls and logic as the
// stock dialog; only positions, headings and decoration differ.
struct BrowserRect
{
    int x, y, w, h;
};
struct BrowserSkirmishLayout
{
    BrowserRect dialog, name, house, color, maps, options, ok, cancel;
    int gauge_x, gauge_w, gauge_h, gauge_y[4];
    int difficulty_x[3], difficulty_y, difficulty_w, difficulty_h;
};
void Browser_Skirmish_Layout(BrowserSkirmishLayout& layout);
void Browser_Skirmish_Background(BrowserSkirmishLayout const& layout);
void Browser_Skirmish_Report(BrowserSkirmishLayout const& layout, int list_row_height);

#endif
