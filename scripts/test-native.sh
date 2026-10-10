#!/usr/bin/env bash
# Builds and runs the host C++ tests of the native ndt7 engine. Needs only a
# C++17 compiler (Apple clang locally, g++ on CI); no Vega SDK.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=.tmp/native-tests
mkdir -p "$OUT"

shopt -s nullglob
SOURCES=(kepler/ndt7/core/*.cpp kepler/ndt7/net/*.cpp test/native/*.cpp)

"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -g -O1 \
  -fsanitize=address,undefined -fno-omit-frame-pointer -pthread \
  -I kepler -I test/native \
  "${SOURCES[@]}" \
  -o "$OUT/ndt7-tests"

"$OUT/ndt7-tests"
