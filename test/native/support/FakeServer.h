#pragma once

#include <sys/socket.h>
#include <unistd.h>

#include <algorithm>
#include <cstdint>
#include <string>
#include <thread>
#include <vector>

#include "ndt7/core/Handshake.h"
#include "ndt7/net/RunLimits.h"
#include "ndt7/net/RunSink.h"
#include "ndt7/net/Socket.h"

// Scripted server end of a socketpair; runs on its own thread.
inline void writeAll(int fd, const std::string& bytes) {
    size_t off = 0;
    while (off < bytes.size()) {
        const ssize_t n = ::send(fd, bytes.data() + off, bytes.size() - off, ndt7::kSendFlags);
        if (n <= 0) {
            return;
        }
        off += static_cast<size_t>(n);
    }
}

inline std::string readRequest(int fd) {
    std::string request;
    char c;
    while (request.find("\r\n\r\n") == std::string::npos && ::recv(fd, &c, 1, 0) == 1) {
        request += c;
    }
    return request;
}

inline std::string upgradeResponse(const std::string& request) {
    const std::string marker = "Sec-WebSocket-Key: ";
    const size_t start = request.find(marker) + marker.size();
    const std::string key = request.substr(start, request.find("\r\n", start) - start);
    return "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
           "Sec-WebSocket-Accept: " +
           ndt7::acceptKeyFor(key) + "\r\nSec-WebSocket-Protocol: net.measurementlab.ndt.v7\r\n\r\n";
}

inline bool readExact(int fd, uint8_t* out, size_t length) {
    size_t have = 0;
    while (have < length) {
        const ssize_t n = ::recv(fd, out + have, length - have, 0);
        if (n <= 0) {
            return false;
        }
        have += static_cast<size_t>(n);
    }
    return true;
}

struct ClientFrame {
    bool ok = false;
    uint8_t opcode = 0;
    bool fin = false;
    bool masked = false;
    uint64_t length = 0;
    std::string payload;  // unmasked; only control frames are kept
};

inline ClientFrame readClientFrame(int fd) {
    ClientFrame frame;
    uint8_t head[2];
    if (!readExact(fd, head, 2)) {
        return frame;
    }
    frame.fin = (head[0] & 0x80) != 0;
    frame.opcode = head[0] & 0x0F;
    frame.masked = (head[1] & 0x80) != 0;
    uint64_t length = head[1] & 0x7F;
    if (length == 126 || length == 127) {
        uint8_t ext[8];
        const size_t n = length == 126 ? 2 : 8;
        if (!readExact(fd, ext, n)) {
            return frame;
        }
        length = 0;
        for (size_t i = 0; i < n; ++i) {
            length = (length << 8) | ext[i];
        }
    }
    uint8_t key[4] = {0, 0, 0, 0};
    if (frame.masked && !readExact(fd, key, 4)) {
        return frame;
    }
    frame.length = length;
    std::vector<uint8_t> chunk(64 * 1024);
    uint64_t left = length;
    uint64_t index = 0;
    while (left > 0) {
        const size_t take = static_cast<size_t>(std::min<uint64_t>(left, chunk.size()));
        if (!readExact(fd, chunk.data(), take)) {
            return frame;
        }
        if ((frame.opcode & 0x08) != 0) {
            for (size_t i = 0; i < take; ++i) {
                frame.payload += static_cast<char>(chunk[i] ^ key[(index + i) % 4]);
            }
        }
        index += take;
        left -= take;
    }
    frame.ok = true;
    return frame;
}

struct RecordingSink : ndt7::RunSink {
    std::vector<ndt7::Progress> progress;
    std::vector<std::string> allMeasurements() const {
        std::vector<std::string> out;
        for (const auto& p : progress) {
            out.insert(out.end(), p.measurements.begin(), p.measurements.end());
        }
        return out;
    }
    void onProgress(ndt7::Progress p) override { progress.push_back(std::move(p)); }
    void onDone(ndt7::Progress, ndt7::ErrorCode) override {}
};

// Short limits keep host tests fast.
inline ndt7::RunLimits testLimits() {
    ndt7::RunLimits limits;
    limits.connectBudgetMs = 1000;
    limits.ioTimeoutMs = 1000;
    limits.downloadTimeoutMs = 2000;
    limits.uploadDurationMs = 300;
    limits.closeWaitMs = 200;
    limits.emitIntervalMs = 10;
    limits.sliceMs = 20;
    return limits;
}

struct SocketPair {
    int client = -1;
    int server = -1;
    SocketPair() {
        int fds[2];
        if (::socketpair(AF_UNIX, SOCK_STREAM, 0, fds) == 0) {
            client = fds[0];
            server = fds[1];
            ndt7::prepareSocket(server, 1000);
        }
    }
    ~SocketPair() {
        if (server >= 0) {
            ::close(server);
        }
    }
};
