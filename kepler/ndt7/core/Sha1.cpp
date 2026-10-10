#include "ndt7/core/Sha1.h"

#include <vector>

namespace ndt7 {
namespace {

uint32_t rotl(uint32_t value, int bits) { return (value << bits) | (value >> (32 - bits)); }

}  // namespace

Sha1Digest sha1(const uint8_t* data, size_t length) {
    uint32_t h[5] = {0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0};

    // Inputs are a few dozen bytes (key + GUID), so padding a copy is fine.
    std::vector<uint8_t> message(data, data + length);
    const uint64_t bitLength = static_cast<uint64_t>(length) * 8;
    message.push_back(0x80);
    while (message.size() % 64 != 56) {
        message.push_back(0);
    }
    for (int shift = 56; shift >= 0; shift -= 8) {
        message.push_back(static_cast<uint8_t>(bitLength >> shift));
    }

    for (size_t block = 0; block < message.size(); block += 64) {
        uint32_t w[80];
        for (int i = 0; i < 16; ++i) {
            const uint8_t* p = &message[block + 4 * i];
            w[i] = (uint32_t{p[0]} << 24) | (uint32_t{p[1]} << 16) | (uint32_t{p[2]} << 8) | uint32_t{p[3]};
        }
        for (int i = 16; i < 80; ++i) {
            w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        }
        uint32_t a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
        for (int i = 0; i < 80; ++i) {
            uint32_t f;
            uint32_t k;
            if (i < 20) {
                f = (b & c) | (~b & d);
                k = 0x5A827999;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            } else if (i < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8F1BBCDC;
            } else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            const uint32_t temp = rotl(a, 5) + f + e + k + w[i];
            e = d;
            d = c;
            c = rotl(b, 30);
            b = a;
            a = temp;
        }
        h[0] += a;
        h[1] += b;
        h[2] += c;
        h[3] += d;
        h[4] += e;
    }

    Sha1Digest digest{};
    for (int i = 0; i < 5; ++i) {
        digest[4 * i] = static_cast<uint8_t>(h[i] >> 24);
        digest[4 * i + 1] = static_cast<uint8_t>(h[i] >> 16);
        digest[4 * i + 2] = static_cast<uint8_t>(h[i] >> 8);
        digest[4 * i + 3] = static_cast<uint8_t>(h[i]);
    }
    return digest;
}

Sha1Digest sha1(const std::string& text) {
    return sha1(reinterpret_cast<const uint8_t*>(text.data()), text.size());
}

}  // namespace ndt7
