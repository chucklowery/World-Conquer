#include "courier_engine_map.h"
#include <type_traits>

// Compile-only API contract; linked browser CI exercises the actual MapClass
// initialization and read-back, avoiding a host binary with missing globals.
static_assert(std::is_same<decltype(&courier::stageEngineMap),
                           bool (*)(const courier::State&,const courier::WorldPlan&)>::value,
              "Native MapClass staging adapter signature changed");
