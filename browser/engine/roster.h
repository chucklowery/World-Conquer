// The M5 skirmish roster (roadmap M5, "minimum roster only"; ADR-0005).
//
// Compiled when WC_MINIMUM_ROSTER is defined (the Emscripten build sets it in
// tiberiandawn/CMakeLists.txt; native builds keep the stock rules).
#pragma once
#ifdef WC_MINIMUM_ROSTER

// Call once after the type classes' One_Time() (init.cpp). Makes exactly the
// roster buildable, by both sides, and nothing else. See roster.cpp.
void Browser_Apply_Roster();

#endif
