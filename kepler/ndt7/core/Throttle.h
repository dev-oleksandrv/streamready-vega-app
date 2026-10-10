#pragma once

#include <cstdint>

namespace ndt7 {

class Throttle {
public:
    Throttle(int64_t startMs, int64_t intervalMs) : last_(startMs), interval_(intervalMs) {}
    bool ready(int64_t nowMs);

private:
    int64_t last_;
    int64_t interval_;
};

}  // namespace ndt7
