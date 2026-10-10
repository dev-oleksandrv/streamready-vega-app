#pragma once

#include <cstddef>
#include <cstdint>

namespace ndt7 {

// xorshift128+: fast enough to fill 1 MiB on armv7 without a visible stall.
// Upload noise and mask keys only need to be unpredictable to the path, not secret.
class Xorshift {
public:
    explicit Xorshift(uint64_t seed);
    uint64_t next();
    void fill(uint8_t* out, size_t length);

private:
    uint64_t s0_;
    uint64_t s1_;
};

}  // namespace ndt7
