#pragma once

#include <chrono>
#include <cstdint>

namespace ndt7 {

inline int64_t monotonicMs() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
}

}  // namespace ndt7
