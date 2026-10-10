#include "ndt7/core/WsUrl.h"

namespace ndt7 {
namespace {

bool validPort(const std::string& text) {
    if (text.empty() || text.size() > 5) {
        return false;
    }
    int value = 0;
    for (char c : text) {
        if (c < '0' || c > '9') {
            return false;
        }
        value = value * 10 + (c - '0');
    }
    return value >= 1 && value <= 65535;
}

}  // namespace

std::optional<WsUrl> parseWsUrl(const std::string& url) {
    const std::string scheme = "ws://";
    if (url.compare(0, scheme.size(), scheme) != 0) {
        return std::nullopt;
    }
    // The target goes into the request line verbatim: no spaces, CR/LF or controls.
    for (char c : url) {
        const auto byte = static_cast<unsigned char>(c);
        if (byte <= 0x20 || byte == 0x7F) {
            return std::nullopt;
        }
    }
    const size_t authorityStart = scheme.size();
    const size_t targetStart = url.find_first_of("/?", authorityStart);
    const std::string authority = url.substr(
        authorityStart, targetStart == std::string::npos ? std::string::npos : targetStart - authorityStart);
    std::string target = targetStart == std::string::npos ? "/" : url.substr(targetStart);
    if (target[0] == '?') {
        target = "/" + target;
    }
    if (authority.find('@') != std::string::npos) {
        return std::nullopt;
    }

    WsUrl out;
    std::string rest;
    bool ipv6 = false;
    if (!authority.empty() && authority[0] == '[') {
        const size_t close = authority.find(']');
        if (close == std::string::npos) {
            return std::nullopt;
        }
        out.host = authority.substr(1, close - 1);
        rest = authority.substr(close + 1);
        ipv6 = true;
    } else {
        const size_t colon = authority.rfind(':');
        out.host = authority.substr(0, colon);
        rest = colon == std::string::npos ? "" : authority.substr(colon);
    }
    if (out.host.empty()) {
        return std::nullopt;
    }
    if (rest.empty()) {
        out.port = "80";
    } else if (rest[0] == ':' && validPort(rest.substr(1))) {
        out.port = rest.substr(1);
    } else {
        return std::nullopt;
    }
    out.target = target;
    out.hostHeader = ipv6 ? "[" + out.host + "]" : out.host;
    if (out.port != "80") {
        out.hostHeader += ":" + out.port;
    }
    return out;
}

}  // namespace ndt7
