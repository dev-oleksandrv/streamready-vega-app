#pragma once

#include "generated/VpnNativeSpec.h"

namespace VpnTurboModule {

class VpnNative : public VpnNativeSpec {
public:
    VpnNative() = default;
    ~VpnNative() noexcept override = default;

    // JS thread. One IPC call to the network service; called only on launch,
    // foreground and test start (ADR 0011), so the brief block is accepted.
    int32_t getVpnState() override;
};

}  // namespace VpnTurboModule
