#include <sys/socket.h>
#include <unistd.h>

#include "harness.h"
#include "ndt7/net/TcpRtt.h"

TEST(tcp_rtt_invalid_fd_is_empty) {
    CHECK(!ndt7::readClientRtt(-1).has_value());
}

TEST(tcp_rtt_non_tcp_socket_is_empty) {
    int fds[2];
    CHECK(::socketpair(AF_UNIX, SOCK_STREAM, 0, fds) == 0);
    CHECK(!ndt7::readClientRtt(fds[0]).has_value());
    ::close(fds[0]);
    ::close(fds[1]);
}
