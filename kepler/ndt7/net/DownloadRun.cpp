#include "ndt7/net/DownloadRun.h"

#include "ndt7/core/Throttle.h"
#include "ndt7/net/Clock.h"

namespace ndt7 {

Outcome runDownload(WsSession& session, RunSink& sink, const RunLimits& limits, CancelToken& token) {
    const int64_t start = monotonicMs();
    int64_t lastData = start;
    Throttle throttle(start, limits.emitIntervalMs);
    const auto finish = [&](ErrorCode error, int64_t elapsedMs) {
        return Outcome{error, {session.binaryBytes(), elapsedMs, session.takeMeasurements()}};
    };

    // Tells JS the socket is open, which ends the "latency" phase.
    sink.onProgress({0, 0, {}});
    while (true) {
        const int64_t now = monotonicMs();
        if (token.cancelled()) {
            return finish(ErrorCode::Aborted, now - start);
        }
        if (now - start >= limits.downloadTimeoutMs) {
            return finish(ErrorCode::Timeout, now - start);
        }
        bool gotData = false;
        ErrorCode error = session.readOnce(false, gotData);
        const int64_t after = monotonicMs();
        if (error != ErrorCode::None) {
            return finish(error, after - start);
        }
        if (gotData) {
            lastData = after;
        } else if (after - lastData >= limits.ioTimeoutMs) {
            return finish(ErrorCode::NetworkLost, after - start);
        }
        if ((error = session.flushPong()) != ErrorCode::None) {
            return finish(error, after - start);
        }
        if (session.closeReceived()) {
            // The server ended the test; the close reply and drain are best effort.
            session.sendClose(session.closeCode());
            session.drainUntilEof(limits.closeWaitMs);
            return finish(ErrorCode::None, after - start);
        }
        if (throttle.ready(after)) {
            sink.onProgress({session.binaryBytes(), after - start, session.takeMeasurements()});
        }
    }
}

}  // namespace ndt7
