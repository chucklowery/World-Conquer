// Test-only hooks for the browser CI (roadmap M3, automated win).
//
// Compiled into the Emscripten build only. Every hook is inert unless main()
// received --browser-test-hooks, which only the CI test passes; the play
// view calls main() with no arguments. See test_hooks.cpp.
#pragma once
#ifdef __EMSCRIPTEN__

// Removes --browser-test-hooks from argv (so the engine's own command-line
// parser never sees it) and enables the hooks if it was present.
void Browser_Test_Hooks_Parse(int& argc, char** argv);

// Applies a pending request between frames; called once per Main_Loop().
void Browser_Test_Hooks_Frame();

#endif
