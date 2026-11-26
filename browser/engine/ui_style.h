// Browser menu style; see ui_style.cpp.
#pragma once
#ifdef WC_BROWSER_UI
// Include after tiberiandawn/function.h (for BoxStyleEnum).

// Draws a dialog box in the browser style; returns false for styles it does
// not handle (Draw_Box then draws them as before).
bool Browser_Draw_Box(int x, int y, int w, int h, BoxStyleEnum style, bool filled);

#endif
