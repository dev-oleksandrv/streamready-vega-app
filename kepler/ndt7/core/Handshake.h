#pragma once

#include <cstddef>
#include <string>

#include "ndt7/core/WsUrl.h"

namespace ndt7 {

std::string acceptKeyFor(const std::string& key);
std::string buildHandshakeRequest(const WsUrl& url, const std::string& key);

enum class HandshakeStatus {
    Incomplete,  // no blank line yet: read more
    Accepted,    // valid 101: headerBytes marks where frames start
    Rejected,    // non-101 status: the server refused (connect_failed)
    Invalid,     // malformed or a 101 that breaks RFC 6455 §4.1 (protocol)
};

struct HandshakeResult {
    HandshakeStatus status;
    size_t headerBytes;
};

HandshakeResult checkHandshakeResponse(const char* data, size_t length, const std::string& key);

}  // namespace ndt7
