#pragma once

// Interface iOS pour le gestionnaire de caméra
// Implémentation Objective-C++ conforme à Camera::CameraManager

#ifdef __cplusplus
#include <memory>
#include "../../shared/Camera/core/CameraManager.hpp"

namespace Camera {

// Fabrique iOS exposée au lien C++
std::unique_ptr<CameraManager> createIOSCameraManager();

} // namespace Camera
#endif // __cplusplus


