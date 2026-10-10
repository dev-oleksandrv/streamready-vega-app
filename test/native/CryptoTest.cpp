#include <string>

#include "harness.h"
#include "ndt7/core/Base64.h"
#include "ndt7/core/Sha1.h"

namespace {

std::string hex(const ndt7::Sha1Digest& digest) {
    static const char kDigits[] = "0123456789abcdef";
    std::string out;
    for (uint8_t byte : digest) {
        out += kDigits[byte >> 4];
        out += kDigits[byte & 0x0F];
    }
    return out;
}

std::string b64(const std::string& text) {
    return ndt7::base64Encode(reinterpret_cast<const uint8_t*>(text.data()), text.size());
}

}  // namespace

// RFC 3174 §7.3 test vectors plus the empty string.
TEST(sha1_empty) { CHECK_EQ(hex(ndt7::sha1("")), "da39a3ee5e6b4b0d3255bfef95601890afd80709"); }
TEST(sha1_abc) { CHECK_EQ(hex(ndt7::sha1("abc")), "a9993e364706816aba3e25717850c26c9cd0d89d"); }
TEST(sha1_two_blocks) {
    CHECK_EQ(hex(ndt7::sha1("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")),
             "84983e441c3bd26ebaae4aa1f95129e5e54670f1");
}
TEST(sha1_million_a) {
    CHECK_EQ(hex(ndt7::sha1(std::string(1000000, 'a'))), "34aa973cd4c4daa4f61eeb2bdbad27316534016f");
}

// RFC 4648 §10.
TEST(base64_vectors) {
    CHECK_EQ(b64(""), "");
    CHECK_EQ(b64("f"), "Zg==");
    CHECK_EQ(b64("fo"), "Zm8=");
    CHECK_EQ(b64("foo"), "Zm9v");
    CHECK_EQ(b64("foob"), "Zm9vYg==");
    CHECK_EQ(b64("fooba"), "Zm9vYmE=");
    CHECK_EQ(b64("foobar"), "Zm9vYmFy");
}
