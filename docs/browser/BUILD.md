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

## Experimental VanillaTD Emscripten build (P1 compile spike)

The browser build is **not yet a playable game**. It is an opt-in compile/link target intended to reveal platform incompatibilities without disrupting native builds. Requires Emscripten SDK 3.1.68 and Ninja.

~~~bash
# From the project root, after sourcing emsdk_env.sh:
emcmake cmake -S . -B build/browser-engine -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DBUILD_VANILLATD=ON -DBUILD_VANILLARA=OFF \
  -DBUILD_REMASTERTD=OFF -DBUILD_REMASTERRA=OFF \
  -DNETWORKING=OFF -DOPENAL=OFF -DSDL2=ON \
  -DBUILD_TOOLS=OFF -DBUILD_TESTS=OFF
cmake --build build/browser-engine --target VanillaTD --parallel 2
~~~

Intended output (only after all compilation/link blockers are resolved): `build/browser-engine/vanillatd.html`, `vanillatd.js`, `vanillatd.wasm`. A linked game is not proof of a browser-friendly event loop or playable mission.

[Engine WASM compile CI](../../.github/workflows/browser-engine.yml) runs the same command and uploads the browser bundle **only when build succeeds**. CI build errors are evidence for targeted platform fixes, not a reason to weaken native targets or upload game data.

## Verify and record

Every build/run result must capture commit SHA, OS, compiler version, exact command, browser and observed result. Private user game assets never belong in CI or public artifacts.

Useful references:
- https://emscripten.org/docs/compiling/Building-Projects.html
- https://emscripten.org/docs/api_reference/emscripten.h.html
- https://github.com/TheAssemblyArmada/Vanilla-Conquer
