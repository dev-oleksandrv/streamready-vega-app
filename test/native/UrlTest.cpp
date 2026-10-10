#include "harness.h"
#include "ndt7/core/WsUrl.h"

using ndt7::parseWsUrl;

TEST(url_default_port_keeps_query) {
    auto url = parseWsUrl("ws://ndt-1.example/ndt/v7/download?access_token=REDACTED");
    CHECK(url.has_value());
    CHECK_EQ(url->host, "ndt-1.example");
    CHECK_EQ(url->port, "80");
    CHECK_EQ(url->target, "/ndt/v7/download?access_token=REDACTED");
    CHECK_EQ(url->hostHeader, "ndt-1.example");
}

TEST(url_explicit_port) {
    auto url = parseWsUrl("ws://ndt-1.example:8080/x");
    CHECK(url.has_value());
    CHECK_EQ(url->port, "8080");
    CHECK_EQ(url->hostHeader, "ndt-1.example:8080");
}

TEST(url_ipv6_literal) {
    auto url = parseWsUrl("ws://[2001:db8::1]/x");
    CHECK(url.has_value());
    CHECK_EQ(url->host, "2001:db8::1");
    CHECK_EQ(url->hostHeader, "[2001:db8::1]");
    auto withPort = parseWsUrl("ws://[2001:db8::1]:81/x");
    CHECK(withPort.has_value());
    CHECK_EQ(withPort->port, "81");
    CHECK_EQ(withPort->hostHeader, "[2001:db8::1]:81");
}

TEST(url_empty_path_becomes_root) {
    CHECK_EQ(parseWsUrl("ws://ndt-1.example")->target, "/");
    CHECK_EQ(parseWsUrl("ws://ndt-1.example?a=b")->target, "/?a=b");
}

TEST(url_rejects_invalid) {
    const char* invalid[] = {
        "wss://ndt-1.example/x",      "http://ndt-1.example/x",      "ws:///x",
        "ws://ndt-1.example:/x",      "ws://ndt-1.example:0/x",      "ws://ndt-1.example:99999/x",
        "ws://ndt-1.example:8a/x",    "ws://user@ndt-1.example/x",   "ws://[2001:db8::1/x",
        "",
    };
    for (const char* text : invalid) {
        CHECK(!parseWsUrl(text).has_value());
    }
}
