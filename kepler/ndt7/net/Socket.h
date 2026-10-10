#pragma once

#include <sys/socket.h>

#include <cstddef>
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
// Also disables Nagle (best effort), as Go's net package does for the reference client.
bool prepareSocket(int fd, int sliceMs);

// Share of the remaining connect budget for the next address, so one
// blackholed address (often IPv6) cannot starve the others.
int64_t connectAttemptBudgetMs(int64_t remainingMs, size_t addressesLeft);

// getaddrinfo (IPv4 and IPv6), then a blocking connect per address within
// `budgetMs` overall. The socket is attached to `token`. Returns -1 on failure.
// getaddrinfo itself cannot be interrupted: a cancel during DNS takes effect
// when the resolver returns.
int connectTcp(const WsUrl& url, int64_t budgetMs, CancelToken& token);

}  // namespace ndt7
