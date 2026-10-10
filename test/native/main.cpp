#include <csignal>
#include <cstdio>

#include "harness.h"

int main() {
    // Tests write to sockets whose peer may already be gone.
    std::signal(SIGPIPE, SIG_IGN);
    for (const auto& test : harness::registry()) {
        const int before = harness::failures();
        test.fn();
        std::printf("%s %s\n", harness::failures() == before ? "ok  " : "FAIL", test.name);
    }
    std::printf("%zu tests, %d failed checks\n", harness::registry().size(), harness::failures());
    return harness::failures() == 0 ? 0 : 1;
}
