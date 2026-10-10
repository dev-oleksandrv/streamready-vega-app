#include "ndt7/core/Handshake.h"

#include <cctype>
#include <string_view>

#include "ndt7/core/Base64.h"
#include "ndt7/core/Constants.h"
#include "ndt7/core/Sha1.h"

namespace ndt7 {
namespace {

constexpr const char* kGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

std::string_view trim(std::string_view text) {
    while (!text.empty() && (text.front() == ' ' || text.front() == '\t')) {
        text.remove_prefix(1);
    }
    while (!text.empty() && (text.back() == ' ' || text.back() == '\t')) {
        text.remove_suffix(1);
    }
    return text;
}

std::string lower(std::string_view text) {
    std::string out(text);
    for (char& c : out) {
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }
    return out;
}

bool hasToken(const std::string& list, const std::string& token) {
    size_t start = 0;
    while (start <= list.size()) {
        size_t comma = list.find(',', start);
        if (comma == std::string::npos) {
            comma = list.size();
        }
        if (trim(std::string_view(list).substr(start, comma - start)) == token) {
            return true;
        }
        start = comma + 1;
    }
    return false;
}

}  // namespace

std::string acceptKeyFor(const std::string& key) {
    const Sha1Digest digest = sha1(key + kGuid);
    return base64Encode(digest.data(), digest.size());
}

std::string buildHandshakeRequest(const WsUrl& url, const std::string& key) {
    return "GET " + url.target + " HTTP/1.1\r\n" + "Host: " + url.hostHeader + "\r\n" +
           "Upgrade: websocket\r\n"
           "Connection: Upgrade\r\n"
           "Sec-WebSocket-Key: " +
           key + "\r\n" + "Sec-WebSocket-Version: 13\r\n" + "Sec-WebSocket-Protocol: " + kSubprotocol + "\r\n" +
           "User-Agent: streamready-native\r\n\r\n";
}

HandshakeResult checkHandshakeResponse(const char* data, size_t length, const std::string& key) {
    const std::string_view view(data, length);
    const size_t end = view.find("\r\n\r\n");
    if (end == std::string_view::npos) {
        return {length >= kMaxHandshakeBytes ? HandshakeStatus::Invalid : HandshakeStatus::Incomplete, 0};
    }
    if (end + 4 > kMaxHandshakeBytes) {
        return {HandshakeStatus::Invalid, 0};
    }

    const std::string_view head = view.substr(0, end);
    const size_t statusEnd = head.find("\r\n");
    const std::string_view status = head.substr(0, statusEnd);
    // "HTTP/1.1 101 Switching Protocols"
    if (status.size() < 12 || status.substr(0, 5) != "HTTP/" || status[8] != ' ') {
        return {HandshakeStatus::Invalid, 0};
    }
    if (status.substr(9, 3) != "101") {
        return {HandshakeStatus::Rejected, 0};
    }

    const std::string expectedAccept = acceptKeyFor(key);
    bool upgrade = false;
    bool connection = false;
    bool accept = false;
    bool protocol = false;
    size_t pos = statusEnd == std::string_view::npos ? head.size() : statusEnd + 2;
    while (pos < head.size()) {
        size_t next = head.find("\r\n", pos);
        if (next == std::string_view::npos) {
            next = head.size();
        }
        const std::string_view line = head.substr(pos, next - pos);
        pos = next + 2;
        const size_t colon = line.find(':');
        if (colon == std::string_view::npos) {
            return {HandshakeStatus::Invalid, 0};
        }
        const std::string name = lower(trim(line.substr(0, colon)));
        const std::string_view value = trim(line.substr(colon + 1));
        if (name == "upgrade") {
            upgrade = lower(value) == "websocket";
        } else if (name == "connection") {
            connection = hasToken(lower(value), "upgrade");
        } else if (name == "sec-websocket-accept") {
            accept = value == expectedAccept;
        } else if (name == "sec-websocket-protocol") {
            protocol = value == kSubprotocol;
        }
    }
    if (!(upgrade && connection && accept && protocol)) {
        return {HandshakeStatus::Invalid, 0};
    }
    return {HandshakeStatus::Accepted, end + 4};
}

}  // namespace ndt7
