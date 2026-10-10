#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <string>

#include "harness.h"
#include "ndt7/core/WsUrl.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/Socket.h"
#include "ndt7/net/Subtest.h"
#include "support/FakeServer.h"

using namespace ndt7;

namespace {

// Listening loopback socket on an ephemeral port.
int listenLoopback(int& port) {
    const int fd = ::socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = 0;
    ::bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr));
    ::listen(fd, 1);
    socklen_t len = sizeof(addr);
    ::getsockname(fd, reinterpret_cast<sockaddr*>(&addr), &len);
    port = ntohs(addr.sin_port);
    return fd;
}

struct DoneSink : RunSink {
    int dones = 0;
    ErrorCode error = ErrorCode::None;
    void onProgress(Progress) override {}
    void onDone(Progress, ErrorCode e) override {
        ++dones;
        error = e;
    }
};

}  // namespace

TEST(connect_tcp_reaches_loopback_listener) {
    int port = 0;
    const int listener = listenLoopback(port);
    CancelToken token;
    const auto url = parseWsUrl("ws://127.0.0.1:" + std::to_string(port) + "/x");
    const int fd = connectTcp(*url, 1000, token);
    CHECK(fd >= 0);
    token.closeSocket();
    ::close(listener);
}

TEST(connect_tcp_refused_returns_minus_one) {
    int port = 0;
    const int listener = listenLoopback(port);
    ::close(listener);  // nothing listens on this port any more
    CancelToken token;
    const auto url = parseWsUrl("ws://127.0.0.1:" + std::to_string(port) + "/x");
    CHECK_EQ(connectTcp(*url, 1000, token), -1);
}

TEST(run_subtest_reports_exactly_one_done) {
    CancelToken token;
    DoneSink sink;
    runSubtest(Direction::Download, "wss://ndt-1.example/x?access_token=REDACTED", token, sink, testLimits());
    CHECK_EQ(sink.dones, 1);
    CHECK(sink.error == ErrorCode::Protocol);

    int port = 0;
    const int listener = listenLoopback(port);
    ::close(listener);
    CancelToken token2;
    DoneSink sink2;
    runSubtest(Direction::Download, "ws://127.0.0.1:" + std::to_string(port) + "/x", token2, sink2, testLimits());
    CHECK_EQ(sink2.dones, 1);
    CHECK(sink2.error == ErrorCode::ConnectFailed);
}

TEST(parse_direction) {
    CHECK(parseDirection("download") == Direction::Download);
    CHECK(parseDirection("upload") == Direction::Upload);
    CHECK(!parseDirection("sideways").has_value());
}

// A blackholed first address (often IPv6) must not use the whole budget.
TEST(connect_attempt_budget_splits_remaining_time) {
    CHECK_EQ(connectAttemptBudgetMs(5000, 2), int64_t{2500});
    CHECK_EQ(connectAttemptBudgetMs(5000, 1), int64_t{5000});
    CHECK_EQ(connectAttemptBudgetMs(5000, 10), int64_t{1500});  // floor
    CHECK_EQ(connectAttemptBudgetMs(1000, 4), int64_t{1000});   // never above what is left
}

TEST(connect_tcp_returns_at_once_when_cancelled) {
    int port = 0;
    const int listener = listenLoopback(port);
    CancelToken token;
    token.cancel();
    const auto url = parseWsUrl("ws://127.0.0.1:" + std::to_string(port) + "/x");
    CHECK_EQ(connectTcp(*url, 1000, token), -1);
    ::close(listener);
}
