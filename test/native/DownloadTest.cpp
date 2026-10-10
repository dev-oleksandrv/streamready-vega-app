#include <sys/socket.h>
#include <unistd.h>

#include <atomic>
#include <chrono>
#include <thread>

#include "harness.h"
#include "ndt7/core/Frame.h"
#include "ndt7/core/WsUrl.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/Subtest.h"
#include "support/FakeServer.h"
#include "support/Frames.h"

using namespace ndt7;

namespace {

const WsUrl kUrl = *parseWsUrl("ws://ndt-1.example/ndt/v7/download?access_token=REDACTED");

Outcome runClient(SocketPair& pair, CancelToken& token, RecordingSink& sink, const RunLimits& limits) {
    token.attach(pair.client);
    Outcome outcome = runOnSocket(Direction::Download, pair.client, kUrl, token, sink, limits);
    token.closeSocket();
    return outcome;
}

}  // namespace

TEST(download_counts_bytes_and_forwards_measurements) {
    SocketPair pair;
    ClientFrame close;
    std::thread server([&] {
        const std::string request = readRequest(pair.server);
        writeAll(pair.server, upgradeResponse(request) + serverFrame(opcode::kBinary, std::string(1000, 'x')) +
                                  serverFrame(opcode::kText, "{\"TCPInfo\":{\"MinRTT\":1000}}") +
                                  serverFrame(opcode::kBinary, std::string(2000, 'x')) +
                                  serverFrame(opcode::kClose, closePayload(1000)));
        close = readClientFrame(pair.server);
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();

    CHECK(outcome.error == ErrorCode::None);
    CHECK_EQ(outcome.final.bytes, uint64_t{3000});
    CHECK(!sink.progress.empty());
    CHECK_EQ(sink.progress.front().bytes, uint64_t{0});
    auto texts = sink.allMeasurements();
    texts.insert(texts.end(), outcome.final.measurements.begin(), outcome.final.measurements.end());
    CHECK_EQ(texts.size(), size_t{1});
    CHECK(close.ok && close.masked && close.opcode == opcode::kClose);
    CHECK_EQ(close.payload, closePayload(1000));
}

TEST(download_close_before_data) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)) + serverFrame(opcode::kClose, ""));
        readClientFrame(pair.server);
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::None);
    CHECK_EQ(outcome.final.bytes, uint64_t{0});
    CHECK(outcome.final.elapsedMs >= 0);
}

TEST(download_answers_ping_with_same_payload) {
    SocketPair pair;
    ClientFrame pong;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)) + serverFrame(opcode::kPing, "abc"));
        pong = readClientFrame(pair.server);
        writeAll(pair.server, serverFrame(opcode::kClose, closePayload(1000)));
        readClientFrame(pair.server);
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::None);
    CHECK(pong.ok && pong.masked && pong.opcode == opcode::kPong);
    CHECK_EQ(pong.payload, "abc");
}

TEST(download_eof_without_close_is_network_lost) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)) + serverFrame(opcode::kBinary, "0123456789"));
        ::shutdown(pair.server, SHUT_RDWR);
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::NetworkLost);
}

TEST(download_cancel_unblocks_read) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        char c;
        while (::recv(pair.server, &c, 1, 0) > 0) {
        }
    });
    CancelToken token;
    RecordingSink sink;
    RunLimits limits = testLimits();
    limits.sliceMs = 5000;  // only shutdown() can wake the read in time
    std::thread canceller([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        token.cancel();
    });
    const auto started = std::chrono::steady_clock::now();
    const Outcome outcome = runClient(pair, token, sink, limits);
    const auto waited = std::chrono::steady_clock::now() - started;
    canceller.join();
    server.join();
    CHECK(outcome.error == ErrorCode::Aborted);
    CHECK(waited < std::chrono::milliseconds(2000));
}

TEST(download_safety_timeout) {
    SocketPair pair;
    std::atomic<bool> stop{false};
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        while (!stop) {
            if (::send(pair.server, "\x82\x01x", 3, kSendFlags) <= 0) {
                break;
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    });
    CancelToken token;
    RecordingSink sink;
    RunLimits limits = testLimits();
    limits.downloadTimeoutMs = 200;
    const Outcome outcome = runClient(pair, token, sink, limits);
    stop = true;
    ::shutdown(pair.server, SHUT_RDWR);
    server.join();
    CHECK(outcome.error == ErrorCode::Timeout);
}

TEST(download_io_stall_is_network_lost) {
    SocketPair pair;
    std::thread server([&] {
        writeAll(pair.server, upgradeResponse(readRequest(pair.server)));
        char c;
        while (::recv(pair.server, &c, 1, 0) > 0) {
        }
    });
    CancelToken token;
    RecordingSink sink;
    RunLimits limits = testLimits();
    limits.ioTimeoutMs = 150;
    const Outcome outcome = runClient(pair, token, sink, limits);
    ::shutdown(pair.server, SHUT_RDWR);
    server.join();
    CHECK(outcome.error == ErrorCode::NetworkLost);
}

TEST(handshake_rejected_is_connect_failed) {
    SocketPair pair;
    std::thread server([&] {
        readRequest(pair.server);
        writeAll(pair.server, "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::ConnectFailed);
    CHECK(sink.progress.empty());
}

TEST(handshake_bad_accept_is_protocol) {
    SocketPair pair;
    std::thread server([&] {
        readRequest(pair.server);
        writeAll(pair.server,
                 "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                 "Sec-WebSocket-Accept: AAAA\r\nSec-WebSocket-Protocol: net.measurementlab.ndt.v7\r\n\r\n");
    });
    CancelToken token;
    RecordingSink sink;
    const Outcome outcome = runClient(pair, token, sink, testLimits());
    server.join();
    CHECK(outcome.error == ErrorCode::Protocol);
}
