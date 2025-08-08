#pragma once

#include <string>
#include <unordered_map>
#include <functional>
#include <future>
#include <atomic>
#include <mutex>

namespace Camera {

/**
 * Énumération pour les statuts de permission
 */
enum class PermissionStatus {
    NOT_DETERMINED,  // Permission non demandée
    GRANTED,         // Permission accordée
    DENIED,          // Permission refusée
    RESTRICTED       // Permission restreinte (iOS)
};

/**
 * Structure pour les permissions de caméra
 */
struct CameraPermissions {
    PermissionStatus camera = PermissionStatus::NOT_DETERMINED;
    PermissionStatus microphone = PermissionStatus::NOT_DETERMINED;
    PermissionStatus storage = PermissionStatus::NOT_DETERMINED;
    
    CameraPermissions() = default;
    
    /**
     * Vérifie si toutes les permissions nécessaires sont accordées
     */
    bool hasAllPermissions() const noexcept {
        return camera == PermissionStatus::GRANTED && 
               microphone == PermissionStatus::GRANTED && 
               storage == PermissionStatus::GRANTED;
    }
    
    /**
     * Vérifie si au moins la permission caméra est accordée
     */
    bool hasCameraPermission() const noexcept {
        return camera == PermissionStatus::GRANTED;
    }
    
    /**
     * Convertit en map string pour JSI
     */
    std::unordered_map<std::string, std::string> toStringMap() const {
        return {
            {"camera", permissionStatusToString(camera)},
            {"microphone", permissionStatusToString(microphone)},
            {"storage", permissionStatusToString(storage)}
        };
    }
    
    /**
     * Crée depuis une map string
     */
    static CameraPermissions fromStringMap(const std::unordered_map<std::string, std::string>& map) {
        CameraPermissions permissions;
        
        auto cameraIt = map.find("camera");
        if (cameraIt != map.end()) {
            permissions.camera = stringToPermissionStatus(cameraIt->second);
        }
        
        auto micIt = map.find("microphone");
        if (micIt != map.end()) {
            permissions.microphone = stringToPermissionStatus(micIt->second);
        }
        
        auto storageIt = map.find("storage");
        if (storageIt != map.end()) {
            permissions.storage = stringToPermissionStatus(storageIt->second);
        }
        
        return permissions;
    }

private:
    static std::string permissionStatusToString(PermissionStatus status) {
        switch (status) {
            case PermissionStatus::NOT_DETERMINED: return "not-determined";
            case PermissionStatus::GRANTED: return "granted";
            case PermissionStatus::DENIED: return "denied";
            case PermissionStatus::RESTRICTED: return "restricted";
            default: return "not-determined";
        }
    }
    
    static PermissionStatus stringToPermissionStatus(const std::string& str) {
        if (str == "granted") return PermissionStatus::GRANTED;
        if (str == "denied") return PermissionStatus::DENIED;
        if (str == "restricted") return PermissionStatus::RESTRICTED;
        return PermissionStatus::NOT_DETERMINED;
    }
};

/**
 * Gestionnaire de permissions
 * Architecture modulaire C++20
 */
class PermissionManager {
public:
    // Callbacks pour les événements
    using PermissionChangeCallback = std::function<void(const CameraPermissions& permissions)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    
    PermissionManager();
    virtual ~PermissionManager();
    
    // Interdire la copie
    PermissionManager(const PermissionManager&) = delete;
    PermissionManager& operator=(const PermissionManager&) = delete;
    
    // Permettre le déplacement (implémentation personnalisée pour les mutex)
    PermissionManager(PermissionManager&&) noexcept = delete;
    PermissionManager& operator=(PermissionManager&&) noexcept = delete;
    
    // === GESTION DES PERMISSIONS ===
    
    /**
     * Initialise le gestionnaire de permissions
     */
    bool initialize();
    
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Vérifie les permissions actuelles (asynchrone)
     */
    std::future<CameraPermissions> checkPermissions();
    
    /**
     * Vérifie les permissions actuelles (synchrone)
     */
    CameraPermissions checkPermissionsSync();
    
    /**
     * Demande les permissions nécessaires (asynchrone)
     */
    std::future<CameraPermissions> requestPermissions();
    
    /**
     * Demande les permissions nécessaires (synchrone)
     */
    CameraPermissions requestPermissionsSync();
    
    /**
     * Demande une permission spécifique
     */
    std::future<PermissionStatus> requestPermission(const std::string& permission);
    
    /**
     * Vérifie si les permissions sont accordées
     */
    bool hasRequiredPermissions() const;
    
    /**
     * Force la vérification des permissions depuis le système
     */
    void refreshPermissions();
    
    // === UTILITAIRES ===
    
    /**
     * Affiche une alerte de permission refusée
     */
    void showPermissionAlert(const CameraPermissions& permissions);
    
    /**
     * Ouvre les paramètres de l'application
     */
    bool openAppSettings();
    
    /**
     * Vérifie si une permission peut être demandée
     */
    bool canRequestPermission(const std::string& permission) const;
    
    /**
     * Récupère le message d'explication pour une permission
     */
    std::string getPermissionRationale(const std::string& permission) const;
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de changement de permissions
     */
    void setPermissionChangeCallback(PermissionChangeCallback callback);
    
    /**
     * Définit le callback d'erreur
     */
    void setErrorCallback(ErrorCallback callback);

protected:
    // Interface pour les implémentations spécifiques à la plateforme
    virtual bool initializePlatform() = 0;
    virtual void shutdownPlatform() = 0;
    virtual CameraPermissions checkPermissionsPlatform() = 0;
    virtual CameraPermissions requestPermissionsPlatform() = 0;
    virtual PermissionStatus requestPermissionPlatform(const std::string& permission) = 0;
    virtual void showPermissionAlertPlatform(const CameraPermissions& permissions) = 0;
    virtual bool openAppSettingsPlatform() = 0;
    virtual bool canRequestPermissionPlatform(const std::string& permission) const = 0;
    
    // Méthodes utilitaires
    void reportPermissionChange(const CameraPermissions& permissions);
    void reportError(const std::string& errorCode, const std::string& message);

private:
    // État thread-safe
    std::atomic<bool> initialized_{false};
    
    // Cache des permissions
    mutable std::mutex permissionsMutex_;
    CameraPermissions cachedPermissions_;
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    PermissionChangeCallback permissionChangeCallback_;
    ErrorCallback errorCallback_;
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class PermissionManagerFactory {
public:
    static std::unique_ptr<PermissionManager> create();
};

} // namespace Camera
