#include "VideoCapture.hpp"

namespace Camera {

VideoCapture::VideoCapture() {}
VideoCapture::~VideoCapture() {}

bool VideoCapture::initialize() { return true; }
void VideoCapture::shutdown() {}

bool VideoCapture::startRecording(const VideoCaptureOptions& options) {
    isRecording_ = true;
    return true;
}

VideoResult VideoCapture::stopRecording() {
    isRecording_ = false;
    return VideoResult{"file:///tmp/video.mp4", 10.0, 5000000, 1920, 1080};
}

bool VideoCapture::pauseRecording() { return true; }
bool VideoCapture::resumeRecording() { return true; }
bool VideoCapture::cancelRecording() { isRecording_ = false; return true; }

double VideoCapture::getCurrentDuration() const { return 0.0; }
size_t VideoCapture::getCurrentFileSize() const { return 0; }

void VideoCapture::setSaveDirectory(const std::string& directory) {}
std::string VideoCapture::getSaveDirectory() const {
    const char* tmpEnv = std::getenv("TMPDIR");
    std::string base = (tmpEnv && tmpEnv[0] != '\0') ? std::string(tmpEnv) : std::string("/tmp/");
    if (!base.empty() && base.back() == '/') {
        base.pop_back();
    }
    return base + "/naaya/videos";
}
void VideoCapture::setFileNamePrefix(const std::string& prefix) {}
std::string VideoCapture::generateFileName(const std::string& extension) const { return "video.mp4"; }

void VideoCapture::setStartCallback(StartCallback callback) {}
void VideoCapture::setStopCallback(StopCallback callback) {}
void VideoCapture::setErrorCallback(ErrorCallback callback) {}
void VideoCapture::setProgressCallback(ProgressCallback callback) {}

void VideoCapture::reportStart() {}
void VideoCapture::reportStop(const VideoResult& result) {}
void VideoCapture::reportError(const std::string& errorCode, const std::string& message) {}
void VideoCapture::reportProgress(double duration, size_t fileSize) {}
std::string VideoCapture::getDefaultSaveDirectory() const {
    const char* tmpEnv = std::getenv("TMPDIR");
    std::string base = (tmpEnv && tmpEnv[0] != '\0') ? std::string(tmpEnv) : std::string("/tmp/");
    if (!base.empty() && base.back() == '/') {
        base.pop_back();
    }
    return base + "/naaya/videos";
}
std::string VideoCapture::getCurrentTimestamp() const { return "20240101_120000"; }

class DefaultVideoCapture : public VideoCapture {
public:
    DefaultVideoCapture() = default;
    
    // Interdire copie et déplacement
    DefaultVideoCapture(const DefaultVideoCapture&) = delete;
    DefaultVideoCapture& operator=(const DefaultVideoCapture&) = delete;
    DefaultVideoCapture(DefaultVideoCapture&&) = delete;
    DefaultVideoCapture& operator=(DefaultVideoCapture&&) = delete;

protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool startRecordingPlatform(const VideoCaptureOptions& options) override { return true; }
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
#else
    return std::make_unique<DefaultVideoCapture>();
#endif
}

} // namespace Camera
