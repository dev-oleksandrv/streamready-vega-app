#include <string>

#include "harness.h"
#include "ndt7/core/Constants.h"
#include "ndt7/core/Handshake.h"
#include "ndt7/core/WsUrl.h"

using ndt7::HandshakeStatus;

namespace {

const std::string kKey = "dGhlIHNhbXBsZSBub25jZQ==";

std::string response(const std::string& statusLine, const std::string& headers) {
    return statusLine + "\r\n" + headers + "\r\n";
}

std::string goodHeaders() {
    return "Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + ndt7::acceptKeyFor(kKey) +
           "\r\nSec-WebSocket-Protocol: net.measurementlab.ndt.v7\r\n";
}

ndt7::HandshakeResult check(const std::string& text) {
    return ndt7::checkHandshakeResponse(text.data(), text.size(), kKey);
}

}  // namespace

// RFC 6455 §1.3 example.
TEST(handshake_accept_key_rfc_example) { CHECK_EQ(ndt7::acceptKeyFor(kKey), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="); }

TEST(handshake_request_has_required_headers) {
    auto url = ndt7::parseWsUrl("ws://ndt-1.example/ndt/v7/upload?access_token=REDACTED");
    const std::string request = ndt7::buildHandshakeRequest(*url, kKey);
    CHECK(request.rfind("GET /ndt/v7/upload?access_token=REDACTED HTTP/1.1\r\n", 0) == 0);
    CHECK(request.find("\r\nHost: ndt-1.example\r\n") != std::string::npos);
    CHECK(request.find("\r\nUpgrade: websocket\r\n") != std::string::npos);
    CHECK(request.find("\r\nConnection: Upgrade\r\n") != std::string::npos);
    CHECK(request.find("\r\nSec-WebSocket-Key: " + kKey + "\r\n") != std::string::npos);
    CHECK(request.find("\r\nSec-WebSocket-Version: 13\r\n") != std::string::npos);
    CHECK(request.find("\r\nSec-WebSocket-Protocol: net.measurementlab.ndt.v7\r\n") != std::string::npos);
    CHECK(request.size() >= 4 && request.substr(request.size() - 4) == "\r\n\r\n");
}

TEST(handshake_accepts_valid_response_and_reports_leftover) {
    const std::string head = response("HTTP/1.1 101 Switching Protocols", goodHeaders());
    const auto result = check(head + "XYZ");
    CHECK(result.status == HandshakeStatus::Accepted);
    CHECK_EQ(result.headerBytes, head.size());
}

TEST(handshake_header_names_and_tokens_are_case_insensitive) {
    const std::string headers = "upgrade: WebSocket\r\nconnection: keep-alive, Upgrade\r\nsec-websocket-accept: " +
                                ndt7::acceptKeyFor(kKey) + "\r\nsec-websocket-protocol: net.measurementlab.ndt.v7\r\n";
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", headers)).status == HandshakeStatus::Accepted);
}

TEST(handshake_incomplete_until_blank_line) {
    CHECK(check("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n").status == HandshakeStatus::Incomplete);
}

TEST(handshake_non_101_is_rejected) {
    CHECK(check(response("HTTP/1.1 403 Forbidden", "Content-Length: 0\r\n")).status == HandshakeStatus::Rejected);
}

TEST(handshake_invalid_responses) {
    const std::string wrongAccept =
        "Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: AAAA\r\nSec-WebSocket-Protocol: "
        "net.measurementlab.ndt.v7\r\n";
    const std::string wrongProtocol = "Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " +
                                      ndt7::acceptKeyFor(kKey) + "\r\nSec-WebSocket-Protocol: chat\r\n";
    const std::string missingProtocol =
        "Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + ndt7::acceptKeyFor(kKey) + "\r\n";
    const std::string missingUpgrade = "Connection: Upgrade\r\nSec-WebSocket-Accept: " + ndt7::acceptKeyFor(kKey) +
                                       "\r\nSec-WebSocket-Protocol: net.measurementlab.ndt.v7\r\n";
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", wrongAccept)).status == HandshakeStatus::Invalid);
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", wrongProtocol)).status == HandshakeStatus::Invalid);
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", missingProtocol)).status == HandshakeStatus::Invalid);
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", missingUpgrade)).status == HandshakeStatus::Invalid);
    CHECK(check("garbage\r\n\r\n").status == HandshakeStatus::Invalid);
    CHECK(check(response("HTTP/1.1 101 Switching Protocols", "NoColonHere\r\n")).status == HandshakeStatus::Invalid);
}

TEST(handshake_header_overflow_is_invalid) {
    const std::string huge = "HTTP/1.1 101 Switching Protocols\r\nX: " + std::string(ndt7::kMaxHandshakeBytes, 'a');
    CHECK(check(huge).status == HandshakeStatus::Invalid);
}
