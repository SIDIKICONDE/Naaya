#pragma once

#ifdef __cplusplus
#include <memory>
#include "../../shared/Camera/capture/VideoCapture.hpp"

namespace Camera {

std::unique_ptr<VideoCapture> createIOSVideoCapture();

} // namespace Camera
#endif // __cplusplus


