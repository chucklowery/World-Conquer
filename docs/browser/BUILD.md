# Build, Run and Verify

Commands in the first two sections are supported upstream or by the independent smoke-test scaffold. The real-engine WebAssembly build remains future work.

## Native engine baseline (Linux/WSL2)

Requires CMake 3.25+, Ninja, C++ compiler, SDL2 and OpenAL.

~~~bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build libsdl2-dev libopenal-dev git

cmake -S . -B build/native -G Ninja -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF -DNETWORKING=OFF -DSDL2=ON -DOPENAL=ON
cmake --build build/native --target VanillaTD
~~~

Use compatible legally acquired game data as directed by upstream README; do not commit game files.

## Independent SDL2 WebAssembly smoke test

Install and activate Emscripten SDK: https://emscripten.org/docs/getting_started/downloads.html

~~~bash
em++ --version
bash browser/smoke/build.sh
python3 -m http.server 8080 --directory browser/smoke/dist
~~~

Open http://localhost:8080/index.html. Expected output:

~~~text
browser/smoke/dist/index.html
browser/smoke/dist/index.js
browser/smoke/dist/index.wasm
~~~

Acceptance: rectangle animates; mouse click changes color; keyboard logging visible in developer console; no failed JS/WASM requests. This is NOT the actual VanillaTD engine.

## Proposed real engine WASM build (DOES NOT WORK YET)

After guarded platform/build changes are implemented:

~~~bash
emcmake cmake -S . -B build/web -G Ninja -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF -DNETWORKING=OFF -DOPENAL=OFF -DSDL2=ON
cmake --build build/web --target VanillaTD
~~~

Emscripten SDL2 linking should use its port instead of native SDL2 lookup. The code also needs native POSIX adaptations and a browser-compatible loop.

## Verify and record

Every build/run result must capture commit SHA, OS, compiler version, exact command, browser and observed result. Private user game assets never belong in CI or public artifacts.

Useful references:
- https://emscripten.org/docs/compiling/Building-Projects.html
- https://emscripten.org/docs/api_reference/emscripten.h.html
- https://github.com/TheAssemblyArmada/Vanilla-Conquer
