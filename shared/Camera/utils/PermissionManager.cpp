#include "PermissionManager.hpp"
#include <future>

namespace Camera {

PermissionManager::PermissionManager() = default;
PermissionManager::~PermissionManager() = default;

bool PermissionManager::initialize() {
    if (initialized_.load()) {
        return true;
    }
    try {
        const bool ok = initializePlatform();
        initialized_.store(ok);
        return ok;
    } catch (...) {
        initialized_.store(false);
        return false;
    }
}

void PermissionManager::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    try {
        shutdownPlatform();
    } catch (...) {
        // ignore
    }
    initialized_.store(false);
}

std::future<CameraPermissions> PermissionManager::checkPermissions() {
    return std::async(std::launch::async, [this]() {
        return checkPermissionsSync();
    });
}

CameraPermissions PermissionManager::checkPermissionsSync() {
    if (!initialized_.load()) {
        return CameraPermissions{};
    }
    
    try {
        auto permissions = checkPermissionsPlatform();
        
        // Mettre à jour le cache
        {
            std::lock_guard<std::mutex> lock(permissionsMutex_);
            cachedPermissions_ = permissions;
        }
        
        return permissions;
    } catch (const std::exception& e) {
        return CameraPermissions{};
    }
}

std::future<CameraPermissions> PermissionManager::requestPermissions() {
    return std::async(std::launch::async, [this]() {
        return requestPermissionsSync();
    });
}

CameraPermissions PermissionManager::requestPermissionsSync() {
    if (!initialized_.load()) {
        return CameraPermissions{};
    }
    
    try {
        auto permissions = requestPermissionsPlatform();
        
        // Mettre à jour le cache
        {
            std::lock_guard<std::mutex> lock(permissionsMutex_);
            cachedPermissions_ = permissions;
        }
        
        // Notifier le changement
        reportPermissionChange(permissions);
        
        return permissions;
    } catch (const std::exception& e) {
        return CameraPermissions{};
    }
}

std::future<PermissionStatus> PermissionManager::requestPermission(const std::string& permission) {
    return std::async(std::launch::async, [this, permission]() {
        try {
            return requestPermissionPlatform(permission);
        } catch (const std::exception& e) {
            return PermissionStatus::DENIED;
        }
    });
}

bool PermissionManager::hasRequiredPermissions() const {
    std::lock_guard<std::mutex> lock(permissionsMutex_);
    return cachedPermissions_.hasAllPermissions();
}

void PermissionManager::refreshPermissions() {
    checkPermissionsSync();
}

void PermissionManager::showPermissionAlert(const CameraPermissions& permissions) {
    try {
        showPermissionAlertPlatform(permissions);
    } catch (const std::exception& e) {
        // Log l'erreur
    }
}

bool PermissionManager::openAppSettings() {
    try {
        return openAppSettingsPlatform();
    } catch (const std::exception& e) {
        return false;
    }
}

bool PermissionManager::canRequestPermission(const std::string& permission) const {
    try {
        return canRequestPermissionPlatform(permission);
    } catch (const std::exception& e) {
        return false;
    }
}

std::string PermissionManager::getPermissionRationale(const std::string& permission) const {
    if (permission == "camera") {
        return "L'accès à la caméra est nécessaire pour prendre des photos et enregistrer des vidéos.";
    } else if (permission == "microphone") {
        return "L'accès au microphone est nécessaire pour enregistrer l'audio des vidéos.";
    } else if (permission == "storage") {
        return "L'accès au stockage est nécessaire pour sauvegarder vos photos et vidéos.";
    }
    return "Permission nécessaire pour utiliser cette fonctionnalité.";
}

void PermissionManager::setPermissionChangeCallback(PermissionChangeCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    permissionChangeCallback_ = std::move(callback);
}

void PermissionManager::setErrorCallback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    errorCallback_ = std::move(callback);
}

void PermissionManager::reportPermissionChange(const CameraPermissions& permissions) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (permissionChangeCallback_) {
        std::thread([callback = permissionChangeCallback_, permissions]() {
            callback(permissions);
        }).detach();
    }
}

void PermissionManager::reportError(const std::string& errorCode, const std::string& message) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (errorCallback_) {
        std::thread([callback = errorCallback_, errorCode, message]() {
            callback(errorCode, message);
        }).detach();
    }
}

// === IMPLÉMENTATION PAR DÉFAUT (STUB) ===

class DefaultPermissionManager : public PermissionManager {
public:
    DefaultPermissionManager() = default;
    
    // Interdire copie et déplacement
    DefaultPermissionManager(const DefaultPermissionManager&) = delete;
    DefaultPermissionManager& operator=(const DefaultPermissionManager&) = delete;
    DefaultPermissionManager(DefaultPermissionManager&&) = delete;
    DefaultPermissionManager& operator=(DefaultPermissionManager&&) = delete;

protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    
    CameraPermissions checkPermissionsPlatform() override {
        CameraPermissions permissions;
        permissions.camera = PermissionStatus::GRANTED;
        permissions.microphone = PermissionStatus::GRANTED;
        permissions.storage = PermissionStatus::GRANTED;
        return permissions;
    }
    
    CameraPermissions requestPermissionsPlatform() override {
        return checkPermissionsPlatform();
    }
    
    PermissionStatus requestPermissionPlatform(const std::string& permission) override {
        return PermissionStatus::GRANTED;
    }
    
    void showPermissionAlertPlatform(const CameraPermissions& permissions) override {}
    bool openAppSettingsPlatform() override { return true; }
    bool canRequestPermissionPlatform(const std::string& permission) const override { return true; }
};

std::unique_ptr<PermissionManager> PermissionManagerFactory::create() {
#ifdef __APPLE__
    // Sur iOS, utiliser l'implémentation spécifique
    extern std::unique_ptr<Camera::PermissionManager> createIOSPermissionManager();
    return createIOSPermissionManager();
#else
    // Implémentation par défaut pour autres plateformes
    return std::make_unique<DefaultPermissionManager>();
#endif
}

} // namespace Camera
