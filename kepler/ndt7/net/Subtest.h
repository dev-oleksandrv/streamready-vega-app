#pragma once

#include <optional>
#include <string>

#include "ndt7/core/WsUrl.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/RunLimits.h"
#include "ndt7/net/RunSink.h"

namespace ndt7 {

enum class Direction { Download, Upload };

std::optional<Direction> parseDirection(const std::string& name);

// Handshake plus the subtest loop on a connected socket already attached to
// `token`. Does not close the socket. Host tests call it with a socketpair.
Outcome runOnSocket(Direction direction, int fd, const WsUrl& url, CancelToken& token, RunSink& sink,
                    const RunLimits& limits);

// Parse, connect, run, close. Calls sink.onDone exactly once and never throws.
void runSubtest(Direction direction, const std::string& url, CancelToken& token, RunSink& sink,
                const RunLimits& limits);

}  // namespace ndt7
