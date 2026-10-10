#pragma once

#include <sys/socket.h>

#include <cstdint>

#include "ndt7/core/WsUrl.h"
#include "ndt7/net/CancelToken.h"

namespace ndt7 {

#ifdef MSG_NOSIGNAL
constexpr int kSendFlags = MSG_NOSIGNAL;
#else
constexpr int kSendFlags = 0;  // Apple: SO_NOSIGPIPE is set in prepareSocket()
#endif

// Short send/recv timeouts let loops check cancel and deadlines between slices.
bool prepareSocket(int fd, int sliceMs);

// getaddrinfo (IPv4 and IPv6), then a blocking connect per address within
// `budgetMs` overall. The socket is attached to `token`. Returns -1 on failure.
int connectTcp(const WsUrl& url, int64_t budgetMs, CancelToken& token);

}  // namespace ndt7
