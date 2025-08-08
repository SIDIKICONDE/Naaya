#pragma once

#include <functional>
#include <atomic>
#include <mutex>
#include <string>

namespace Camera {

/**
 * Contrôleur de zoom
 * Architecture modulaire C++20
 */
class ZoomController {
public:
    // Callbacks pour les événements
    using ZoomChangeCallback = std::function<void(double oldZoom, double newZoom)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    
    ZoomController();
    virtual ~ZoomController();
    
    // Interdire la copie
    ZoomController(const ZoomController&) = delete;
    ZoomController& operator=(const ZoomController&) = delete;
    
    // Interdire le déplacement (à cause des mutex)
    ZoomController(ZoomController&&) = delete;
    ZoomController& operator=(ZoomController&&) = delete;
    
    // === CONTRÔLE DU ZOOM ===
    
    /**
     * Initialise le contrôleur de zoom
     */
    bool initialize();
    
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Définit le niveau de zoom
     */
    bool setZoomLevel(double level);
    
    /**
     * Récupère le niveau de zoom actuel
     */
    double getZoomLevel() const noexcept { return currentZoom_.load(); }
    
    /**
     * Récupère le niveau de zoom minimum
     */
    double getMinZoom() const noexcept { return minZoom_.load(); }
    
    /**
     * Récupère le niveau de zoom maximum
     */
    double getMaxZoom() const noexcept { return maxZoom_.load(); }
    
    /**
     * Augmente le zoom d'un facteur donné
     */
    bool zoomIn(double factor = 1.2);
    
    /**
     * Diminue le zoom d'un facteur donné
     */
    bool zoomOut(double factor = 1.2);
    
    /**
     * Remet le zoom à 1.0 (pas de zoom)
     */
    bool resetZoom();
    
    /**
     * Zoom vers un point spécifique (x, y en coordonnées normalisées 0-1)
     */
    bool zoomToPoint(double x, double y, double zoomLevel);
    
    // === ZOOM GESTUEL ===
    
    /**
     * Active/désactive le zoom gestuel
     */
    bool setGestureZoomEnabled(bool enabled);
    
    /**
     * Vérifie si le zoom gestuel est activé
     */
    bool isGestureZoomEnabled() const noexcept { return gestureZoomEnabled_.load(); }
    
    /**
     * Démarre un geste de zoom
     */
    bool startZoomGesture(double initialDistance);
    
    /**
     * Met à jour un geste de zoom en cours
     */
    bool updateZoomGesture(double currentDistance);
    
    /**
     * Termine un geste de zoom
     */
    bool endZoomGesture();
    
    // === CONFIGURATION ===
    
    /**
     * Définit la vitesse de zoom (facteur de multiplication)
     */
    void setZoomSpeed(double speed);
    
    /**
     * Récupère la vitesse de zoom
     */
    double getZoomSpeed() const;
    
    /**
     * Définit si le zoom doit être lissé (animation)
     */
    void setSmoothZoom(bool enabled);
    
    /**
     * Vérifie si le zoom lissé est activé
     */
    bool isSmoothZoomEnabled() const;
    
    /**
     * Définit la durée d'animation du zoom lissé (en millisecondes)
     */
    void setSmoothZoomDuration(int durationMs);
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de changement de zoom
     */
    void setZoomChangeCallback(ZoomChangeCallback callback);
    
    /**
     * Définit le callback d'erreur
     */
    void setErrorCallback(ErrorCallback callback);

protected:
    // Interface pour les implémentations spécifiques à la plateforme
    virtual bool initializePlatform() = 0;
    virtual void shutdownPlatform() = 0;
    virtual bool setZoomLevelPlatform(double level) = 0;
    virtual std::pair<double, double> getZoomRangePlatform() const = 0;
    virtual bool zoomToPointPlatform(double x, double y, double zoomLevel) = 0;
    virtual bool setGestureZoomEnabledPlatform(bool enabled) = 0;
    virtual bool setSmoothZoomPlatform(bool enabled, int durationMs) = 0;
    
    // Méthodes utilitaires
    void reportZoomChange(double oldZoom, double newZoom);
    void reportError(const std::string& errorCode, const std::string& message);
    double clampZoom(double zoom) const;

private:
    // État thread-safe
    std::atomic<bool> initialized_{false};
    std::atomic<double> currentZoom_{1.0};
    std::atomic<double> minZoom_{1.0};
    std::atomic<double> maxZoom_{10.0};
    std::atomic<bool> gestureZoomEnabled_{true};
    std::atomic<double> zoomSpeed_{1.0};
    std::atomic<bool> smoothZoomEnabled_{true};
    std::atomic<int> smoothZoomDuration_{300}; // ms
    
    // Geste de zoom
    mutable std::mutex gestureMutex_;
    bool gestureInProgress_{false};
    double gestureInitialDistance_{0.0};
    double gestureInitialZoom_{1.0};
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    ZoomChangeCallback zoomChangeCallback_;
    ErrorCallback errorCallback_;
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class ZoomControllerFactory {
public:
    static std::unique_ptr<ZoomController> create();
};

} // namespace Camera
