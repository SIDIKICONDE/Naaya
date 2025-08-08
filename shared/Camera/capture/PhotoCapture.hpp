#pragma once

#include <string>
#include <functional>
#include <memory>
#include <atomic>
#include <mutex>

namespace Camera {

/**
 * Structure pour les options de capture photo
 */
struct PhotoCaptureOptions {
    double quality = 0.9;          // Qualité de 0.0 à 1.0
    bool base64 = false;           // Inclure les données base64
    bool exif = true;              // Inclure les métadonnées EXIF
    bool skipMetadata = false;     // Ignorer toutes les métadonnées
    std::string format = "JPEG";   // Format de sortie (JPEG, PNG, etc.)
    
    PhotoCaptureOptions() = default;
};

/**
 * Structure pour le résultat de capture photo
 */
struct PhotoResult {
    std::string uri;               // Chemin vers le fichier
    int width = 0;                 // Largeur de l'image
    int height = 0;                // Hauteur de l'image
    std::string base64;            // Données base64 (optionnel)
    std::string exifData;          // Métadonnées EXIF (optionnel)
    size_t fileSize = 0;           // Taille du fichier en octets
    
    PhotoResult() = default;
    
    PhotoResult(std::string photoUri, int w, int h, size_t size = 0)
        : uri(std::move(photoUri)), width(w), height(h), fileSize(size) {}
};

/**
 * Gestionnaire de capture photo
 * Architecture modulaire C++20
 */
class PhotoCapture {
public:
    // Callbacks pour les événements
    using CaptureCallback = std::function<void(const PhotoResult& result)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    using ProgressCallback = std::function<void(double progress)>; // 0.0 à 1.0
    
    PhotoCapture();
    virtual ~PhotoCapture();
    
    // Interdire la copie
    PhotoCapture(const PhotoCapture&) = delete;
    PhotoCapture& operator=(const PhotoCapture&) = delete;
    
    // Interdire le déplacement (à cause des mutex)
    PhotoCapture(PhotoCapture&&) = delete;
    PhotoCapture& operator=(PhotoCapture&&) = delete;
    
    // === CAPTURE PHOTO ===
    
    /**
     * Initialise le système de capture
     */
    bool initialize();
    
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Capture une photo de manière asynchrone
     */
    bool capturePhoto(const PhotoCaptureOptions& options = {});
    
    /**
     * Capture une photo de manière synchrone
     */
    PhotoResult capturePhotoSync(const PhotoCaptureOptions& options = {});
    
    /**
     * Annule la capture en cours
     */
    bool cancelCapture();
    
    /**
     * Vérifie si une capture est en cours
     */
    bool isCapturing() const noexcept { return isCapturing_.load(); }
    
    // === CONFIGURATION ===
    
    /**
     * Définit le répertoire de sauvegarde
     */
    void setSaveDirectory(const std::string& directory);
    
    /**
     * Récupère le répertoire de sauvegarde
     */
    std::string getSaveDirectory() const;
    
    /**
     * Définit le préfixe des noms de fichiers
     */
    void setFileNamePrefix(const std::string& prefix);
    
    /**
     * Génère un nom de fichier unique
     */
    std::string generateFileName(const std::string& extension = "jpg") const;
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de capture réussie
     */
    void setCaptureCallback(CaptureCallback callback);
    
    /**
     * Définit le callback d'erreur
     */
    void setErrorCallback(ErrorCallback callback);
    
    /**
     * Définit le callback de progression
     */
    void setProgressCallback(ProgressCallback callback);

protected:
    // Interface pour les implémentations spécifiques à la plateforme
    virtual bool initializePlatform() = 0;
    virtual void shutdownPlatform() = 0;
    virtual PhotoResult capturePhotoPlatform(const PhotoCaptureOptions& options) = 0;
    virtual bool cancelCapturePlatform() = 0;
    
    // Méthodes utilitaires
    void reportCapture(const PhotoResult& result);
    void reportError(const std::string& errorCode, const std::string& message);
    void reportProgress(double progress);
    
    // Génération de noms de fichiers
    std::string getDefaultSaveDirectory() const;
    std::string getCurrentTimestamp() const;

private:
    // État thread-safe
    std::atomic<bool> initialized_{false};
    std::atomic<bool> isCapturing_{false};
    
    // Configuration
    mutable std::mutex configMutex_;
    std::string saveDirectory_;
    std::string fileNamePrefix_{"photo"};
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    CaptureCallback captureCallback_;
    ErrorCallback errorCallback_;
    ProgressCallback progressCallback_;
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class PhotoCaptureFactory {
public:
    static std::unique_ptr<PhotoCapture> create();
};

} // namespace Camera
