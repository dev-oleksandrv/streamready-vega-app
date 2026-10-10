#pragma once

#include "ndt7/core/Xorshift.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/RunLimits.h"
#include "ndt7/net/RunSink.h"
#include "ndt7/net/WsSession.h"

namespace ndt7 {

// Sends scaled binary messages for the upload duration. Each blocking send is
// the backpressure; server measurements are drained between frames.
Outcome runUpload(WsSession& session, RunSink& sink, const RunLimits& limits, CancelToken& token, Xorshift& rng);

}  // namespace ndt7
