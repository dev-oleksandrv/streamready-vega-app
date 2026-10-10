#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace ndt7 {

std::string base64Encode(const uint8_t* data, size_t length);

}  // namespace ndt7
