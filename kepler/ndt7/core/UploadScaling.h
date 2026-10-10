#pragma once

#include <cstddef>
#include <cstdint>

#include "ndt7/core/Constants.h"

namespace ndt7 {

// ndt7-client-go upload.go: a message never exceeds 1/16 of what was sent so far.
class UploadScaling {
public:
    size_t size() const { return size_; }
    uint64_t total() const { return total_; }
    void onSent();

private:
    size_t size_ = kInitialMessageBytes;
    uint64_t total_ = 0;
};

}  // namespace ndt7
