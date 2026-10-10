#include "ndt7/net/CancelToken.h"

#include <sys/socket.h>
#include <unistd.h>

namespace ndt7 {

void CancelToken::cancel() {
    cancelled_ = true;
    std::lock_guard<std::mutex> lock(mutex_);
    if (fd_ >= 0) {
        ::shutdown(fd_, SHUT_RDWR);
    }
}

void CancelToken::attach(int fd) {
    std::lock_guard<std::mutex> lock(mutex_);
    fd_ = fd;
    if (cancelled_) {
        ::shutdown(fd_, SHUT_RDWR);
    }
}

void CancelToken::closeSocket() {
    int fd;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        fd = fd_;
        fd_ = -1;
    }
    if (fd >= 0) {
        ::close(fd);
    }
}

}  // namespace ndt7
