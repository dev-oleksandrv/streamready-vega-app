#pragma once

#include <optional>
#include <string>

namespace ndt7 {

// Plain ws:// only: the device has no TLS library apps can use (ADR 0006).
struct WsUrl {
    std::string host;        // IPv6 literals without brackets
    std::string port;        // decimal; "80" when absent
    std::string target;      // path and query, never empty; carries the access token
    std::string hostHeader;  // Host header value
};

std::optional<WsUrl> parseWsUrl(const std::string& url);

}  // namespace ndt7
