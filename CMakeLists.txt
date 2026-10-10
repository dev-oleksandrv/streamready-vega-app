cmake_minimum_required(VERSION 3.19)

project(StreamReadyNdt7
        VERSION 1.0
        LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Fail at link time on unresolved symbols, e.g. a .cpp missing from SOURCES.
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_link_options("LINKER:--no-undefined" "LINKER:-z,defs")
endif()

set(NDT7_SOURCES
  kepler/ndt7/core/Base64.cpp
  kepler/ndt7/core/FrameDecoder.cpp
  kepler/ndt7/core/FrameEncoder.cpp
  kepler/ndt7/core/Handshake.cpp
  kepler/ndt7/core/Sha1.cpp
  kepler/ndt7/core/Throttle.cpp
  kepler/ndt7/core/UploadScaling.cpp
  kepler/ndt7/core/WsUrl.cpp
  kepler/ndt7/core/Xorshift.cpp
  kepler/ndt7/net/CancelToken.cpp
  kepler/ndt7/net/DownloadRun.cpp
  kepler/ndt7/net/Entropy.cpp
  kepler/ndt7/net/Socket.cpp
  kepler/ndt7/net/Subtest.cpp
  kepler/ndt7/net/UploadRun.cpp
  kepler/ndt7/net/WsSession.cpp
)
set(HEADERS
  kepler/turbo-modules/generated/Ndt7NativeSpec.h
  kepler/turbo-modules/Ndt7Native.h
)
set(SOURCES
  ${NDT7_SOURCES}
  kepler/turbo-modules/generated/Ndt7NativeSpec.cpp
  kepler/turbo-modules/Ndt7Native.cpp
  kepler/AutoLinkInit.cpp
)

find_package(turbomoduleAPI CONFIG REQUIRED)

kepler_add_turbo_module_library(StreamReadyNdt7 SHARED ${HEADERS} ${SOURCES})
target_include_directories(StreamReadyNdt7 PRIVATE kepler)

install(TARGETS StreamReadyNdt7)
