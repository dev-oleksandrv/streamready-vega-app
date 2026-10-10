#pragma once

#include <cstdint>

namespace ndt7 {

// Defaults follow ndt7-client-go params and the TypeScript engine; tests shorten them.
struct RunLimits {
    int64_t connectBudgetMs = 5000;
    int64_t ioTimeoutMs = 7000;
    int64_t downloadTimeoutMs = 15000;
    int64_t uploadDurationMs = 10000;
    int64_t closeWaitMs = 1000;
    int64_t emitIntervalMs = 250;
    int sliceMs = 250;
};

}  // namespace ndt7
