#include "ndt7/net/Socket.h"

#include <netdb.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/time.h>
#include <unistd.h>

#include <algorithm>

#include "ndt7/net/Clock.h"

namespace ndt7 {
namespace {

constexpr int64_t kMinAttemptMs = 1500;

bool setTimeout(int fd, int option, int64_t ms) {
    timeval tv{};
    tv.tv_sec = static_cast<time_t>(ms / 1000);
    tv.tv_usec = static_cast<suseconds_t>((ms % 1000) * 1000);
    return ::setsockopt(fd, SOL_SOCKET, option, &tv, sizeof(tv)) == 0;
}

}  // namespace

bool prepareSocket(int fd, int sliceMs) {
#ifdef SO_NOSIGPIPE
    const int on = 1;
    ::setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &on, sizeof(on));
#endif
    // Fails harmlessly on non-TCP sockets (host tests use socketpair).
    const int noDelay = 1;
    ::setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &noDelay, sizeof(noDelay));
    return setTimeout(fd, SO_SNDTIMEO, sliceMs) && setTimeout(fd, SO_RCVTIMEO, sliceMs);
}

int64_t connectAttemptBudgetMs(int64_t remainingMs, size_t addressesLeft) {
    const int64_t share = addressesLeft > 1 ? remainingMs / static_cast<int64_t>(addressesLeft) : remainingMs;
    return std::min(remainingMs, std::max(share, kMinAttemptMs));
}

int connectTcp(const WsUrl& url, int64_t budgetMs, CancelToken& token) {
    addrinfo hints{};
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    // Skip address families this device has no configured address for.
    hints.ai_flags = AI_ADDRCONFIG;
    addrinfo* list = nullptr;
    if (::getaddrinfo(url.host.c_str(), url.port.c_str(), &hints, &list) != 0 || list == nullptr) {
        return -1;
    }
    size_t addressesLeft = 0;
    for (addrinfo* ai = list; ai != nullptr; ai = ai->ai_next) {
        ++addressesLeft;
    }
    const int64_t deadline = monotonicMs() + budgetMs;
    int connected = -1;
    for (addrinfo* ai = list; ai != nullptr && connected < 0 && !token.cancelled(); ai = ai->ai_next, --addressesLeft) {
        const int64_t remaining = deadline - monotonicMs();
        if (remaining <= 0) {
            break;
        }
        const int fd = ::socket(ai->ai_family, ai->ai_socktype, ai->ai_protocol);
        if (fd < 0) {
            continue;
        }
        token.attach(fd);
        // shutdown() does not abort a connect that has not started: re-check here.
        if (token.cancelled()) {
            token.closeSocket();
            break;
        }
        // Linux applies SO_SNDTIMEO to connect(); timing out yields EINPROGRESS.
        setTimeout(fd, SO_SNDTIMEO, connectAttemptBudgetMs(remaining, addressesLeft));
        if (::connect(fd, ai->ai_addr, ai->ai_addrlen) == 0 && !token.cancelled()) {
            connected = fd;
        } else {
            token.closeSocket();
        }
    }
    ::freeaddrinfo(list);
    return connected;
}

}  // namespace ndt7
