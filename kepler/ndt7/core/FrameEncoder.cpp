#include "ndt7/core/FrameEncoder.h"

#include <algorithm>
#include <cstring>

namespace ndt7 {

size_t encodeFrameHeader(uint8_t opcode, uint64_t length, const uint8_t key[4], uint8_t out[kMaxFrameHeaderBytes]) {
    out[0] = static_cast<uint8_t>(0x80 | opcode);
    size_t n;
    if (length <= 125) {
        out[1] = static_cast<uint8_t>(0x80 | length);
        n = 2;
    } else if (length <= 0xFFFF) {
        out[1] = 0x80 | 126;
        out[2] = static_cast<uint8_t>(length >> 8);
        out[3] = static_cast<uint8_t>(length);
        n = 4;
    } else {
        out[1] = 0x80 | 127;
        for (int i = 0; i < 8; ++i) {
            out[2 + i] = static_cast<uint8_t>(length >> (56 - 8 * i));
        }
        n = 10;
    }
    std::memcpy(out + n, key, 4);
    return n + 4;
}

std::vector<uint8_t> encodeControlFrame(uint8_t opcode, const uint8_t* payload, size_t length, const uint8_t key[4]) {
    const size_t size = std::min(length, kMaxControlPayloadBytes);
    std::vector<uint8_t> frame(kMaxFrameHeaderBytes + size);
    const size_t header = encodeFrameHeader(opcode, size, key, frame.data());
    for (size_t i = 0; i < size; ++i) {
        frame[header + i] = payload[i] ^ key[i % 4];
    }
    frame.resize(header + size);
    return frame;
}

}  // namespace ndt7
