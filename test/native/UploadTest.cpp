#include <sys/socket.h>
#include <unistd.h>

#include <chrono>
#include <thread>
#include <vector>

#include "harness.h"
#include "ndt7/core/Frame.h"
#include "ndt7/core/UploadScaling.h"
#include "ndt7/core/WsUrl.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/Subtest.h"
#include "support/FakeServer.h"
#include "support/Frames.h"

using namespace ndt7;

namespace {

const WsUrl kUrl = *parseWsUrl("ws://ndt-1.example/ndt/v7/upload?access_token=REDACTED");

Outcome runClient(SocketPair& pair, CancelToken& token, RecordingSink& sink, const RunLimits& limits) {
    token.attach(pair.client);
    Outcome outcome = runOnSocket(Direction::Upload, pair.client, kUrl, token, sink, limits);
    token.closeSocket();
    return outcome;
}

}  // namespace

TEST(upload_sends_masked_scaling_frames_and_ends_with_close) {
    SocketPair pair;
    std::vector<uint64_t> sizes;
    bool allMasked = true;
    bool closed = false;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        uint64_t received = 0;
        while (true) {
            const ClientFrame frame = readClientFrame(pair.server);
            if (!frame.ok) {
                break;
            }
            allMasked = allMasked && frame.masked;
            if (frame.opcode == opcode::kClose) {
                closed = true;
                writeAll(pair.server, serverFrame(opcode::kText, "{\"TCPInfo\":{\"BytesReceived\":" +
                                                                     std::to_string(received) + "}}") +
                                          serverFrame(opcode::kClose, closePayload(1000)));
                break;
            }
            sizes.push_back(frame.length);
            received += frame.length;
            if (sizes.size() % 8 == 0) {
                writeAll(pair.server, serverFrame(opcode::kText, "{\"TCPInfo\":{}}"));
            }
        }
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();

    CHECK(outcome.error == ErrorCode::None);
    CHECK(closed);
    CHECK(allMasked);
    CHECK(!sizes.empty());
    UploadScaling expected;
    uint64_t total = 0;
    for (uint64_t size : sizes) {
        CHECK_EQ(size, uint64_t{expected.size()});
        expected.onSent();
        total += size;
    }
    CHECK_EQ(outcome.final.bytes, total);
    CHECK(!outcome.final.measurements.empty());  // the final measurement arrives during the close drain
}

TEST(upload_answers_ping_between_frames) {
    SocketPair pair;
    ClientFrame pong;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)) + serverFrame(opcode::kPing, "xy"));
        while (true) {
            const ClientFrame frame = readClientFrame(pair.server);
            if (!frame.ok) {
                break;
            }
            if (frame.opcode == opcode::kPong) {
                pong = frame;
                writeAll(pair.server, serverFrame(opcode::kClose, closePayload(1000)));
            }
            if (frame.opcode == opcode::kClose) {
                break;
            }
        }
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::None);
    CHECK(pong.ok && pong.masked);
    CHECK_EQ(pong.payload, "xy");
}

TEST(upload_binary_from_server_is_protocol) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)) + serverFrame(opcode::kBinary, "nope"));
        while (readClientFrame(pair.server).ok) {
        }
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    ::shutdown(pair.server, SHUT_RDWR);
    server.join();
    CHECK(outcome.error == ErrorCode::Protocol);
}

TEST(upload_peer_reset_is_network_lost) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        for (int i = 0; i < 3; ++i) {
            readClientFrame(pair.server);
        }
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::NetworkLost);
}

TEST(upload_cancel_stops_sending) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        while (readClientFrame(pair.server).ok) {
        }
    });
    CancelToken token;
    RecordingSink sink;
    RunLimits limits = testLimits();
    limits.uploadDurationMs = 5000;
    std::thread canceller([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        token.cancel();
    });
    const Outcome outcome = runClient(pair, token, sink, limits);
    canceller.join();
    ::shutdown(pair.server, SHUT_RDWR);
    server.join();
    CHECK(outcome.error == ErrorCode::Aborted);
}

TEST(upload_server_closes_first) {
    SocketPair pair;
    ClientFrame reply;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        ClientFrame frame = readClientFrame(pair.server);
        writeAll(pair.server, serverFrame(opcode::kText, "{\"TCPInfo\":{\"BytesReceived\":8192}}") +
                                  serverFrame(opcode::kClose, closePayload(1000)));
        while (frame.ok && frame.opcode != opcode::kClose) {
            frame = readClientFrame(pair.server);
        }
        reply = frame;
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    RunLimits limits = testLimits();
    limits.uploadDurationMs = 5000;  // only the server's close can end it early
    const auto started = std::chrono::steady_clock::now();
    const Outcome outcome = runClient(pair, token, sink, limits);
    const auto waited = std::chrono::steady_clock::now() - started;
    server.join();
    CHECK(outcome.error == ErrorCode::None);
    CHECK(waited < std::chrono::milliseconds(3000));
    CHECK(reply.ok && reply.opcode == opcode::kClose);
    CHECK_EQ(reply.payload, closePayload(1000));
    auto texts = sink.allMeasurements();
    texts.insert(texts.end(), outcome.final.measurements.begin(), outcome.final.measurements.end());
    CHECK_EQ(texts.size(), size_t{1});
}
