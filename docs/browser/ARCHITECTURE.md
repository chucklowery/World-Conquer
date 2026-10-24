# Architecture and Source Map

## Target shape

~~~text
Browser UI (minimal HTML first, optional TypeScript later)
    -> local asset selection / virtual file system
    -> Emscripten JS runtime
    -> VanillaTD C++ simulation, menu and game state
    -> SDL2 rendering + input -> HTML canvas
~~~

Do not split rendering into a new JavaScript engine until C++ gameplay runs. Keep native and browser builds in one fork.

## Verified upstream structure

| Responsibility | File | Browser-port notes |
| --- | --- | --- |
| CMake options | CMakeLists.txt | BUILD_VANILLATD, BUILD_VANILLARA, NETWORKING, SDL2, OPENAL |
| VanillaTD executable target | tiberiandawn/CMakeLists.txt | add_executable(VanillaTD), links commonv |
| SDL2 and null audio backend | common/CMakeLists.txt | video_sdl2.cpp; soundio_null.cpp with OPENAL=OFF |
| Video | common/video_sdl2.cpp | Existing SDL2 renderer |
| Input | common/wwkeyboard_sdl2.cpp | Existing SDL event routing |
| Native paths | common/paths_posix.cpp | Assumes native executable paths/home directories |
| Startup | tiberiandawn/startup.cpp | main(), path/config, graphics initialization |
| Game menus and loop | tiberiandawn/conquer.cpp | Main_Game(), Select_Game(), Main_Loop() |
| MIX archives | common/mixfile.cpp | Requires compatible legally obtained game data |

## Adapters required

- Build: Emscripten-aware SDL2 flags, without native find_package(SDL2).
- Platform: browser-safe path/time/OS shims, conditionally compiled.
- Lifecycle: nonblocking frame callback or a documented temporary compatibility strategy for nested synchronous loops.
- Files: import local game data into the virtual filesystem before startup.
- Rendering/input: preserve SDL2 initially; ensure palettes, scaling and focus behave correctly.
- Audio: null backend first; investigate WebAudio later.
- Networking: off until single-player tests pass.

## Early risks

The original game uses blocking menus and nested loops; successful compilation alone does not guarantee a responsive browser. Other risks include POSIX-specific calls, C++ ABI/data layout, browser storage permissions, and asset format/version mismatches.
