#pragma once

namespace Camera {

/**
 * Énumération pour les modes de flash
 * Centralisée pour éviter les redéfinitions
 */
enum class FlashMode {
    OFF,      // Flash désactivé
    ON,       // Flash toujours activé
    AUTO,     // Flash automatique selon les conditions
    TORCH     // Mode torche (lumière continue)
};

} // namespace Camera
