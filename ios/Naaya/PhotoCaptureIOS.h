#pragma once

#ifdef __cplusplus
#include <memory>
#include "../../shared/Camera/capture/PhotoCapture.hpp"

namespace Camera {

std::unique_ptr<PhotoCapture> createIOSPhotoCapture();

} // namespace Camera
#endif // __cplusplus


