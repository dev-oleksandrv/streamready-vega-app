#pragma once

// Minimal test registry: no third-party test framework is allowed in the repo.
#include <cstdio>
#include <vector>

namespace harness {

struct TestCase {
    const char* name;
    void (*fn)();
};

inline std::vector<TestCase>& registry() {
    static std::vector<TestCase> cases;
    return cases;
}

inline int& failures() {
    static int count = 0;
    return count;
}

struct Registrar {
    Registrar(const char* name, void (*fn)()) { registry().push_back({name, fn}); }
};

}  // namespace harness

#define TEST(name)                                                    \
    static void name();                                               \
    static const ::harness::Registrar name##_registrar(#name, &name); \
    static void name()

#define CHECK(expr)                                                                       \
    do {                                                                                  \
        if (!(expr)) {                                                                    \
            std::fprintf(stderr, "%s:%d: CHECK(%s) failed\n", __FILE__, __LINE__, #expr); \
            ++::harness::failures();                                                      \
        }                                                                                 \
    } while (0)

#define CHECK_EQ(a, b)                                                                            \
    do {                                                                                          \
        if (!((a) == (b))) {                                                                      \
            std::fprintf(stderr, "%s:%d: CHECK_EQ(%s, %s) failed\n", __FILE__, __LINE__, #a, #b); \
            ++::harness::failures();                                                              \
        }                                                                                         \
    } while (0)
