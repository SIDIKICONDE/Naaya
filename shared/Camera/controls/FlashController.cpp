#include "FlashController.hpp"

namespace Camera {

FlashController::FlashController() = default;
FlashController::~FlashController() = default;

bool FlashController::initialize() { 
    // Initialisation réussie par défaut
    return true; 
}

void FlashController::shutdown() {
    // Nettoyage des ressources
}

bool FlashController::hasFlash() const { 
    // Vérifier si le dispositif a un flash
    // Cette méthode sera surchargée par les implémentations spécifiques
    return true; 
}

bool FlashController::setFlashMode(FlashMode mode) { 
    // Mettre à jour l'état local
    currentMode_ = mode; 
    
    // Log pour debug
    printf("[FlashController] setFlashMode: %s\n", flashModeToString(mode).c_str());
    
    return true; 
}

bool FlashController::setTorchEnabled(bool enabled) { 
    // Mettre à jour l'état local
    torchEnabled_ = enabled; 
    
    // Log pour debug
    printf("[FlashController] setTorchEnabled: %s\n", enabled ? "true" : "false");
    
    return true; 
}

bool FlashController::toggleTorch() { 
    return setTorchEnabled(!torchEnabled_.load()); 
}

bool FlashController::triggerFlash() { 
    // Déclencher le flash pour une photo
    printf("[FlashController] triggerFlash appelé\n");
    return true; 
}

bool FlashController::setFlashIntensity(double intensity) { 
    // Limiter l'intensité entre 0.0 et 1.0
    if (intensity < 0.0) intensity = 0.0;
    if (intensity > 1.0) intensity = 1.0;
    
    flashIntensity_ = intensity; 
    printf("[FlashController] setFlashIntensity: %.2f\n", intensity);
    return true; 
}

double FlashController::getFlashIntensity() const { 
    return flashIntensity_.load(); 
}

bool FlashController::supportsVariableIntensity() const { 
    // Vérifier si l'intensité variable est supportée
    return true; 
}

std::string FlashController::flashModeToString(FlashMode mode) {
    switch (mode) {
        case FlashMode::OFF: return "off";
        case FlashMode::ON: return "on";
        case FlashMode::AUTO: return "auto";
        case FlashMode::TORCH: return "torch";
        default: return "off";
    }
}

FlashMode FlashController::stringToFlashMode(const std::string& modeStr) {
    if (modeStr == "on") return FlashMode::ON;
    if (modeStr == "auto") return FlashMode::AUTO;
    if (modeStr == "torch") return FlashMode::TORCH;
    return FlashMode::OFF;
}

void FlashController::setModeChangeCallback(ModeChangeCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    modeChangeCallback_ = callback;
}

void FlashController::setErrorCallback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    errorCallback_ = callback;
}

void FlashController::reportModeChange(FlashMode oldMode, FlashMode newMode) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (modeChangeCallback_) {
        modeChangeCallback_(oldMode, newMode);
    }
}

void FlashController::reportError(const std::string& errorCode, const std::string& message) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (errorCallback_) {
        errorCallback_(errorCode, message);
    }
}

} // namespace Camera
