#include "ndt7/core/Throttle.h"

namespace ndt7 {

bool Throttle::ready(int64_t nowMs) {
    if (nowMs - last_ < interval_) {
        return false;
    }
    last_ = nowMs;
    return true;
}

}  // namespace ndt7
