#include "ndt7/net/UploadRun.h"

#include <vector>

#include "ndt7/core/Constants.h"
#include "ndt7/core/Frame.h"
#include "ndt7/core/Throttle.h"
#include "ndt7/core/UploadScaling.h"
#include "ndt7/net/Clock.h"

namespace ndt7 {

Outcome runUpload(WsSession& session, RunSink& sink, const RunLimits& limits, CancelToken& token, Xorshift& rng) {
    // One random 1 MiB buffer per run; a message of n bytes sends its first n.
    // It is used as the already-masked wire payload: the server unmasks it into
    // other random bytes, so no per-message XOR or copy is needed (RFC 6455 §5.3
    // only requires a fresh key per frame).
    std::vector<uint8_t> noise(kMaxScaledMessageBytes);
    rng.fill(noise.data(), noise.size());

    UploadScaling scaling;
    uint64_t sent = 0;
    const int64_t start = monotonicMs();
    Throttle throttle(start, limits.emitIntervalMs);
    const auto finish = [&](ErrorCode error) {
        return Outcome{error, {sent, monotonicMs() - start, session.takeMeasurements()}};
    };

    sink.onProgress({0, 0, {}});
    while (monotonicMs() - start < limits.uploadDurationMs) {
        if (token.cancelled()) {
            return finish(ErrorCode::Aborted);
        }
        ErrorCode error = session.flushPong();
        if (error != ErrorCode::None) {
            return finish(error);
        }
        const size_t size = scaling.size();
        if ((error = session.sendPremaskedFrame(opcode::kBinary, noise.data(), size)) != ErrorCode::None) {
            return finish(error);
        }
        sent += size;
        scaling.onSent();

        bool gotData = true;
        while (gotData) {
            if ((error = session.readOnce(true, gotData)) != ErrorCode::None) {
                return finish(error);
            }
        }
        if (session.binaryBytes() > 0) {  // ndt7: the server never sends binary during upload
            return finish(ErrorCode::Protocol);
        }
        if (session.closeReceived()) {
            break;
        }
        const int64_t now = monotonicMs();
        if (throttle.ready(now)) {
            sink.onProgress({sent, now - start, session.takeMeasurements()});
        }
    }

    const int64_t elapsed = monotonicMs() - start;
    // Best effort: the server's last measurements arrive during the close handshake.
    session.sendClose(session.closeReceived() ? session.closeCode() : 1000);
    session.drainUntilEof(limits.closeWaitMs);
    return Outcome{ErrorCode::None, {sent, elapsed, session.takeMeasurements()}};
}

}  // namespace ndt7
