#include "ZoomController.hpp"

namespace Camera {

ZoomController::ZoomController() = default;
ZoomController::~ZoomController() = default;

bool ZoomController::initialize() { return true; }
void ZoomController::shutdown() {}

bool ZoomController::setZoomLevel(double level) {
    double clamped = clampZoom(level);
    currentZoom_ = clamped;
    return true;
}

bool ZoomController::zoomIn(double factor) {
    return setZoomLevel(currentZoom_.load() * factor);
}

bool ZoomController::zoomOut(double factor) {
    return setZoomLevel(currentZoom_.load() / factor);
}

bool ZoomController::resetZoom() {
    return setZoomLevel(1.0);
}

bool ZoomController::zoomToPoint(double x, double y, double zoomLevel) {
    return setZoomLevel(zoomLevel);
}

bool ZoomController::setGestureZoomEnabled(bool enabled) {
    gestureZoomEnabled_ = enabled;
    return true;
}

bool ZoomController::startZoomGesture(double initialDistance) {
    std::lock_guard<std::mutex> lock(gestureMutex_);
    gestureInProgress_ = true;
    gestureInitialDistance_ = initialDistance;
    gestureInitialZoom_ = currentZoom_.load();
    return true;
}

bool ZoomController::updateZoomGesture(double currentDistance) {
    std::lock_guard<std::mutex> lock(gestureMutex_);
    if (!gestureInProgress_) return false;
    
    double factor = currentDistance / gestureInitialDistance_;
    double newZoom = gestureInitialZoom_ * factor;
    return setZoomLevel(newZoom);
}

bool ZoomController::endZoomGesture() {
    std::lock_guard<std::mutex> lock(gestureMutex_);
    gestureInProgress_ = false;
    return true;
}

void ZoomController::setZoomSpeed(double speed) { zoomSpeed_ = speed; }
double ZoomController::getZoomSpeed() const { return zoomSpeed_.load(); }
void ZoomController::setSmoothZoom(bool enabled) { smoothZoomEnabled_ = enabled; }
bool ZoomController::isSmoothZoomEnabled() const { return smoothZoomEnabled_.load(); }
void ZoomController::setSmoothZoomDuration(int durationMs) { smoothZoomDuration_ = durationMs; }

void ZoomController::setZoomChangeCallback(ZoomChangeCallback callback) {}
void ZoomController::setErrorCallback(ErrorCallback callback) {}
void ZoomController::reportZoomChange(double oldZoom, double newZoom) {}
void ZoomController::reportError(const std::string& errorCode, const std::string& message) {}

double ZoomController::clampZoom(double zoom) const {
    double min = minZoom_.load();
    double max = maxZoom_.load();
    return std::max(min, std::min(max, zoom));
}

class DefaultZoomController : public ZoomController {
public:
    DefaultZoomController() = default;
    
    // Interdire copie et déplacement
    DefaultZoomController(const DefaultZoomController&) = delete;
    DefaultZoomController& operator=(const DefaultZoomController&) = delete;
    DefaultZoomController(DefaultZoomController&&) = delete;
    DefaultZoomController& operator=(DefaultZoomController&&) = delete;

protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool setZoomLevelPlatform(double level) override { return true; }
    std::pair<double, double> getZoomRangePlatform() const override { return {1.0, 10.0}; }
    bool zoomToPointPlatform(double x, double y, double zoomLevel) override { return true; }
    bool setGestureZoomEnabledPlatform(bool enabled) override { return true; }
    bool setSmoothZoomPlatform(bool enabled, int durationMs) override { return true; }
};

std::unique_ptr<ZoomController> ZoomControllerFactory::create() {
    return std::make_unique<DefaultZoomController>();
}

} // namespace Camera
