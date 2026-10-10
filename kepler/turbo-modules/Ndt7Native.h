#pragma once

#include "generated/Ndt7NativeSpec.h"

#include <atomic>
#include <cstdint>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

#include "ndt7/net/CancelToken.h"

namespace Ndt7TurboModule {

class Ndt7Native : public Ndt7NativeSpec {
public:
    Ndt7Native();
    ~Ndt7Native() noexcept override;

    // JS thread. Spawns one worker per subtest and returns at once.
    void start(int32_t runId, std::string direction, std::string url) override;
    // JS thread. Wakes a worker blocked in send()/recv(); idempotent.
    void cancel(int32_t runId) override;

    // Worker threads. emit() marshals onto the JS thread.
    void emitRunEvent(const com::amazon::kepler::turbomodule::JSObject& payload);

private:
    struct Run {
        ndt7::CancelToken token;
        std::thread thread;
        std::atomic<bool> finished{false};
    };

    void reapFinishedLocked();

    std::mutex mutex_;
    std::map<int32_t, std::shared_ptr<Run>> runs_;
    // Held across the shutdown check and emit(), so no worker can start an
    // emit() on a napi env that the destructor is tearing down.
    std::mutex emitMutex_;
    bool shuttingDown_ = false;
};

}  // namespace Ndt7TurboModule
