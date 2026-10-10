#include <vector>

#include "harness.h"
#include "ndt7/core/Constants.h"
#include "ndt7/core/Throttle.h"
#include "ndt7/core/UploadScaling.h"
#include "ndt7/core/Xorshift.h"

using namespace ndt7;

// ndt7-client-go upload.go: double while size <= total / 16, up to 1 MiB.
TEST(scaling_follows_the_go_reference) {
    UploadScaling s;
    CHECK_EQ(s.size(), size_t{8192});
    for (int i = 0; i < 15; ++i) {
        s.onSent();
    }
    CHECK_EQ(s.size(), size_t{8192});  // 120 KiB sent
    s.onSent();
    CHECK_EQ(s.size(), size_t{16384});  // 128 KiB sent
    for (int i = 0; i < 7; ++i) {
        s.onSent();
    }
    CHECK_EQ(s.size(), size_t{16384});  // 240 KiB sent
    s.onSent();
    CHECK_EQ(s.size(), size_t{32768});  // 256 KiB sent
}

TEST(scaling_caps_at_one_mebibyte) {
    UploadScaling s;
    for (int i = 0; i < 10000; ++i) {
        CHECK(s.size() <= kMaxScaledMessageBytes);
        s.onSent();
    }
    CHECK_EQ(s.size(), kMaxScaledMessageBytes);
}

TEST(throttle_gates_by_interval) {
    Throttle t(1000, 250);
    CHECK(!t.ready(1100));
    CHECK(t.ready(1250));
    CHECK(!t.ready(1300));
    CHECK(t.ready(1500));
}

TEST(xorshift_is_deterministic_and_fills_every_byte) {
    Xorshift a(42);
    Xorshift b(42);
    for (int i = 0; i < 100; ++i) {
        CHECK_EQ(a.next(), b.next());
    }
    std::vector<uint8_t> bytes(1001, 0);
    Xorshift c(7);
    c.fill(bytes.data(), bytes.size());
    int zeros = 0;
    for (uint8_t byte : bytes) {
        zeros += byte == 0 ? 1 : 0;
    }
    CHECK(zeros < 30);  // ~4 expected for random bytes
}
