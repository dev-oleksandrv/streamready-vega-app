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

// Code for the client's close reply (RFC 6455 §7.4): the server's code when it
// is valid to send, 1000 when it sent none, 1002 when its code is invalid.
uint16_t closeEchoCode(bool hasCode, uint16_t code);

}  // namespace ndt7
