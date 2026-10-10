#include "ndt7/core/Base64.h"

namespace ndt7 {

std::string base64Encode(const uint8_t* data, size_t length) {
    static const char kAlphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    out.reserve(((length + 2) / 3) * 4);
    size_t i = 0;
    for (; i + 2 < length; i += 3) {
        const uint32_t n = (uint32_t{data[i]} << 16) | (uint32_t{data[i + 1]} << 8) | uint32_t{data[i + 2]};
        out += kAlphabet[(n >> 18) & 63];
        out += kAlphabet[(n >> 12) & 63];
        out += kAlphabet[(n >> 6) & 63];
        out += kAlphabet[n & 63];
    }
    const size_t rest = length - i;
    if (rest == 1) {
        const uint32_t n = uint32_t{data[i]} << 16;
        out += kAlphabet[(n >> 18) & 63];
        out += kAlphabet[(n >> 12) & 63];
        out += "==";
    } else if (rest == 2) {
        const uint32_t n = (uint32_t{data[i]} << 16) | (uint32_t{data[i + 1]} << 8);
        out += kAlphabet[(n >> 18) & 63];
        out += kAlphabet[(n >> 12) & 63];
        out += kAlphabet[(n >> 6) & 63];
        out += '=';
    }
    return out;
}

}  // namespace ndt7
