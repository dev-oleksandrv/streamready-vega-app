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

set(HEADERS
  kepler/turbo-modules/generated/Ndt7NativeSpec.h
  kepler/turbo-modules/Ndt7Native.h
)
set(SOURCES
  kepler/turbo-modules/generated/Ndt7NativeSpec.cpp
  kepler/turbo-modules/Ndt7Native.cpp
  kepler/AutoLinkInit.cpp
)

find_package(turbomoduleAPI CONFIG REQUIRED)

kepler_add_turbo_module_library(StreamReadyNdt7 SHARED ${HEADERS} ${SOURCES})
target_include_directories(StreamReadyNdt7 PRIVATE kepler)

install(TARGETS StreamReadyNdt7)
