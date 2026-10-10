#include "Ndt7Native.h"

#include <stdexcept>
#include <utility>
#include <vector>

#include "ndt7/core/Errors.h"
#include "ndt7/net/RunLimits.h"
#include "ndt7/net/RunSink.h"
#include "ndt7/net/Subtest.h"

using namespace com::amazon::kepler::turbomodule;

namespace Ndt7TurboModule {
namespace {

constexpr const char* kEventName = "ndt7native";

// Turns worker progress into self-contained events. emit() gives no ordering
// across calls, so every event carries a seq and `done` repeats the totals.
class EmitSink : public ndt7::RunSink {
public:
    EmitSink(Ndt7Native& module, int32_t runId) : module_(module), runId_(runId) {}

    void onProgress(ndt7::Progress progress) override {
        module_.emitRunEvent(payload("progress", progress, ndt7::ErrorCode::None));
    }

    void onDone(ndt7::Progress final, ndt7::ErrorCode error) override {
        module_.emitRunEvent(payload("done", final, error));
    }

private:
    JSObject payload(const char* type, const ndt7::Progress& progress, ndt7::ErrorCode error) {
        JSObject object;
        object["runId"] = static_cast<double>(runId_);
        object["seq"] = static_cast<double>(++seq_);
        object["type"] = std::string(type);
        object["bytes"] = static_cast<double>(progress.bytes);
        object["elapsedMs"] = static_cast<double>(progress.elapsedMs);
        JSArray texts;
        for (const auto& text : progress.measurements) {
            texts.emplace_back(text);
        }
        object["measurements"] = std::move(texts);
        if (error != ndt7::ErrorCode::None) {
            object["error"] = std::string(ndt7::toString(error));
        }
        return object;
    }

    Ndt7Native& module_;
    int32_t runId_;
    uint64_t seq_ = 0;
};

}  // namespace

Ndt7Native::Ndt7Native() = default;

Ndt7Native::~Ndt7Native() noexcept {
    {
        std::lock_guard<std::mutex> lock(emitMutex_);
        shuttingDown_ = true;
    }
    std::map<int32_t, std::shared_ptr<Run>> runs;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        runs.swap(runs_);
    }
    for (auto& entry : runs) {
        entry.second->token.cancel();
    }
    // Workers reference this module; none may outlive it.
    for (auto& entry : runs) {
        if (entry.second->thread.joinable()) {
            entry.second->thread.join();
        }
    }
}

void Ndt7Native::start(int32_t runId, std::string direction, std::string url) {
    const auto parsed = ndt7::parseDirection(direction);
    if (!parsed) {
        throw std::invalid_argument("ndt7: unknown direction");
    }
    std::lock_guard<std::mutex> lock(mutex_);
    reapFinishedLocked();
    if (runs_.count(runId) != 0) {
        throw std::invalid_argument("ndt7: duplicate runId");
    }
    auto run = std::make_shared<Run>();
    const ndt7::Direction subtest = *parsed;
    // Thread first: if it cannot be created (std::system_error under memory
    // pressure), no unreapable entry is left behind and JS sees the exception.
    run->thread = std::thread([this, run, runId, subtest, url = std::move(url)]() {
        try {
            EmitSink sink(*this, runId);
            ndt7::runSubtest(subtest, url, run->token, sink, ndt7::RunLimits{});
        } catch (...) {
            TMERROR("ndt7: worker failed");
        }
        run->finished = true;
    });
    runs_[runId] = run;
}

void Ndt7Native::cancel(int32_t runId) {
    std::shared_ptr<Run> run;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        const auto it = runs_.find(runId);
        if (it == runs_.end()) {
            return;
        }
        run = it->second;
    }
    run->token.cancel();
}

void Ndt7Native::emitRunEvent(const JSObject& payload) {
    // emit() only queues on a threadsafe function (non-blocking), so the lock is brief.
    std::lock_guard<std::mutex> lock(emitMutex_);
    if (shuttingDown_) {
        return;
    }
    emit(std::string(kEventName), payload);
}

void Ndt7Native::reapFinishedLocked() {
    for (auto it = runs_.begin(); it != runs_.end();) {
        if (it->second->finished) {
            if (it->second->thread.joinable()) {
                it->second->thread.join();  // already returned: instant
            }
            it = runs_.erase(it);
        } else {
            ++it;
        }
    }
}

}  // namespace Ndt7TurboModule
