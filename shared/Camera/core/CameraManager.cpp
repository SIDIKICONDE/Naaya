#include "CameraManager.hpp"
#include <algorithm>
#include <thread>
#include <iostream>

namespace Camera {

CameraManager::CameraManager() = default;

CameraManager::~CameraManager() {
    if (initialized_.load()) {
        shutdown();
    }
}

bool CameraManager::initialize() {
    if (initialized_.load()) {
        return true;
    }
    
    setState(CameraState::INITIALIZING);
    
    try {
        std::cout << "[DEBUG] CameraManager::initialize: Appel initializePlatform..." << std::endl;
        if (!initializePlatform()) {
            reportError("INIT_PLATFORM_FAILED", "Échec de l'initialisation de la plateforme");
            setState(CameraState::ERROR);
            return false;
        }
        
        // Énumérer les dispositifs disponibles
        {
            std::lock_guard<std::mutex> lock(devicesMutex_);
            std::cout << "[DEBUG] CameraManager::initialize: Appel enumerateDevices..." << std::endl;
            availableDevices_ = enumerateDevices();
            std::cout << "[DEBUG] CameraManager::initialize: " << availableDevices_.size() << " dispositifs trouvés" << std::endl;
        }
        
        initialized_ = true;
        setState(CameraState::INACTIVE);
        
        return true;
        
    } catch (const std::exception& e) {
        reportError("INIT_EXCEPTION", std::string("Exception lors de l'initialisation: ") + e.what());
        setState(CameraState::ERROR);
        return false;
    }
}

void CameraManager::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    
    // Arrêter la caméra si active
    if (isActive()) {
        stopCamera();
    }
    
    try {
        shutdownPlatform();
        
        // Nettoyer les ressources
        {
            std::lock_guard<std::mutex> lock(devicesMutex_);
            availableDevices_.clear();
            currentDevice_.reset();
            currentFormat_.reset();
        }
        
        // Nettoyer les callbacks
        {
            std::lock_guard<std::mutex> lock(callbacksMutex_);
            stateChangeCallback_ = nullptr;
            errorCallback_ = nullptr;
        }
        
        initialized_ = false;
        setState(CameraState::INACTIVE);
        
    } catch (const std::exception& e) {
        reportError("SHUTDOWN_EXCEPTION", std::string("Exception lors de l'arrêt: ") + e.what());
    }
}

std::vector<CameraDevice> CameraManager::getAvailableDevices() const {
    std::lock_guard<std::mutex> lock(devicesMutex_);
    return availableDevices_;
}

bool CameraManager::selectDevice(const std::string& deviceId) {
    if (!initialized_.load()) {
        reportError("NOT_INITIALIZED", "Gestionnaire de caméra non initialisé");
        return false;
    }
    
    // Vérifier que le dispositif existe
    {
        std::lock_guard<std::mutex> lock(devicesMutex_);
        auto it = std::find_if(availableDevices_.begin(), availableDevices_.end(),
                              [&deviceId](const CameraDevice& device) {
                                  return device.id == deviceId && device.isAvailable;
                              });
        
        if (it == availableDevices_.end()) {
            reportError("DEVICE_NOT_FOUND", "Dispositif non trouvé ou non disponible: " + deviceId);
            return false;
        }
        
        // Arrêter la caméra actuelle si active
        if (isActive()) {
            stopCamera();
        }
        
        // Sélectionner le nouveau dispositif
        if (!selectDevicePlatform(deviceId)) {
            reportError("DEVICE_SELECT_FAILED", "Échec de la sélection du dispositif: " + deviceId);
            return false;
        }
        
        // Mettre à jour le dispositif actuel
        currentDevice_ = std::make_unique<CameraDevice>(*it);
        currentFormat_.reset(); // Réinitialiser le format
    }
    
    return true;
}

bool CameraManager::selectDeviceByPosition(const std::string& position) {
    std::lock_guard<std::mutex> lock(devicesMutex_);
    
    auto it = std::find_if(availableDevices_.begin(), availableDevices_.end(),
                          [&position](const CameraDevice& device) {
                              return device.position == position && device.isAvailable;
                          });
    
    if (it != availableDevices_.end()) {
        // Libérer le verrou avant d'appeler selectDevice pour éviter le deadlock
        std::string deviceId = it->id;
        return selectDevice(deviceId);
    }
    
    reportError("POSITION_NOT_FOUND", "Aucun dispositif disponible pour la position: " + position);
    return false;
}

const CameraDevice* CameraManager::getCurrentDevice() const {
    std::lock_guard<std::mutex> lock(devicesMutex_);
    return currentDevice_.get();
}

bool CameraManager::startCamera() {
    if (!initialized_.load()) {
        reportError("NOT_INITIALIZED", "Gestionnaire de caméra non initialisé");
        return false;
    }
    
    if (isActive()) {
        return true; // Déjà active
    }
    
    {
        std::lock_guard<std::mutex> lock(devicesMutex_);
        if (!currentDevice_) {
            reportError("NO_DEVICE_SELECTED", "Aucun dispositif sélectionné");
            return false;
        }
    }
    
    try {
        if (!startCameraPlatform()) {
            reportError("START_CAMERA_FAILED", "Échec du démarrage de la caméra");
            return false;
        }
        
        setState(CameraState::ACTIVE);
        return true;
        
    } catch (const std::exception& e) {
        reportError("START_CAMERA_EXCEPTION", std::string("Exception lors du démarrage: ") + e.what());
        setState(CameraState::ERROR);
        return false;
    }
}

bool CameraManager::stopCamera() {
    if (!isActive()) {
        return true; // Déjà arrêtée
    }
    
    try {
        if (!stopCameraPlatform()) {
            reportError("STOP_CAMERA_FAILED", "Échec de l'arrêt de la caméra");
            return false;
        }
        
        setState(CameraState::INACTIVE);
        return true;
        
    } catch (const std::exception& e) {
        reportError("STOP_CAMERA_EXCEPTION", std::string("Exception lors de l'arrêt: ") + e.what());
        setState(CameraState::ERROR);
        return false;
    }
}

std::vector<CameraFormat> CameraManager::getSupportedFormats() const {
    if (!initialized_.load()) {
        return {};
    }
    
    {
        std::lock_guard<std::mutex> lock(devicesMutex_);
        if (!currentDevice_) {
            return {};
        }
    }
    
    try {
        return getSupportedFormatsPlatform();
    } catch (const std::exception& e) {
        return {};
    }
}

bool CameraManager::setFormat(const CameraFormat& format) {
    if (!initialized_.load()) {
        reportError("NOT_INITIALIZED", "Gestionnaire de caméra non initialisé");
        return false;
    }
    
    {
        std::lock_guard<std::mutex> lock(devicesMutex_);
        if (!currentDevice_) {
            reportError("NO_DEVICE_SELECTED", "Aucun dispositif sélectionné");
            return false;
        }
    }
    
    try {
        if (!setFormatPlatform(format)) {
            reportError("SET_FORMAT_FAILED", "Échec de la définition du format");
            return false;
        }
        
        {
            std::lock_guard<std::mutex> lock(devicesMutex_);
            currentFormat_ = std::make_unique<CameraFormat>(format);
        }
        
        return true;
        
    } catch (const std::exception& e) {
        reportError("SET_FORMAT_EXCEPTION", std::string("Exception lors de la définition du format: ") + e.what());
        return false;
    }
}

const CameraFormat* CameraManager::getCurrentFormat() const {
    std::lock_guard<std::mutex> lock(devicesMutex_);
    return currentFormat_.get();
}

std::pair<int, int> CameraManager::getPreviewSize() const {
    std::lock_guard<std::mutex> lock(devicesMutex_);
    
    if (currentFormat_) {
        return {currentFormat_->width, currentFormat_->height};
    }
    
    // Taille par défaut
    return {1920, 1080};
}

void CameraManager::setStateChangeCallback(StateChangeCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    stateChangeCallback_ = std::move(callback);
}

void CameraManager::setErrorCallback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    errorCallback_ = std::move(callback);
}

// === MÉTHODES PROTÉGÉES ===

void CameraManager::setState(CameraState newState) {
    CameraState oldState = state_.exchange(newState);
    
    if (oldState != newState) {
        std::lock_guard<std::mutex> lock(callbacksMutex_);
        if (stateChangeCallback_) {
            // Exécuter le callback dans un thread séparé pour éviter les blocages
            std::thread([callback = stateChangeCallback_, oldState, newState]() {
                callback(oldState, newState);
            }).detach();
        }
    }
}

void CameraManager::reportError(const std::string& errorCode, const std::string& message) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (errorCallback_) {
        // Exécuter le callback dans un thread séparé pour éviter les blocages
        std::thread([callback = errorCallback_, errorCode, message]() {
            callback(errorCode, message);
        }).detach();
    }
}

// === IMPLÉMENTATION PAR DÉFAUT (STUB) ===

class DefaultCameraManager : public CameraManager {
public:
    DefaultCameraManager() = default;
    
    // Interdire copie et déplacement
    DefaultCameraManager(const DefaultCameraManager&) = delete;
    DefaultCameraManager& operator=(const DefaultCameraManager&) = delete;
    DefaultCameraManager(DefaultCameraManager&&) = delete;
    DefaultCameraManager& operator=(DefaultCameraManager&&) = delete;

protected:
    bool initializePlatform() override {
        // Implémentation stub - retourne toujours true
        return true;
    }
    
    void shutdownPlatform() override {
        // Implémentation stub
    }
    
    std::vector<CameraDevice> enumerateDevices() override {
        // Retourner des dispositifs factices pour les tests
        return {
            CameraDevice{"back_camera", "Caméra arrière", "back", true, true},
            CameraDevice{"front_camera", "Caméra avant", "front", false, true}
        };
    }
    
    bool selectDevicePlatform(const std::string& deviceId) override {
        // Implémentation stub
        return true;
    }
    
    bool startCameraPlatform() override {
        // Implémentation stub
        return true;
    }
    
    bool stopCameraPlatform() override {
        // Implémentation stub
        return true;
    }
    
    std::vector<CameraFormat> getSupportedFormatsPlatform() const override {
        // Retourner des formats factices
        return {
            CameraFormat{1920, 1080, 30, "YUV420"},
            CameraFormat{1280, 720, 60, "YUV420"}
        };
    }
    
    bool setFormatPlatform(const CameraFormat& format) override {
        // Implémentation stub
        return true;
    }
  
  // ==== Ajouts Android (stubs) pour compléter l'abstraction ====
  bool isActivePlatform() const override { return false; }
  
  bool setZoomLevelPlatform(double /*level*/) override { return true; }
  double getZoomLevelPlatform() const override { return 1.0; }
  
  bool setFlashModePlatform(FlashMode /*mode*/) override { return true; }
  FlashMode getFlashModePlatform() const override { return FlashMode::OFF; }
  
  bool setTorchModePlatform(bool /*enabled*/) override { return false; }
  bool getTorchModePlatform() const override { return false; }
  
  bool capturePhotoPlatform(const PhotoCaptureOptions& /*options*/) override { return true; }
  bool startRecordingPlatform(const VideoCaptureOptions& /*options*/) override { return true; }
  bool stopRecordingPlatform() override { return true; }
  bool isRecordingPlatform() const override { return false; }
};

std::unique_ptr<CameraManager> CameraManagerFactory::create() {
#ifdef __APPLE__
    // Sur iOS, utiliser l'implémentation native AVFoundation
    std::cout << "[DEBUG] CameraManagerFactory::create - Création pour iOS" << std::endl;
    extern std::unique_ptr<CameraManager> createIOSCameraManager();
    return createIOSCameraManager();
#else
    // Implémentation par défaut pour autres plateformes
    std::cout << "[DEBUG] CameraManagerFactory::create - Création par défaut" << std::endl;
    return std::make_unique<DefaultCameraManager>();
#endif
}

} // namespace Camera