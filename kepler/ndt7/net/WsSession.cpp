#include "ndt7/net/WsSession.h"

#include <cerrno>
#include <sys/socket.h>

#include "ndt7/core/Base64.h"
#include "ndt7/core/Constants.h"
#include "ndt7/core/Frame.h"
#include "ndt7/core/FrameEncoder.h"
#include "ndt7/core/Handshake.h"
#include "ndt7/net/Clock.h"
#include "ndt7/net/Socket.h"

namespace ndt7 {
namespace {

bool wouldBlock(int error) { return error == EAGAIN || error == EWOULDBLOCK || error == EINTR; }

}  // namespace

WsSession::WsSession(int fd, CancelToken& token, const RunLimits& limits, Xorshift& rng)
    : fd_(fd), token_(token), limits_(limits), rng_(rng), decoder_(*this), readBuffer_(kReadBufferBytes) {}

ErrorCode WsSession::handshake(const WsUrl& url) {
    uint8_t keyBytes[16];
    rng_.fill(keyBytes, sizeof(keyBytes));
    const std::string key = base64Encode(keyBytes, sizeof(keyBytes));
    const std::string request = buildHandshakeRequest(url, key);
    if (sendAll(reinterpret_cast<const uint8_t*>(request.data()), request.size()) != ErrorCode::None) {
        return token_.cancelled() ? ErrorCode::Aborted : ErrorCode::ConnectFailed;
    }

    const int64_t deadline = monotonicMs() + limits_.ioTimeoutMs;
    std::string response;
    while (true) {
        if (token_.cancelled()) {
            return ErrorCode::Aborted;
        }
        if (monotonicMs() > deadline) {
            return ErrorCode::ConnectFailed;
        }
        const ssize_t n = ::recv(fd_, readBuffer_.data(), readBuffer_.size(), 0);
        if (n < 0 && wouldBlock(errno)) {
            continue;
        }
        if (n <= 0) {
            return token_.cancelled() ? ErrorCode::Aborted : ErrorCode::ConnectFailed;
        }
        response.append(reinterpret_cast<const char*>(readBuffer_.data()), static_cast<size_t>(n));
        const HandshakeResult result = checkHandshakeResponse(response.data(), response.size(), key);
        switch (result.status) {
            case HandshakeStatus::Incomplete:
                continue;
            case HandshakeStatus::Rejected:
                return ErrorCode::ConnectFailed;
            case HandshakeStatus::Invalid:
                return ErrorCode::Protocol;
            case HandshakeStatus::Accepted: {
                // Frames may follow the headers in the same read.
                const size_t leftover = response.size() - result.headerBytes;
                if (leftover > 0 &&
                    !decoder_.feed(reinterpret_cast<const uint8_t*>(response.data()) + result.headerBytes, leftover)) {
                    return ErrorCode::Protocol;
                }
                return ErrorCode::None;
            }
        }
    }
}

ErrorCode WsSession::readOnce(bool dontWait, bool& gotData) {
    gotData = false;
    if (token_.cancelled()) {
        return ErrorCode::Aborted;
    }
    const ssize_t n = ::recv(fd_, readBuffer_.data(), readBuffer_.size(), dontWait ? MSG_DONTWAIT : 0);
    if (n > 0) {
        gotData = true;
        return decoder_.feed(readBuffer_.data(), static_cast<size_t>(n)) ? ErrorCode::None : ErrorCode::Protocol;
    }
    if (n == 0) {
        eof_ = true;
        return closeReceived_ && !token_.cancelled() ? ErrorCode::None : failure();
    }
    if (wouldBlock(errno)) {
        return token_.cancelled() ? ErrorCode::Aborted : ErrorCode::None;
    }
    return failure();
}

ErrorCode WsSession::sendAll(const uint8_t* data, size_t length) {
    size_t offset = 0;
    int64_t lastProgress = monotonicMs();
    while (offset < length) {
        if (token_.cancelled()) {
            return ErrorCode::Aborted;
        }
        const ssize_t n = ::send(fd_, data + offset, length - offset, kSendFlags);
        if (n > 0) {
            offset += static_cast<size_t>(n);
            lastProgress = monotonicMs();
            continue;
        }
        if (n < 0 && wouldBlock(errno)) {
            if (monotonicMs() - lastProgress >= limits_.ioTimeoutMs) {
                return ErrorCode::NetworkLost;
            }
            continue;
        }
        return failure();
    }
    return ErrorCode::None;
}

ErrorCode WsSession::sendPremaskedFrame(uint8_t opcode, const uint8_t* wirePayload, size_t length) {
    uint8_t key[4];
    rng_.fill(key, sizeof(key));
    uint8_t header[kMaxFrameHeaderBytes];
    const size_t headerLength = encodeFrameHeader(opcode, length, key, header);
    const ErrorCode error = sendAll(header, headerLength);
    return error != ErrorCode::None ? error : sendAll(wirePayload, length);
}

ErrorCode WsSession::sendControl(uint8_t opcode, const uint8_t* payload, size_t length) {
    uint8_t key[4];
    rng_.fill(key, sizeof(key));
    const std::vector<uint8_t> frame = encodeControlFrame(opcode, payload, length, key);
    return sendAll(frame.data(), frame.size());
}

ErrorCode WsSession::sendClose(uint16_t code) {
    const uint8_t payload[2] = {static_cast<uint8_t>(code >> 8), static_cast<uint8_t>(code & 0xFF)};
    return sendControl(opcode::kClose, payload, sizeof(payload));
}

ErrorCode WsSession::flushPong() {
    if (!hasPendingPong_) {
        return ErrorCode::None;
    }
    hasPendingPong_ = false;
    return sendControl(opcode::kPong, pendingPong_.data(), pendingPong_.size());
}

void WsSession::drainUntilEof(int64_t ms) {
    const int64_t deadline = monotonicMs() + ms;
    while (!eof_ && !token_.cancelled() && monotonicMs() < deadline) {
        bool gotData = false;
        if (readOnce(false, gotData) != ErrorCode::None) {
            return;
        }
    }
}

std::vector<std::string> WsSession::takeMeasurements() {
    std::vector<std::string> out;
    out.swap(measurements_);
    return out;
}

void WsSession::onBinaryBytes(size_t count) { binaryBytes_ += count; }

void WsSession::onText(std::string text) {
    if (measurements_.size() >= kMaxPendingMeasurements) {
        measurements_.erase(measurements_.begin());
    }
    measurements_.push_back(std::move(text));
}

void WsSession::onPing(const uint8_t* payload, size_t length) {
    // RFC 6455 §5.5.3: only the most recent ping needs an answer.
    pendingPong_.assign(payload, payload + length);
    hasPendingPong_ = true;
}

void WsSession::onClose(bool hasCode, uint16_t code) {
    closeReceived_ = true;
    closeCode_ = closeEchoCode(hasCode, code);
}

}  // namespace ndt7
