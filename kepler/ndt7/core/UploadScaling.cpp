#include "ndt7/core/UploadScaling.h"

namespace ndt7 {

void UploadScaling::onSent() {
    total_ += size_;
    if (size_ < kMaxScaledMessageBytes && size_ <= total_ / kScalingFraction) {
        size_ *= 2;
    }
}

}  // namespace ndt7
