#pragma once

#include <cstdint>
#include <string>

// Unmasked server-to-client frames for tests.
inline std::string frameHeaderOnly(uint8_t firstByte, uint64_t length) {
    std::string out(1, static_cast<char>(firstByte));
    if (length <= 125) {
        out += static_cast<char>(length);
    } else if (length <= 0xFFFF) {
        out += static_cast<char>(126);
        out += static_cast<char>((length >> 8) & 0xFF);
        out += static_cast<char>(length & 0xFF);
    } else {
        out += static_cast<char>(127);
        for (int shift = 56; shift >= 0; shift -= 8) {
            out += static_cast<char>((length >> shift) & 0xFF);
        }
    }
    return out;
}

inline std::string serverFrame(uint8_t opcode, const std::string& payload, bool fin = true) {
    const uint8_t first = static_cast<uint8_t>((fin ? 0x80 : 0x00) | opcode);
    return frameHeaderOnly(first, payload.size()) + payload;
}

inline std::string closePayload(uint16_t code) {
    return std::string{static_cast<char>(code >> 8), static_cast<char>(code & 0xFF)};
}
