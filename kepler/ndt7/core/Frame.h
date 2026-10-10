#pragma once

#include <cstddef>
#include <cstdint>

namespace ndt7 {

namespace opcode {
constexpr uint8_t kContinuation = 0x0;
constexpr uint8_t kText = 0x1;
constexpr uint8_t kBinary = 0x2;
constexpr uint8_t kClose = 0x8;
constexpr uint8_t kPing = 0x9;
constexpr uint8_t kPong = 0xA;
}  // namespace opcode

// 2 bytes + 8-byte extended length + 4-byte mask key.
constexpr size_t kMaxFrameHeaderBytes = 14;
constexpr size_t kMaxControlPayloadBytes = 125;

}  // namespace ndt7
