// File-path diagnostic inside the real VanillaTD engine binary.
// Synthetic stand-ins test lookup behavior only: this does not parse a MIX,
// certify media assets, nor claim that any campaign mission can load.
#ifdef __EMSCRIPTEN__
#include "common/paths.h"
#include "common/cdfile.h"
#include "common/ccfile.h"
#include "common/rawfile.h"
#include <cstdio>
#include <string>

int Browser_Data_Probe(const char* argv0)
{
    // Match main()'s path initialization and disc search ordering.
    Paths.Init("vanillatd", "CONQUER.INI", "CONQUER.MIX", argv0);
    CDFileClass::Refresh_Search_Drives();

    const std::string gdi = Paths.Concatenate_Paths(Paths.Data_Path(), "gdi");
    if (RawFileClass(gdi.c_str()).Is_Directory()) {
        CDFileClass::Add_Search_Drive(gdi.c_str());
    }

    const bool conquer = CCFileClass("CONQUER.MIX").Is_Available();
    const bool local = CCFileClass("LOCAL.MIX").Is_Available();
    const bool cclocal = CCFileClass("CCLOCAL.MIX").Is_Available();
    const bool general = CCFileClass("GENERAL.MIX").Is_Available();
    // Optional: many editions package scenario INIs inside other archives.
    const bool looseScenario = CCFileClass("SCG01EA.INI").Is_Available();

    std::printf("[browser-assets] data_path=%s\n", Paths.Data_Path());
    std::printf("[browser-assets] CONQUER.MIX=%d\n", int(conquer));
    std::printf("[browser-assets] LOCAL-or-CCLOCAL.MIX=%d\n", int(local || cclocal));
    std::printf("[browser-assets] GENERAL.MIX=%d\n", int(general));
    std::printf("[browser-assets] loose-SCG01EA.INI=%d (optional)\n", int(looseScenario));
    std::puts("[browser-assets] path lookup only; game archive integrity and mission play not verified.");
    std::fflush(stdout);
    return (conquer && (local || cclocal) && general) ? 0 : 2;
}
#endif
