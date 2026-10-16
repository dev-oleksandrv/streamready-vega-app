#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "ndt7/core/Errors.h"
#include "ndt7/net/TcpRtt.h"

namespace ndt7 {

struct Progress {
    uint64_t bytes = 0;                     // download: payload received; upload: payload sent
    int64_t elapsedMs = 0;                  // since the handshake completed
    std::vector<std::string> measurements;  // server texts since the previous report
    std::optional<ClientRtt> client;        // download only: the TV's own RTT at report time
};

class RunSink {
public:
    virtual ~RunSink() = default;
    virtual void onProgress(Progress progress) = 0;
    virtual void onDone(Progress final, ErrorCode error) = 0;
};

struct Outcome {
    ErrorCode error = ErrorCode::None;
    Progress final;
};

}  // namespace ndt7
