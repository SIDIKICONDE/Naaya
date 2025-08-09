#include "VideoCapture.hpp"
#include <cstdlib>
#include <sstream>
#include <iomanip>

namespace Camera {

VideoCapture::VideoCapture() = default;
VideoCapture::~VideoCapture() = default;
// Déclaration anticipée Android
#if defined(__ANDROID__)
std::unique_ptr<VideoCapture> createAndroidVideoCapture();
#endif

bool VideoCapture::initialize() {
    if (initialized_.load()) {
        return true;
    }
    if (!initializePlatform()) {
        return false;
    }
    // Définir un répertoire par défaut si absent
    {
        std::lock_guard<std::mutex> lock(configMutex_);
        if (saveDirectory_.empty()) {
            saveDirectory_ = getDefaultSaveDirectory();
        }
    }
    initialized_ = true;
    return true;
}

void VideoCapture::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    try {
        if (isRecording_.load()) {
            (void)cancelRecording();
        }
        shutdownPlatform();
    } catch (...) {
        // Ignorer les erreurs à l'arrêt
    }
    initialized_ = false;
}

bool VideoCapture::startRecording(const VideoCaptureOptions& options) {
    if (!initialized_.load()) {
        if (!initialize()) return false;
    }
    if (isRecording_.load()) {
        return false;
    }
    {
        std::lock_guard<std::mutex> lock(configMutex_);
        currentOptions_ = options;
        if (!options.saveDirectory.empty()) {
            saveDirectory_ = options.saveDirectory;
        }
        if (!options.fileNamePrefix.empty()) {
            fileNamePrefix_ = options.fileNamePrefix;
        }
    }
    totalPausedDuration_ = std::chrono::duration<double>(0);
    recordingStartTime_ = std::chrono::steady_clock::now();
    isRecording_ = startRecordingPlatform(options);
    if (isRecording_) {
        reportStart();
        return true;
    }
    return false;
}

VideoResult VideoCapture::stopRecording() {
    if (!isRecording_.load()) {
        return VideoResult{};
    }
    VideoResult result = stopRecordingPlatform();
    isRecording_ = false;
    reportStop(result);
    return result;
}

bool VideoCapture::pauseRecording() {
    if (!isRecording_.load() || isPaused_.load()) return false;
    if (!pauseRecordingPlatform()) return false;
    isPaused_ = true;
    pauseStartTime_ = std::chrono::steady_clock::now();
    return true;
}

bool VideoCapture::resumeRecording() {
    if (!isRecording_.load() || !isPaused_.load()) return false;
    if (!resumeRecordingPlatform()) return false;
    isPaused_ = false;
    totalPausedDuration_ += (std::chrono::steady_clock::now() - pauseStartTime_);
    return true;
}

bool VideoCapture::cancelRecording() {
    if (!isRecording_.load()) return true;
    bool ok = cancelRecordingPlatform();
    isRecording_ = false;
    return ok;
}

double VideoCapture::getCurrentDuration() const {
    // Préférer la valeur plateforme si disponible
    double platform = getCurrentDurationPlatform();
    if (platform > 0.0) return platform;
    if (!isRecording_.load()) return 0.0;
    auto now = std::chrono::steady_clock::now();
    auto elapsed = now - recordingStartTime_;
    double dur = std::chrono::duration_cast<std::chrono::duration<double>>(elapsed).count();
    dur -= totalPausedDuration_.count();
    return dur > 0.0 ? dur : 0.0;
}

size_t VideoCapture::getCurrentFileSize() const {
    return getCurrentFileSizePlatform();
}

void VideoCapture::setSaveDirectory(const std::string& directory) {
    std::lock_guard<std::mutex> lock(configMutex_);
    saveDirectory_ = directory;
}

std::string VideoCapture::getSaveDirectory() const {
    std::lock_guard<std::mutex> lock(configMutex_);
    if (!saveDirectory_.empty()) return saveDirectory_;
    return getDefaultSaveDirectory();
}

void VideoCapture::setFileNamePrefix(const std::string& prefix) {
    std::lock_guard<std::mutex> lock(configMutex_);
    fileNamePrefix_ = prefix;
}

std::string VideoCapture::generateFileName(const std::string& extension) const {
    std::stringstream ss;
    ss << fileNamePrefix_ << "_" << getCurrentTimestamp() << "." << extension;
    return ss.str();
}

void VideoCapture::setStartCallback(StartCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    startCallback_ = std::move(callback);
}

void VideoCapture::setStopCallback(StopCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    stopCallback_ = std::move(callback);
}

void VideoCapture::setErrorCallback(ErrorCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    errorCallback_ = std::move(callback);
}

void VideoCapture::setProgressCallback(ProgressCallback callback) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    progressCallback_ = std::move(callback);
}

void VideoCapture::reportStart() {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (startCallback_) startCallback_();
}

void VideoCapture::reportStop(const VideoResult& result) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (stopCallback_) stopCallback_(result);
}

void VideoCapture::reportError(const std::string& errorCode, const std::string& message) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (errorCallback_) errorCallback_(errorCode, message);
}

void VideoCapture::reportProgress(double duration, size_t fileSize) {
    std::lock_guard<std::mutex> lock(callbacksMutex_);
    if (progressCallback_) progressCallback_(duration, fileSize);
}

std::string VideoCapture::getDefaultSaveDirectory() const {
    const char* tmpEnv = std::getenv("TMPDIR");
    std::string base = (tmpEnv && tmpEnv[0] != '\0') ? std::string(tmpEnv) : std::string("/tmp/");
    if (!base.empty() && base.back() == '/') {
        base.pop_back();
    }
    return base + "/naaya/videos";
}

std::string VideoCapture::getCurrentTimestamp() const {
    // yyyyMMdd_HHmmss_SSS
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % std::chrono::milliseconds(1000);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time_t), "%Y%m%d_%H%M%S")
       << "_" << std::setw(3) << std::setfill('0') << ms.count();
    return ss.str();
}

class DefaultVideoCapture : public VideoCapture {
public:
    DefaultVideoCapture() = default;
    DefaultVideoCapture(const DefaultVideoCapture&) = delete;
    DefaultVideoCapture& operator=(const DefaultVideoCapture&) = delete;
    DefaultVideoCapture(DefaultVideoCapture&&) = delete;
    DefaultVideoCapture& operator=(DefaultVideoCapture&&) = delete;

protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool startRecordingPlatform(const VideoCaptureOptions& /*options*/) override { return true; }
    VideoResult stopRecordingPlatform() override { return VideoResult{}; }
    bool pauseRecordingPlatform() override { return true; }
    bool resumeRecordingPlatform() override { return true; }
    bool cancelRecordingPlatform() override { return true; }
    double getCurrentDurationPlatform() const override { return 0.0; }
    size_t getCurrentFileSizePlatform() const override { return 0; }
};

std::unique_ptr<VideoCapture> VideoCaptureFactory::create() {
#ifdef __APPLE__
    extern std::unique_ptr<VideoCapture> createIOSVideoCapture();
    return createIOSVideoCapture();
#elif defined(__ANDROID__)
    return createAndroidVideoCapture();
#else
    return std::make_unique<DefaultVideoCapture>();
#endif
}

} // namespace Camera
