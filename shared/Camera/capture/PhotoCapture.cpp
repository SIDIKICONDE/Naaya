#include "PhotoCapture.hpp"
#include <chrono>
#include <sstream>
#include <iomanip>
#include <thread>
#include <cstdlib>

namespace Camera {

PhotoCapture::PhotoCapture() = default;

PhotoCapture::~PhotoCapture() {
    if (initialized_.load()) {
        shutdown();
    }
}

bool PhotoCapture::initialize() {
    if (initialized_.load()) {
        return true;
    }
    
    try {
        if (!initializePlatform()) {
            return false;
        }
        
        // Définir le répertoire de sauvegarde par défaut
        {
            std::lock_guard<std::mutex> lock(configMutex_);
            if (saveDirectory_.empty()) {
                saveDirectory_ = getDefaultSaveDirectory();
            }
        }
        
        initialized_ = true;
        return true;
        
    } catch (const std::exception& e) {
        return false;
    }
}

void PhotoCapture::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    
    // Annuler toute capture en cours
    if (isCapturing_.load()) {
        cancelCapture();
    }
    
    try {
        shutdownPlatform();
        
        // Nettoyer les callbacks
        {
            std::lock_guard<std::mutex> lock(callbacksMutex_);
            captureCallback_ = nullptr;
            errorCallback_ = nullptr;
            progressCallback_ = nullptr;
        }
        
        initialized_ = false;
        
    } catch (const std::exception& e) {
        // Log l'erreur mais continuer l'arrêt
    }
}

bool PhotoCapture::capturePhoto(const PhotoCaptureOptions& options) {
    if (!initialized_.load()) {
        reportError("NOT_INITIALIZED", "PhotoCapture non initialisé");
        return false;
    }
    
    if (isCapturing_.load()) {
        reportError("CAPTURE_IN_PROGRESS", "Une capture est déjà en cours");
        return false;
    }
    
    // Lancer la capture dans un thread séparé
    std::thread([this, options]() {
        try {
            isCapturing_ = true;
            reportProgress(0.0);
            
            auto result = capturePhotoPlatform(options);
            
            reportProgress(1.0);
            reportCapture(result);
            
        } catch (const std::exception& e) {
            reportError("CAPTURE_FAILED", e.what());
        }
        
        isCapturing_ = false;
    }).detach();
    
    return true;
}

PhotoResult PhotoCapture::capturePhotoSync(const PhotoCaptureOptions& options) {
    if (!initialized_.load()) {
        throw std::runtime_error("PhotoCapture non initialisé");
    }
    
    if (isCapturing_.load()) {
        throw std::runtime_error("Une capture est déjà en cours");
    }
    
    try {
        isCapturing_ = true;
        auto result = capturePhotoPlatform(options);
        isCapturing_ = false;
        return result;
        
    } catch (...) {
        isCapturing_ = false;
        throw;
    }
}

bool PhotoCapture::cancelCapture() {
    if (!isCapturing_.load()) {
        return true; // Rien à annuler
    }
    
    try {
        bool success = cancelCapturePlatform();
        isCapturing_ = false;
        return success;
        
    } catch (const std::exception& e) {
        reportError("CANCEL_FAILED", e.what());
        return false;
    }
}

void PhotoCapture::setSaveDirectory(const std::string& directory) {
    std::lock_guard<std::mutex> lock(configMutex_);
    saveDirectory_ = directory;
}

std::string PhotoCapture::getSaveDirectory() const {
    std::lock_guard<std::mutex> lock(configMutex_);
    return saveDirectory_;
}

void PhotoCapture::setFileNamePrefix(const std::string& prefix) {
    std::lock_guard<std::mutex> lock(configMutex_);
    fileNamePrefix_ = prefix;
}

std::string PhotoCapture::generateFileName(const std::string& extension) const {
    std::lock_guard<std::mutex> lock(configMutex_);
    
    std::string timestamp = getCurrentTimestamp();
    return fileNamePrefix_ + "_" + timestamp + "." + extension;
}

void PhotoCapture::setCaptureCallback(CaptureCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    captureCallback_ = std::move(callback);
}

void PhotoCapture::setErrorCallback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    errorCallback_ = std::move(callback);
}

void PhotoCapture::setProgressCallback(ProgressCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    progressCallback_ = std::move(callback);
}

// === MÉTHODES PROTÉGÉES ===

void PhotoCapture::reportCapture(const PhotoResult& result) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (captureCallback_) {
        std::thread([callback = captureCallback_, result]() {
            callback(result);
        }).detach();
    }
}

void PhotoCapture::reportError(const std::string& errorCode, const std::string& message) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (errorCallback_) {
        std::thread([callback = errorCallback_, errorCode, message]() {
            callback(errorCode, message);
        }).detach();
    }
}

void PhotoCapture::reportProgress(double progress) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (progressCallback_) {
        std::thread([callback = progressCallback_, progress]() {
            callback(progress);
        }).detach();
    }
}

std::string PhotoCapture::getDefaultSaveDirectory() const {
    // Implémentation par défaut - utilise TMPDIR si disponible, sinon /tmp
    try {
        const char* tmpEnv = std::getenv("TMPDIR");
        std::string base = (tmpEnv && tmpEnv[0] != '\0') ? std::string(tmpEnv) : std::string("/tmp/");
        if (!base.empty() && base.back() == '/') {
            base.pop_back();
        }
        return base + "/naaya/photos";
    } catch (...) {
        return "/tmp/naaya/photos";
    }
}

std::string PhotoCapture::getCurrentTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
    
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time_t), "%Y%m%d_%H%M%S");
    ss << "_" << std::setfill('0') << std::setw(3) << ms.count();
    
    return ss.str();
}

// === IMPLÉMENTATION PAR DÉFAUT (STUB) ===

class DefaultPhotoCapture : public PhotoCapture {
public:
    DefaultPhotoCapture() = default;
    
    // Interdire copie et déplacement
    DefaultPhotoCapture(const DefaultPhotoCapture&) = delete;
    DefaultPhotoCapture& operator=(const DefaultPhotoCapture&) = delete;
    DefaultPhotoCapture(DefaultPhotoCapture&&) = delete;
    DefaultPhotoCapture& operator=(DefaultPhotoCapture&&) = delete;

protected:
    bool initializePlatform() override {
        return true;
    }
    
    void shutdownPlatform() override {
        // Stub
    }
    
    PhotoResult capturePhotoPlatform(const PhotoCaptureOptions& options) override {
        // Simuler une capture
        std::string fileName = generateFileName("jpg");
        std::string fullPath = getSaveDirectory() + "/" + fileName;
        
        // Dans une vraie implémentation, on capturerait une vraie photo
        PhotoResult result;
        result.uri = "file://" + fullPath;
        result.width = 1920;
        result.height = 1080;
        result.fileSize = 1024000; // 1MB fictif
        
        if (options.base64) {
            result.base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        }
        
        return result;
    }
    
    bool cancelCapturePlatform() override {
        return true;
    }
};

std::unique_ptr<PhotoCapture> PhotoCaptureFactory::create() {
#ifdef __APPLE__
    extern std::unique_ptr<PhotoCapture> createIOSPhotoCapture();
    return createIOSPhotoCapture();
#else
    return std::make_unique<DefaultPhotoCapture>();
#endif
}

} // namespace Camera
