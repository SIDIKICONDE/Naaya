#pragma once

#include <memory>
#include <vector>
#include <string>
#include <functional>
#include <atomic>
#include <mutex>
#include "../common/Types.hpp"
#include "../capture/PhotoCapture.hpp"
#include "../capture/VideoCapture.hpp"

namespace Camera {

/**
 * Structure représentant un dispositif caméra
 * Conforme aux directives ISO C++20
 */
struct CameraDevice {
    std::string id;
    std::string name;
    std::string position; // "front" ou "back"
    bool hasFlash;
    bool isAvailable;
    
    // Constructeur par défaut C++20
    CameraDevice() = default;
    
    // Constructeur avec paramètres
    CameraDevice(std::string deviceId, std::string deviceName, 
                std::string devicePosition, bool flashAvailable, bool available = true)
        : id(std::move(deviceId))
        , name(std::move(deviceName))
        , position(std::move(devicePosition))
        , hasFlash(flashAvailable)
        , isAvailable(available) {}
};

/**
 * Structure pour les formats de caméra
 */
struct CameraFormat {
    int width;
    int height;
    int fps;
    std::string pixelFormat;
    
    CameraFormat() = default;
    
    CameraFormat(int w, int h, int frameRate, std::string format)
        : width(w), height(h), fps(frameRate), pixelFormat(std::move(format)) {}
};

/**
 * Énumération pour les états de la caméra
 */
enum class CameraState {
    INACTIVE,
    INITIALIZING,
    ACTIVE,
    CAPTURING,
    RECORDING,
    ERROR
};

// FlashMode est défini dans FlashController.hpp

/**
 * Gestionnaire principal de caméra
 * Architecture modulaire inspirée du module audio
 */
class CameraManager {
public:
    // Callbacks pour les événements
    using StateChangeCallback = std::function<void(CameraState oldState, CameraState newState)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    
    CameraManager();
    virtual ~CameraManager();
    
    // Interdire la copie (RAII C++20)
    CameraManager(const CameraManager&) = delete;
    CameraManager& operator=(const CameraManager&) = delete;
    
    // Interdire le déplacement (à cause des mutex)
    CameraManager(CameraManager&&) = delete;
    CameraManager& operator=(CameraManager&&) = delete;
    
    // === GESTION DES DISPOSITIFS ===
    
    /**
     * Initialise le gestionnaire de caméra
     */
    bool initialize();
    
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Récupère la liste des dispositifs disponibles
     */
    std::vector<CameraDevice> getAvailableDevices() const;
    
    /**
     * Sélectionne un dispositif par ID
     */
    bool selectDevice(const std::string& deviceId);
    
    /**
     * Sélectionne un dispositif par position
     */
    bool selectDeviceByPosition(const std::string& position);
    
    /**
     * Récupère le dispositif actuellement sélectionné
     */
    const CameraDevice* getCurrentDevice() const;
    
    // === CONTRÔLE DE LA CAMÉRA ===
    
    /**
     * Démarre la caméra
     */
    bool startCamera();
    
    /**
     * Arrête la caméra
     */
    bool stopCamera();
    
    /**
     * Vérifie si la caméra est active
     */
    bool isActive() const noexcept { return state_.load() == CameraState::ACTIVE; }
    
    /**
     * Récupère l'état actuel
     */
    CameraState getState() const noexcept { return state_.load(); }
    
    // === FORMATS ET CONFIGURATION ===
    
    /**
     * Récupère les formats supportés par le dispositif actuel
     */
    std::vector<CameraFormat> getSupportedFormats() const;
    
    /**
     * Définit le format de capture
     */
    bool setFormat(const CameraFormat& format);
    
    /**
     * Récupère le format actuel
     */
    const CameraFormat* getCurrentFormat() const;
    
    /**
     * Récupère la taille de prévisualisation
     */
    std::pair<int, int> getPreviewSize() const;
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de changement d'état
     */
    void setStateChangeCallback(StateChangeCallback callback);
    
    /**
     * Définit le callback d'erreur
     */
    void setErrorCallback(ErrorCallback callback);

    // === CONTRÔLES AVANCÉS ===
    
    /**
     * Définit le niveau de zoom
     */
    bool setZoomLevel(double level);
    
    /**
     * Récupère le niveau de zoom actuel
     */
    double getZoomLevel() const;
    
    /**
     * Définit le mode flash
     */
    bool setFlashMode(FlashMode mode);
    
    /**
     * Récupère le mode flash actuel
     */
    FlashMode getFlashMode() const;
    
    /**
     * Active/désactive la torche
     */
    bool setTorchMode(bool enabled);
    
    /**
     * Vérifie si la torche est active
     */
    bool getTorchMode() const;
    
    /**
     * Définit le timer de capture (en secondes)
     */
    bool setTimer(int seconds);
    
    /**
     * Récupère le timer actuel (en secondes)
     */
    int getTimer() const;

protected:
    // Interface pour les implémentations spécifiques à la plateforme
    virtual bool initializePlatform() = 0;
    virtual void shutdownPlatform() = 0;
    virtual std::vector<CameraDevice> enumerateDevices() = 0;
    virtual bool selectDevicePlatform(const std::string& deviceId) = 0;
    virtual bool startCameraPlatform() = 0;
    virtual bool stopCameraPlatform() = 0;
    virtual bool isActivePlatform() const = 0;
    virtual std::vector<CameraFormat> getSupportedFormatsPlatform() const = 0;
    virtual bool setFormatPlatform(const CameraFormat& format) = 0;
    
    // Contrôles avancés
    virtual bool setZoomLevelPlatform(double level) = 0;
    virtual double getZoomLevelPlatform() const = 0;
    virtual bool setFlashModePlatform(FlashMode mode) = 0;
    virtual FlashMode getFlashModePlatform() const = 0;
    virtual bool setTorchModePlatform(bool enabled) = 0;
    virtual bool getTorchModePlatform() const = 0;
    
    // Contrôle du timer
    virtual bool setTimerPlatform(int seconds) = 0;
    virtual int getTimerPlatform() const = 0;
    
    // Capture
    virtual bool capturePhotoPlatform(const PhotoCaptureOptions& options) = 0;
    virtual bool startRecordingPlatform(const VideoCaptureOptions& options) = 0;
    virtual bool stopRecordingPlatform() = 0;
    virtual bool isRecordingPlatform() const = 0;
    
    // Méthodes utilitaires
    void setState(CameraState newState);
    void reportError(const std::string& errorCode, const std::string& message);
    
private:
    // État thread-safe
    std::atomic<CameraState> state_{CameraState::INACTIVE};
    
    // Dispositifs et formats
    mutable std::mutex devicesMutex_;
    std::vector<CameraDevice> availableDevices_;
    std::unique_ptr<CameraDevice> currentDevice_;
    std::unique_ptr<CameraFormat> currentFormat_;
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    StateChangeCallback stateChangeCallback_;
    ErrorCallback errorCallback_;
    
    // État d'initialisation
    std::atomic<bool> initialized_{false};
    
    // Contrôles avancés
    std::atomic<int> timerSeconds_{0};
    std::atomic<double> zoomLevel_{1.0};
    std::atomic<FlashMode> flashMode_{FlashMode::OFF};
    std::atomic<bool> torchEnabled_{false};
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class CameraManagerFactory {
public:
    static std::unique_ptr<CameraManager> create();
};

} // namespace Camera
