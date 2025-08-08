#include "FlashController.hpp"

namespace Camera {

FlashController::FlashController() = default;
FlashController::~FlashController() = default;

bool FlashController::initialize() { return true; }
void FlashController::shutdown() {}

bool FlashController::hasFlash() const { return true; }
bool FlashController::setFlashMode(FlashMode mode) { currentMode_ = mode; return true; }
bool FlashController::setTorchEnabled(bool enabled) { torchEnabled_ = enabled; return true; }
bool FlashController::toggleTorch() { return setTorchEnabled(!torchEnabled_.load()); }
bool FlashController::triggerFlash() { return true; }

bool FlashController::setFlashIntensity(double intensity) { flashIntensity_ = intensity; return true; }
double FlashController::getFlashIntensity() const { return flashIntensity_.load(); }
bool FlashController::supportsVariableIntensity() const { return true; }

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

void FlashController::setModeChangeCallback(ModeChangeCallback callback) {}
void FlashController::setErrorCallback(ErrorCallback callback) {}
void FlashController::reportModeChange(FlashMode oldMode, FlashMode newMode) {}
void FlashController::reportError(const std::string& errorCode, const std::string& message) {}

class DefaultFlashController : public FlashController {
public:
    DefaultFlashController() = default;
    
    // Interdire copie et déplacement
    DefaultFlashController(const DefaultFlashController&) = delete;
    DefaultFlashController& operator=(const DefaultFlashController&) = delete;
    DefaultFlashController(DefaultFlashController&&) = delete;
    DefaultFlashController& operator=(DefaultFlashController&&) = delete;

protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool hasFlashPlatform() const override { return true; }
    bool setFlashModePlatform(FlashMode mode) override { return true; }
    bool setTorchEnabledPlatform(bool enabled) override { return true; }
    bool triggerFlashPlatform() override { return true; }
    bool setFlashIntensityPlatform(double intensity) override { return true; }
    double getFlashIntensityPlatform() const override { return 1.0; }
    bool supportsVariableIntensityPlatform() const override { return true; }
};

std::unique_ptr<FlashController> FlashControllerFactory::create() {
#if defined(__APPLE__)
    // Fallback: pas d'impl iOS spécifique pour le moment -> utiliser défaut
    return std::make_unique<DefaultFlashController>();
#else
    return std::make_unique<DefaultFlashController>();
#endif
}

} // namespace Camera
