#pragma once

#include <cstdint>
#include <optional>

namespace ndt7 {

// The TV's own view of the path. Under a VPN that ends TCP at its exit node,
// the server's TCPInfo measures server <-> exit instead (ADR 0011).
struct ClientRtt {
    uint32_t minRttUs = 0;
    uint32_t rttUs = 0;
};

// Empty off Linux, for non-TCP sockets, on failure, or before any sample.
std::optional<ClientRtt> readClientRtt(int fd);

}  // namespace ndt7
