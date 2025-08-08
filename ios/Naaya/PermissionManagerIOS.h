#pragma once

#ifdef __cplusplus
#include <memory>
#include "../../shared/Camera/utils/PermissionManager.hpp"

namespace Camera {

std::unique_ptr<PermissionManager> createIOSPermissionManager();

} // namespace Camera
#endif // __cplusplus


