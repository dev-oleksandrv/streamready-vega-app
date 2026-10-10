#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

#include "ndt7/core/Errors.h"
#include "ndt7/core/FrameDecoder.h"
#include "ndt7/core/WsUrl.h"
#include "ndt7/core/Xorshift.h"
#include "ndt7/net/CancelToken.h"
#include "ndt7/net/RunLimits.h"

namespace ndt7 {

// WebSocket client over one connected, blocking socket. Single-threaded: only
// the worker that owns the socket calls it; CancelToken is the only cross-thread path.
class WsSession : private FrameHandler {
public:
    WsSession(int fd, CancelToken& token, const RunLimits& limits, Xorshift& rng);

    ErrorCode handshake(const WsUrl& url);
    // One recv(); blocks up to one slice unless `dontWait`. `gotData` is set when bytes arrived.
    ErrorCode readOnce(bool dontWait, bool& gotData);
    // Data frame whose payload is already in masked wire form (see UploadRun).
    ErrorCode sendPremaskedFrame(uint8_t opcode, const uint8_t* wirePayload, size_t length);
    ErrorCode sendClose(uint16_t code);
    ErrorCode flushPong();
    // Reads until EOF or `ms` elapse; errors are ignored because the result is already known.
    void drainUntilEof(int64_t ms);

    uint64_t binaryBytes() const { return binaryBytes_; }
    bool closeReceived() const { return closeReceived_; }
    uint16_t closeCode() const { return closeCode_; }
    std::vector<std::string> takeMeasurements();

private:
    void onBinaryBytes(size_t count) override;
    void onText(std::string text) override;
    void onPing(const uint8_t* payload, size_t length) override;
    void onClose(bool hasCode, uint16_t code) override;

    ErrorCode sendAll(const uint8_t* data, size_t length);
    ErrorCode sendControl(uint8_t opcode, const uint8_t* payload, size_t length);
    ErrorCode failure() const { return token_.cancelled() ? ErrorCode::Aborted : ErrorCode::NetworkLost; }

    int fd_;
    CancelToken& token_;
    const RunLimits& limits_;
    Xorshift& rng_;
    FrameDecoder decoder_;
    std::vector<uint8_t> readBuffer_;
    uint64_t binaryBytes_ = 0;
    std::vector<std::string> measurements_;
    std::vector<uint8_t> pendingPong_;
    bool hasPendingPong_ = false;
    bool closeReceived_ = false;
    uint16_t closeCode_ = 1000;
    bool eof_ = false;
};

}  // namespace ndt7
