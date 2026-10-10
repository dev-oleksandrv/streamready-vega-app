#include <string>
#include <vector>

#include "harness.h"
#include "ndt7/core/Constants.h"
#include "ndt7/core/Frame.h"
#include "ndt7/core/FrameDecoder.h"
#include "ndt7/core/FrameEncoder.h"
#include "support/Frames.h"

using namespace ndt7;

namespace {

struct Recorder : FrameHandler {
    size_t binary = 0;
    std::vector<std::string> texts;
    std::vector<std::string> pings;
    int closes = 0;
    bool hasCode = false;
    uint16_t code = 0;

    void onBinaryBytes(size_t count) override { binary += count; }
    void onText(std::string text) override { texts.push_back(std::move(text)); }
    void onPing(const uint8_t* payload, size_t length) override {
        pings.emplace_back(reinterpret_cast<const char*>(payload), length);
    }
    void onClose(bool withCode, uint16_t closeCode) override {
        ++closes;
        hasCode = withCode;
        code = closeCode;
    }
};

bool feed(FrameDecoder& decoder, const std::string& bytes) {
    return decoder.feed(reinterpret_cast<const uint8_t*>(bytes.data()), bytes.size());
}

bool feedByteByByte(FrameDecoder& decoder, const std::string& bytes) {
    for (char c : bytes) {
        const uint8_t byte = static_cast<uint8_t>(c);
        if (!decoder.feed(&byte, 1)) {
            return false;
        }
    }
    return true;
}

const uint8_t kKey[4] = {1, 2, 3, 4};

}  // namespace

TEST(encoder_short_length) {
    uint8_t out[kMaxFrameHeaderBytes];
    const size_t n = encodeFrameHeader(opcode::kBinary, 125, kKey, out);
    CHECK_EQ(n, size_t{6});
    CHECK_EQ(out[0], 0x82);
    CHECK_EQ(out[1], 0x80 | 125);
    CHECK(out[2] == 1 && out[3] == 2 && out[4] == 3 && out[5] == 4);
}

TEST(encoder_16_bit_length) {
    uint8_t out[kMaxFrameHeaderBytes];
    CHECK_EQ(encodeFrameHeader(opcode::kBinary, 126, kKey, out), size_t{8});
    CHECK_EQ(out[1], 0x80 | 126);
    CHECK(out[2] == 0x00 && out[3] == 126);
    CHECK_EQ(encodeFrameHeader(opcode::kBinary, 65535, kKey, out), size_t{8});
    CHECK(out[2] == 0xFF && out[3] == 0xFF);
    CHECK(out[4] == 1 && out[7] == 4);
}

TEST(encoder_64_bit_length) {
    uint8_t out[kMaxFrameHeaderBytes];
    CHECK_EQ(encodeFrameHeader(opcode::kBinary, 65536, kKey, out), size_t{14});
    CHECK_EQ(out[1], 0x80 | 127);
    CHECK(out[2] == 0 && out[3] == 0 && out[4] == 0 && out[5] == 0);
    CHECK(out[6] == 0 && out[7] == 1 && out[8] == 0 && out[9] == 0);
    CHECK(out[10] == 1 && out[13] == 4);
}

TEST(encoder_control_frame_is_masked) {
    const uint8_t payload[2] = {'h', 'i'};
    const auto frame = encodeControlFrame(opcode::kPong, payload, 2, kKey);
    CHECK_EQ(frame.size(), size_t{8});
    CHECK_EQ(frame[0], 0x8A);
    CHECK_EQ(frame[1], 0x80 | 2);
    CHECK_EQ(frame[6], static_cast<uint8_t>('h' ^ 1));
    CHECK_EQ(frame[7], static_cast<uint8_t>('i' ^ 2));
}

TEST(decoder_counts_binary_across_arbitrary_reads) {
    Recorder r;
    FrameDecoder d(r);
    CHECK(feedByteByByte(d, serverFrame(opcode::kBinary, std::string(1000, 'x'))));
    CHECK(feed(d, serverFrame(opcode::kBinary, std::string(300, 'x'))));
    CHECK(feed(d, serverFrame(opcode::kBinary, std::string(70000, 'x'))));
    CHECK_EQ(r.binary, size_t{71300});
}

TEST(decoder_delivers_text_and_joins_continuations) {
    Recorder r;
    FrameDecoder d(r);
    CHECK(feed(d, serverFrame(opcode::kText, "{\"a\":1}")));
    CHECK(feed(d, serverFrame(opcode::kText, "ab", false) + serverFrame(opcode::kPing, "p") +
                      serverFrame(opcode::kContinuation, "cd")));
    CHECK_EQ(r.texts.size(), size_t{2});
    CHECK_EQ(r.texts[0], "{\"a\":1}");
    CHECK_EQ(r.texts[1], "abcd");
    CHECK_EQ(r.pings.size(), size_t{1});
    CHECK_EQ(r.pings[0], "p");
}

TEST(decoder_close_with_and_without_code) {
    Recorder r;
    FrameDecoder d(r);
    CHECK(feed(d, serverFrame(opcode::kClose, closePayload(1000)) + "trailing junk"));
    CHECK(d.closeReceived());
    CHECK_EQ(r.closes, 1);
    CHECK(r.hasCode);
    CHECK_EQ(r.code, 1000);

    Recorder r2;
    FrameDecoder d2(r2);
    CHECK(feed(d2, serverFrame(opcode::kClose, "")));
    CHECK(!r2.hasCode);
}

TEST(decoder_rejects_protocol_violations) {
    const std::string cases[] = {
        std::string{static_cast<char>(0x82), static_cast<char>(0x81), 1, 2, 3, 4, 'x'},  // masked server frame
        frameHeaderOnly(0xC2, 1) + "x",                                                 // RSV1 set
        frameHeaderOnly(0x83, 1) + "x",                                                 // unknown opcode 3
        serverFrame(opcode::kContinuation, "x"),                                        // continuation, no start
        serverFrame(opcode::kText, "a", false) + serverFrame(opcode::kText, "b"),       // new message mid-message
        serverFrame(opcode::kPing, "p", false),                                         // fragmented control
        frameHeaderOnly(0x89, 126) + std::string(126, 'p'),                             // control > 125
        serverFrame(opcode::kClose, "x"),                                               // 1-byte close payload
        frameHeaderOnly(0x82, kMaxMessageBytes + 1),                                    // message > 1<<24
    };
    for (const auto& bytes : cases) {
        Recorder r;
        FrameDecoder d(r);
        CHECK(!feed(d, bytes));
        CHECK(!feed(d, serverFrame(opcode::kBinary, "x")));  // failure is sticky
    }
}

TEST(decoder_limits_fragmented_message_total) {
    Recorder r;
    FrameDecoder d(r);
    CHECK(feed(d, frameHeaderOnly(0x02, kMaxMessageBytes)));  // binary, FIN=0, 16 MiB
    const std::string chunk(64 * 1024, 'x');
    for (uint64_t sent = 0; sent < kMaxMessageBytes; sent += chunk.size()) {
        CHECK(feed(d, chunk));
    }
    CHECK(!feed(d, serverFrame(opcode::kContinuation, "x")));
}

TEST(decoder_drains_oversized_text) {
    Recorder r;
    FrameDecoder d(r);
    CHECK(feed(d, serverFrame(opcode::kText, std::string(kMaxTextBytes + 1, 'x'))));
    CHECK(feed(d, serverFrame(opcode::kText, "ok")));
    CHECK_EQ(r.texts.size(), size_t{1});
    CHECK_EQ(r.texts[0], "ok");
}

// RFC 6455 §7.4: echo a valid code, answer an invalid one with 1002, never send 1005/1006.
TEST(close_echo_code) {
    CHECK_EQ(closeEchoCode(false, 0), 1000);
    CHECK_EQ(closeEchoCode(true, 1000), 1000);
    CHECK_EQ(closeEchoCode(true, 1001), 1001);
    CHECK_EQ(closeEchoCode(true, 1011), 1011);
    CHECK_EQ(closeEchoCode(true, 4000), 4000);
    CHECK_EQ(closeEchoCode(true, 999), 1002);
    CHECK_EQ(closeEchoCode(true, 1004), 1002);
    CHECK_EQ(closeEchoCode(true, 1005), 1002);
    CHECK_EQ(closeEchoCode(true, 1006), 1002);
    CHECK_EQ(closeEchoCode(true, 1015), 1002);
    CHECK_EQ(closeEchoCode(true, 5000), 1002);
}
