#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

#include "ndt7/core/Frame.h"

namespace ndt7 {

class FrameHandler {
public:
    virtual ~FrameHandler() = default;
    // Binary payload is reported as counts only and never buffered.
    virtual void onBinaryBytes(size_t count) = 0;
    virtual void onText(std::string text) = 0;
    virtual void onPing(const uint8_t* payload, size_t length) = 0;
    virtual void onClose(bool hasCode, uint16_t code) = 0;
};

// Incremental server-to-client decoder (RFC 6455 §5). Accepts any read boundaries.
class FrameDecoder {
public:
    explicit FrameDecoder(FrameHandler& handler);

    // False on a protocol violation; the failure is sticky. Bytes after a
    // close frame are ignored.
    bool feed(const uint8_t* data, size_t length);
    bool closeReceived() const { return closed_; }

private:
    bool beginFrame();
    void consumePayload(const uint8_t* data, size_t length);
    bool endFrame();

    FrameHandler& handler_;
    uint8_t header_[kMaxFrameHeaderBytes] = {};
    size_t headerHave_ = 0;
    size_t headerNeed_ = 2;
    bool inPayload_ = false;
    uint64_t remaining_ = 0;
    uint8_t opcode_ = 0;
    bool fin_ = false;

    bool inMessage_ = false;
    uint8_t messageOpcode_ = 0;
    uint64_t messageBytes_ = 0;
    std::string text_;
    bool textOverflow_ = false;

    uint8_t control_[kMaxControlPayloadBytes] = {};
    size_t controlHave_ = 0;

    bool failed_ = false;
    bool closed_ = false;
};

}  // namespace ndt7
