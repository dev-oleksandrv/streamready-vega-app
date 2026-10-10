#include "ndt7/core/FrameDecoder.h"

#include <algorithm>
#include <cstring>

#include "ndt7/core/Constants.h"

namespace ndt7 {

FrameDecoder::FrameDecoder(FrameHandler& handler) : handler_(handler) {}

bool FrameDecoder::feed(const uint8_t* data, size_t length) {
    if (failed_) {
        return false;
    }
    size_t i = 0;
    while (i < length && !closed_) {
        if (!inPayload_) {
            header_[headerHave_++] = data[i++];
            if (headerHave_ == 2) {
                if (header_[1] & 0x80) {  // servers must not mask (§5.1)
                    failed_ = true;
                    return false;
                }
                const uint8_t len7 = header_[1] & 0x7F;
                headerNeed_ = 2 + (len7 == 126 ? 2 : len7 == 127 ? 8 : 0);
            }
            if (headerHave_ >= 2 && headerHave_ == headerNeed_) {
                if (!beginFrame() || (remaining_ == 0 && !endFrame())) {
                    failed_ = true;
                    return false;
                }
            }
            continue;
        }
        const size_t take = static_cast<size_t>(std::min<uint64_t>(remaining_, length - i));
        consumePayload(data + i, take);
        i += take;
        remaining_ -= take;
        if (remaining_ == 0 && !endFrame()) {
            failed_ = true;
            return false;
        }
    }
    return true;
}

bool FrameDecoder::beginFrame() {
    fin_ = (header_[0] & 0x80) != 0;
    if (header_[0] & 0x70) {  // no extensions negotiated: RSV bits must be 0
        return false;
    }
    opcode_ = header_[0] & 0x0F;

    uint64_t length = header_[1] & 0x7F;
    if (length == 126) {
        length = (uint64_t{header_[2]} << 8) | header_[3];
    } else if (length == 127) {
        length = 0;
        for (int i = 0; i < 8; ++i) {
            length = (length << 8) | header_[2 + i];
        }
        if (length >> 63) {
            return false;
        }
    }

    if (opcode_ & 0x08) {
        if (opcode_ != opcode::kClose && opcode_ != opcode::kPing && opcode_ != opcode::kPong) {
            return false;
        }
        if (!fin_ || length > kMaxControlPayloadBytes) {
            return false;
        }
        controlHave_ = 0;
    } else {
        if (opcode_ != opcode::kContinuation && opcode_ != opcode::kText && opcode_ != opcode::kBinary) {
            return false;
        }
        if ((opcode_ == opcode::kContinuation) != inMessage_) {
            return false;
        }
        if (opcode_ != opcode::kContinuation) {
            inMessage_ = true;
            messageOpcode_ = opcode_;
            messageBytes_ = 0;
            text_.clear();
            textOverflow_ = false;
        }
        if (length > kMaxMessageBytes - messageBytes_) {
            return false;
        }
        messageBytes_ += length;
    }

    remaining_ = length;
    inPayload_ = true;
    headerHave_ = 0;
    headerNeed_ = 2;
    return true;
}

void FrameDecoder::consumePayload(const uint8_t* data, size_t length) {
    if (opcode_ & 0x08) {
        std::memcpy(control_ + controlHave_, data, length);
        controlHave_ += length;
        return;
    }
    if (messageOpcode_ == opcode::kBinary) {
        handler_.onBinaryBytes(length);
        return;
    }
    if (textOverflow_) {
        return;
    }
    if (text_.size() + length > kMaxTextBytes) {
        textOverflow_ = true;
        std::string().swap(text_);
        return;
    }
    text_.append(reinterpret_cast<const char*>(data), length);
}

bool FrameDecoder::endFrame() {
    inPayload_ = false;
    if (opcode_ & 0x08) {
        if (opcode_ == opcode::kPing) {
            handler_.onPing(control_, controlHave_);
        } else if (opcode_ == opcode::kClose) {
            if (controlHave_ == 1) {
                return false;
            }
            const bool hasCode = controlHave_ >= 2;
            const uint16_t code = hasCode ? static_cast<uint16_t>((control_[0] << 8) | control_[1]) : 0;
            closed_ = true;
            handler_.onClose(hasCode, code);
        }
        return true;
    }
    if (fin_) {
        if (messageOpcode_ == opcode::kText && !textOverflow_) {
            handler_.onText(std::move(text_));
        }
        text_.clear();
        inMessage_ = false;
    }
    return true;
}

}  // namespace ndt7
