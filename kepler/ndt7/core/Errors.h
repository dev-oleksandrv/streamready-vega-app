#pragma once

namespace ndt7 {

// Mirrors the TypeScript SpeedTestError codes the native engine can report.
enum class ErrorCode { None, ConnectFailed, NetworkLost, Timeout, Protocol, Aborted };

inline const char* toString(ErrorCode code) {
    switch (code) {
        case ErrorCode::None:
            return "none";
        case ErrorCode::ConnectFailed:
            return "connect_failed";
        case ErrorCode::NetworkLost:
            return "network_lost";
        case ErrorCode::Timeout:
            return "timeout";
        case ErrorCode::Protocol:
            return "protocol";
        case ErrorCode::Aborted:
            return "aborted";
    }
    return "protocol";
}

}  // namespace ndt7
