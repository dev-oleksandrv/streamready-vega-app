#include "Ndt7Native.h"

using namespace com::amazon::kepler::turbomodule;

namespace Ndt7TurboModule {

Ndt7Native::Ndt7Native() = default;

Ndt7Native::~Ndt7Native() noexcept {
    for (auto& thread : threads_) {
        if (thread.joinable()) {
            thread.join();
        }
    }
}

void Ndt7Native::start(int32_t runId, std::string direction, std::string /*url*/) {
    threads_.emplace_back([this, runId, direction]() {
        JSObject payload;
        payload["runId"] = static_cast<double>(runId);
        payload["seq"] = 1.0;
        payload["type"] = std::string("done");
        payload["bytes"] = 0.0;
        payload["elapsedMs"] = 0.0;
        payload["measurements"] = JSArray{std::string("spike:") + direction};
        payload["error"] = std::string("protocol");
        emit(std::string("ndt7native"), payload);
    });
}

void Ndt7Native::cancel(int32_t /*runId*/) {}

}  // namespace Ndt7TurboModule
