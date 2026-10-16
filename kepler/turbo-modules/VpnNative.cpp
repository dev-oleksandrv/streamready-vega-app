#include "VpnNative.h"

#include <apmf/apmf_base.h>
#include <apmf/component.h>
#include <apmf/process.h>

#include <apmf/iface/com/amazon/kepler/net/vpn/common/VpnState.h>
#include <apmf/iface/com/amazon/kepler/net/vpn/vpnmanager/IVpnManager.h>

using apmf::iface::com::amazon::kepler::net::vpn::vpnmanager::IVpnManager;

namespace VpnTurboModule {
namespace {

// Device QA 2026-10-16: the only path that resolves to IVpnManager.
constexpr const char* kVpnManager = "/com.amazon.kepler.net.vpn.vpnmanager";
constexpr int32_t kFailed = -1;

}  // namespace

int32_t VpnNative::getVpnState() {
    // Missing component, missing privilege and IPC errors all mean "unknown"
    // to JS; nothing here may throw across the Turbo Module boundary.
    try {
        auto vpn = apmf::GetProcessObject()->getComponent(kVpnManager).QueryInterface<IVpnManager>();
        if (!vpn) {
            return kFailed;
        }
        return static_cast<int32_t>(vpn->getVpnState());
    } catch (...) {
        TMWARN("vpn: state unavailable");
        return kFailed;
    }
}

}  // namespace VpnTurboModule
