#pragma once

#include <string>
#include <functional>
#include <atomic>
#include <mutex>
#include "../common/Types.hpp"

namespace Camera {

/**
 * Contrôleur de flash et torche
 * Architecture modulaire C++20
 */
class FlashController {
public:
    // Callbacks pour les événements
    using ModeChangeCallback = std::function<void(FlashMode oldMode, FlashMode newMode)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    
    FlashController();
    virtual ~FlashController();
    
    // Interdire la copie
    FlashController(const FlashController&) = delete;
    FlashController& operator=(const FlashController&) = delete;
    
    // Interdire le déplacement (à cause des std::mutex et std::atomic)
    FlashController(FlashController&&) = delete;
    FlashController& operator=(FlashController&&) = delete;
    
    // === CONTRÔLE DU FLASH ===
    
    /**
     * Initialise le contrôleur de flash
     */
    bool initialize();
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Vérifie si le dispositif a un flash
     */
    bool hasFlash() const;
    
    /**
     * Définit le mode de flash
     */
    bool setFlashMode(FlashMode mode);
    
    /**
     * Récupère le mode de flash actuel
     */
    FlashMode getFlashMode() const noexcept { return currentMode_.load(); }
    
    /**
     * Active/désactive la torche
     */
    bool setTorchEnabled(bool enabled);
    
    /**
     * Vérifie si la torche est activée
     */
    bool isTorchEnabled() const noexcept { return torchEnabled_.load(); }
    
    /**
     * Bascule la torche (on/off)
     */
    bool toggleTorch();
    
    /**
     * Déclenche le flash manuellement (pour photo)
     */
    bool triggerFlash();
    
    // === CONFIGURATION ===
    
    /**
     * Définit l'intensité du flash (0.0 à 1.0)
     */
    bool setFlashIntensity(double intensity);
    
    /**
     * Récupère l'intensité du flash
     */
    double getFlashIntensity() const;
    
    /**
     * Vérifie si l'intensité variable est supportée
     */
    bool supportsVariableIntensity() const;
    
    // === UTILITAIRES ===
    
    /**
     * Convertit un mode de flash en string
     */
    static std::string flashModeToString(FlashMode mode);
    
    /**
     * Convertit un string en mode de flash
     */
    static FlashMode stringToFlashMode(const std::string& modeStr);
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de changement de mode
     */
    void setModeChangeCallback(ModeChangeCallback callback);
    
    /**
     * Définit le callback d'erreur
     */
    void setErrorCallback(ErrorCallback callback);

protected:
    // Interface pour les implémentations spécifiques à la plateforme
    virtual bool initializePlatform() = 0;
    virtual void shutdownPlatform() = 0;
    virtual bool hasFlashPlatform() const = 0;
    virtual bool setFlashModePlatform(FlashMode mode) = 0;
    virtual bool setTorchEnabledPlatform(bool enabled) = 0;
    virtual bool triggerFlashPlatform() = 0;
    virtual bool setFlashIntensityPlatform(double intensity) = 0;
    virtual double getFlashIntensityPlatform() const = 0;
    virtual bool supportsVariableIntensityPlatform() const = 0;
    
    // Méthodes utilitaires
    void reportModeChange(FlashMode oldMode, FlashMode newMode);
    void reportError(const std::string& errorCode, const std::string& message);

private:
    // État thread-safe
    std::atomic<bool> initialized_{false};
    std::atomic<FlashMode> currentMode_{FlashMode::OFF};
    std::atomic<bool> torchEnabled_{false};
    std::atomic<double> flashIntensity_{1.0};
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    ModeChangeCallback modeChangeCallback_;
    ErrorCallback errorCallback_;
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class FlashControllerFactory {
public:
    static std::unique_ptr<FlashController> create();
};

} // namespace Camera
