#include "ndt7/net/Entropy.h"

#include <fcntl.h>
#include <unistd.h>

#include <chrono>

namespace ndt7 {

uint64_t entropySeed() {
    uint64_t seed = 0;
    const int fd = ::open("/dev/urandom", O_RDONLY);
    if (fd >= 0) {
        const ssize_t n = ::read(fd, &seed, sizeof(seed));
        ::close(fd);
        if (n == static_cast<ssize_t>(sizeof(seed))) {
            return seed;
        }
    }
    const auto ticks = std::chrono::steady_clock::now().time_since_epoch().count();
    return static_cast<uint64_t>(ticks) ^ reinterpret_cast<uintptr_t>(&seed);
}

}  // namespace ndt7
