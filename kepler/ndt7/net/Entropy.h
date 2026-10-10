#pragma once

#include <cstdint>

namespace ndt7 {

// Seed from /dev/urandom; falls back to clock and address bits if it is unreadable.
uint64_t entropySeed();

}  // namespace ndt7
