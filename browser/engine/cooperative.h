// Browser-only cooperative suspension point. Native builds never include this.
#ifndef VANILLATD_BROWSER_COOPERATIVE_H
#define VANILLATD_BROWSER_COOPERATIVE_H

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>

// Asyncify preserves the active C++ call stack across this suspension.
// Do not call from an SDL event handler or a JS callback into the engine.
inline void Browser_Cooperative_Yield()
{
    emscripten_sleep(0);
}
#endif

#endif // VANILLATD_BROWSER_COOPERATIVE_H
