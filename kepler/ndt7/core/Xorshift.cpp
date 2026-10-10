#include "ndt7/core/Xorshift.h"

#include <cstring>

namespace ndt7 {
namespace {

uint64_t splitmix64(uint64_t& state) {
    uint64_t z = (state += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

}  // namespace

Xorshift::Xorshift(uint64_t seed) {
    s0_ = splitmix64(seed);
    s1_ = splitmix64(seed);
}

uint64_t Xorshift::next() {
    uint64_t x = s0_;
    const uint64_t y = s1_;
    s0_ = y;
    x ^= x << 23;
    s1_ = x ^ y ^ (x >> 17) ^ (y >> 26);
    return s1_ + y;
}

void Xorshift::fill(uint8_t* out, size_t length) {
    size_t i = 0;
    for (; i + 8 <= length; i += 8) {
        const uint64_t value = next();
        std::memcpy(out + i, &value, 8);
    }
    if (i < length) {
        const uint64_t value = next();
        std::memcpy(out + i, &value, length - i);
    }
}

}  // namespace ndt7
