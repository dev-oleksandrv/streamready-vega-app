#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

#include "ndt7/core/Frame.h"

namespace ndt7 {

// Masked client frame header (RFC 6455 §5.2, §5.3), FIN set. Returns its length.
size_t encodeFrameHeader(uint8_t opcode, uint64_t length, const uint8_t key[4], uint8_t out[kMaxFrameHeaderBytes]);

// Complete masked control frame; the payload is truncated to 125 bytes.
std::vector<uint8_t> encodeControlFrame(uint8_t opcode, const uint8_t* payload, size_t length, const uint8_t key[4]);

}  // namespace ndt7
