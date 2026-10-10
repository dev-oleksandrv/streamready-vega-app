#pragma once

#include <cstddef>
#include <cstdint>

namespace ndt7 {

// ndt7 spec: ndt-server/ndt7/spec/spec.go and ndt7-client-go/internal/params.
constexpr const char* kSubprotocol = "net.measurementlab.ndt.v7";
constexpr uint64_t kMaxMessageBytes = uint64_t{1} << 24;
constexpr size_t kInitialMessageBytes = size_t{1} << 13;
constexpr size_t kMaxScaledMessageBytes = size_t{1} << 20;
constexpr uint64_t kScalingFraction = 16;

// Measurements are ~1 KiB. Larger text messages are drained, not kept, so the
// spec's 1<<24 message limit holds without buffering 16 MiB.
constexpr size_t kMaxTextBytes = 64 * 1024;
constexpr size_t kMaxHandshakeBytes = 8 * 1024;
constexpr size_t kReadBufferBytes = 64 * 1024;
// The server sends ~4 measurements/s (Poisson, >= 25 ms apart); 32 per event
// is far above what 250 ms can hold.
constexpr size_t kMaxPendingMeasurements = 32;

}  // namespace ndt7
