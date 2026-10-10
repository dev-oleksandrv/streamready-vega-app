#include "ndt7/net/Subtest.h"

#include "ndt7/core/Xorshift.h"
#include "ndt7/net/DownloadRun.h"
#include "ndt7/net/Entropy.h"
#include "ndt7/net/Socket.h"
#include "ndt7/net/WsSession.h"

namespace ndt7 {

std::optional<Direction> parseDirection(const std::string& name) {
    if (name == "download") {
        return Direction::Download;
    }
    if (name == "upload") {
        return Direction::Upload;
    }
    return std::nullopt;
}

Outcome runOnSocket(Direction direction, int fd, const WsUrl& url, CancelToken& token, RunSink& sink,
                    const RunLimits& limits) {
    if (!prepareSocket(fd, limits.sliceMs)) {
        return {ErrorCode::ConnectFailed, {}};
    }
    Xorshift rng(entropySeed());
    WsSession session(fd, token, limits, rng);
    const ErrorCode error = session.handshake(url);
    if (error != ErrorCode::None) {
        return {error, {}};
    }
    if (direction == Direction::Download) {
        return runDownload(session, sink, limits, token);
    }
    return {ErrorCode::Protocol, {}};  // upload is wired in Task 7
}

void runSubtest(Direction direction, const std::string& url, CancelToken& token, RunSink& sink,
                const RunLimits& limits) {
    Outcome outcome{ErrorCode::Protocol, {}};
    try {
        const auto parsed = parseWsUrl(url);
        if (parsed) {
            const int fd = connectTcp(*parsed, limits.connectBudgetMs, token);
            outcome = fd < 0 ? Outcome{ErrorCode::ConnectFailed, {}}
                             : runOnSocket(direction, fd, *parsed, token, sink, limits);
        }
    } catch (...) {
        outcome = {ErrorCode::Protocol, {}};
    }
    token.closeSocket();
    if (token.cancelled() && outcome.error != ErrorCode::None) {
        outcome.error = ErrorCode::Aborted;
    }
    sink.onDone(std::move(outcome.final), outcome.error);
}

}  // namespace ndt7
