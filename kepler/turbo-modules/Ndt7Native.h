#pragma once

#include "generated/Ndt7NativeSpec.h"

#include <atomic>
#include <cstdint>
#include <string>
#include <thread>
#include <vector>

namespace Ndt7TurboModule {

class Ndt7Native : public Ndt7NativeSpec {
public:
    Ndt7Native();
    ~Ndt7Native() noexcept override;

    void start(int32_t runId, std::string direction, std::string url) override;
    void cancel(int32_t runId) override;

private:
    // Spike only: proves emit() from a worker thread. Replaced in Task 8.
    std::vector<std::thread> threads_;
};

}  // namespace Ndt7TurboModule
