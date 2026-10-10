#include "turbo-modules/Ndt7Native.h"

#include <Kepler/turbomodule/KeplerTurboModuleRegistration.h>

extern "C" {
__attribute__((visibility("default"))) void autoLinkKeplerTurboModulesV1() noexcept {
    KEPLER_REGISTER_TURBO_MODULE(Ndt7TurboModule, Ndt7Native);
}
}
