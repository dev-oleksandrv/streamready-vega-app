#include "ndt7/net/TcpRtt.h"

#ifdef __linux__
// <linux/tcp.h>, not <netinet/tcp.h>: only the kernel header has tcpi_min_rtt.
#include <linux/tcp.h>
#include <netinet/in.h>
#include <sys/socket.h>
#endif

namespace ndt7 {

std::optional<ClientRtt> readClientRtt(int fd) {
#ifdef __linux__
    tcp_info info{};
    socklen_t len = sizeof(info);
    if (fd < 0 || ::getsockopt(fd, IPPROTO_TCP, TCP_INFO, &info, &len) != 0) {
        return std::nullopt;
    }
    if (info.tcpi_rtt == 0) {
        return std::nullopt;  // no sample yet, not a zero-latency link
    }
    return ClientRtt{info.tcpi_min_rtt, info.tcpi_rtt};
#else
    (void)fd;
    return std::nullopt;
#endif
}

}  // namespace ndt7
