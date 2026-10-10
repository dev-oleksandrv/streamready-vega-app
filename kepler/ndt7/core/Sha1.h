#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>

namespace ndt7 {

using Sha1Digest = std::array<uint8_t, 20>;

// Only for the WebSocket accept key (RFC 6455 §4.2.2), not for security.
Sha1Digest sha1(const uint8_t* data, size_t length);
Sha1Digest sha1(const std::string& text);

}  // namespace ndt7
