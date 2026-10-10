#pragma once

#include <atomic>
#include <mutex>

namespace ndt7 {

// Lets the JS thread stop a worker blocked in send()/recv(): shutdown() wakes
// both. The descriptor is cleared under the mutex before close(), so cancel()
// never shuts down a descriptor the OS has already reused.
class CancelToken {
public:
    void cancel();
    bool cancelled() const { return cancelled_.load(); }
    // Registers the socket; shuts it down at once when already cancelled.
    void attach(int fd);
    // Unregisters and closes the socket, if any.
    void closeSocket();

private:
    std::atomic<bool> cancelled_{false};
    std::mutex mutex_;
    int fd_ = -1;
};

}  // namespace ndt7
