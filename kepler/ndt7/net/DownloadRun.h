#pragma once

#include "ndt7/net/CancelToken.h"
#include "ndt7/net/RunLimits.h"
#include "ndt7/net/RunSink.h"
#include "ndt7/net/WsSession.h"

namespace ndt7 {

// Counts binary bytes until the server's close frame; never keeps payloads.
Outcome runDownload(WsSession& session, RunSink& sink, const RunLimits& limits, CancelToken& token);

}  // namespace ndt7
