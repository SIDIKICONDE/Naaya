#pragma once

#include <string>
#include <functional>
#include <memory>
#include <atomic>
#include <mutex>
#include <chrono>

namespace Camera {

/**
 * Structure pour les options de capture vidéo
 */
struct VideoCaptureOptions {
    std::string quality = "high";   // "low", "medium", "high", "max"
    int maxDuration = 300;          // Durée max en secondes (0 = illimité)
    size_t maxFileSize = 0;         // Taille max en octets (0 = illimité)
    int videoBitrate = 0;           // Bitrate vidéo (0 = auto)
    int audioBitrate = 0;           // Bitrate audio (0 = auto)
    bool recordAudio = true;        // Enregistrer l'audio
    std::string codec = "H264";     // Codec vidéo
    std::string container = "mp4";  // Conteneur: "mp4" ou "mov"
    std::string audioCodec = "AAC"; // Codec audio (AAC par défaut)
    // Nouvelles options
    int width = 0;                  // Largeur souhaitée (0 = auto)
    int height = 0;                 // Hauteur souhaitée (0 = auto)
    int fps = 0;                    // FPS souhaités (0 = auto)
    std::string deviceId;           // Id du device ou "front"/"back"
    
    VideoCaptureOptions() = default;
};

/**
 * Structure pour le résultat de capture vidéo
 */
struct VideoResult {
    std::string uri;               // Chemin vers le fichier
    double duration = 0.0;         // Durée en secondes
    size_t fileSize = 0;           // Taille du fichier en octets
    int width = 0;                 // Largeur de la vidéo
    int height = 0;                // Hauteur de la vidéo
    int fps = 30;                  // Images par seconde
    std::string codec;             // Codec utilisé
    
    VideoResult() = default;
    
    VideoResult(std::string videoUri, double dur, size_t size, int w, int h)
        : uri(std::move(videoUri)), duration(dur), fileSize(size), width(w), height(h) {}
};

/**
 * Gestionnaire de capture vidéo
 * Architecture modulaire C++20
 */
class VideoCapture {
public:
    // Callbacks pour les événements
    using StartCallback = std::function<void()>;
    using StopCallback = std::function<void(const VideoResult& result)>;
    using ErrorCallback = std::function<void(const std::string& errorCode, const std::string& message)>;
    using ProgressCallback = std::function<void(double duration, size_t fileSize)>;
    
    VideoCapture();
    virtual ~VideoCapture();
    
    // Interdire la copie
    VideoCapture(const VideoCapture&) = delete;
    VideoCapture& operator=(const VideoCapture&) = delete;
    
    // Interdire le déplacement (à cause des std::mutex et std::atomic)
    VideoCapture(VideoCapture&&) = delete;
    VideoCapture& operator=(VideoCapture&&) = delete;
    
    // === CAPTURES
    bool initialize();
    
    /**
     * Libère les ressources
     */
    void shutdown();
    
    /**
     * Démarre l'enregistrement vidéo
     */
    bool startRecording(const VideoCaptureOptions& options = {});
    
    /**
     * Arrête l'enregistrement vidéo
     */
    VideoResult stopRecording();
    
    /**
     * Pause l'enregistrement (si supporté par la plateforme)
     */
    bool pauseRecording();
    
    /**
     * Reprend l'enregistrement après une pause
     */
    bool resumeRecording();
    
    /**
     * Annule l'enregistrement en cours
     */
    bool cancelRecording();
    
    /**
     * Vérifie si un enregistrement est en cours
     */
    bool isRecording() const noexcept { return isRecording_.load(); }
    
    /**
     * Vérifie si l'enregistrement est en pause
     */
    bool isPaused() const noexcept { return isPaused_.load(); }
    
    /**
     * Récupère la durée actuelle d'enregistrement
     */
    double getCurrentDuration() const;
    
    /**
     * Récupère la taille actuelle du fichier
     */
    size_t getCurrentFileSize() const;
    
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
    std::string generateFileName(const std::string& extension = "mp4") const;
    
    // === CALLBACKS ===
    
    /**
     * Définit le callback de démarrage d'enregistrement
     */
    void setStartCallback(StartCallback callback);
    
    /**
     * Définit le callback d'arrêt d'enregistrement
     */
    void setStopCallback(StopCallback callback);
    
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
    virtual bool startRecordingPlatform(const VideoCaptureOptions& options) = 0;
    virtual VideoResult stopRecordingPlatform() = 0;
    virtual bool pauseRecordingPlatform() = 0;
    virtual bool resumeRecordingPlatform() = 0;
    virtual bool cancelRecordingPlatform() = 0;
    virtual double getCurrentDurationPlatform() const = 0;
    virtual size_t getCurrentFileSizePlatform() const = 0;
    
    // Méthodes utilitaires
    void reportStart();
    void reportStop(const VideoResult& result);
    void reportError(const std::string& errorCode, const std::string& message);
    void reportProgress(double duration, size_t fileSize);
    
    // Génération de noms de fichiers
    std::string getDefaultSaveDirectory() const;
    std::string getCurrentTimestamp() const;

private:
    // État thread-safe
    std::atomic<bool> initialized_{false};
    std::atomic<bool> isRecording_{false};
    std::atomic<bool> isPaused_{false};
    
    // Timing
    std::chrono::steady_clock::time_point recordingStartTime_;
    std::chrono::steady_clock::time_point pauseStartTime_;
    std::chrono::duration<double> totalPausedDuration_{0};
    
    // Configuration
    mutable std::mutex configMutex_;
    std::string saveDirectory_;
    std::string fileNamePrefix_{"video"};
    VideoCaptureOptions currentOptions_;
    
    // Callbacks
    mutable std::mutex callbacksMutex_;
    StartCallback startCallback_;
    StopCallback stopCallback_;
    ErrorCallback errorCallback_;
    ProgressCallback progressCallback_;
};

/**
 * Factory pour créer des instances spécifiques à la plateforme
 */
class VideoCaptureFactory {
public:
    static std::unique_ptr<VideoCapture> create();
};

} // namespace Camera
