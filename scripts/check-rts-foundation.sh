#!/usr/bin/env bash
# Fast, production-independent contract and integration gate for R00–R05/R18.
# RTS_SANITIZE=1 enables ASan+UBSan; real SDL/WASM browser acceptance is separate.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
test_dir=$(mktemp -d)
trap 'rm -r -- "$test_dir"' EXIT

flags=(-std=c++11 -Wall -Wextra -Werror -Ibrowser/engine)
if [[ "${RTS_SANITIZE:-0}" == "1" ]]; then
  flags+=(-O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined)
else
  flags+=(-O2)
fi

for suite in \
  test-simulation-contract \
  test-rts-world \
  test-rts-economy \
  test-rts-world-ports \
  test-production-orders \
  test-rts-weapons \
  test-map-pipeline \
  test-rts-live-match \
  test-rts-crowding \
  test-rts-foundation-stress; do
  echo "[foundation] $suite"
  "${CXX:-g++}" "${flags[@]}" "browser/engine/$suite.cpp" -o "$test_dir/$suite"
  "$test_dir/$suite"
done

for suite in \
  docs/rts-milestones/validate-roadmap.js \
  browser/engine/test-simulation-bridge.js \
  browser/engine/test-tactical-hud.js \
  browser/engine/test-rts-camera.js \
  browser/engine/validate-maps.js \
  browser/engine/test-mission-pack.js \
  browser/engine/test-r20-metrics.js \
  browser/engine/test-r20-soak-wait.js \
  tools/content/test-r18.js \
  tools/content/test-r05.js; do
  echo "[foundation] $suite"
  node "$suite"
done

node browser/engine/test-rts-world-bridge.js "$test_dir/test-rts-world"
node browser/engine/test-rts-economy-bridge.js "$test_dir/test-rts-economy" "$test_dir/test-rts-live-match"
node browser/engine/test-rts-live-bridge.js "$test_dir/test-rts-live-match"
echo 'PASS: complete native/JS foundation gate'
