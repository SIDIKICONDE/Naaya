#pragma once

#include <NaayaJSI.h>

#include <iostream>
#include <jsi/jsi.h>
#include <ReactCommon/TurboModule.h>
#include <ReactCommon/TurboModuleUtils.h>
#include <string>
#include <mutex>
#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <optional>


// Forward declarations pour éviter les dépendances circulaires
namespace Camera {
    class CameraManager;
    class PhotoCapture;
    class VideoCapture;
    class FlashController;
    class ZoomController;
    class PermissionManager;
    struct CameraDevice;
    struct CameraPermissions;
    struct PhotoResult;
    struct VideoResult;
    struct PhotoCaptureOptions;
    struct VideoCaptureOptions;
}

namespace facebook::react {

/**
 * Turbo Module Caméra avec architecture modulaire C++20
 * Hérite de la spec codegen pour exposer automatiquement les méthodes JSI
 */
class JSI_EXPORT NativeCameraModule : public NativeCameraModuleCxxSpec<NativeCameraModule> {
public:
    explicit NativeCameraModule(std::shared_ptr<CallInvoker> jsInvoker);
    virtual ~NativeCameraModule();
    
    // TurboModule interface
    static constexpr auto kModuleName = "NativeCameraModule";
    
public:
    // === MÉTHODES JSI (EXPOSÉES À JAVASCRIPT) ===
    
    // Gestion des permissions
    jsi::Object checkPermissions(jsi::Runtime& rt);
    jsi::Object requestPermissions(jsi::Runtime& rt);
    
    // Gestion des dispositifs
    jsi::Array getAvailableDevices(jsi::Runtime& rt);
    std::optional<jsi::Object> getCurrentDevice(jsi::Runtime& rt);
    bool selectDevice(jsi::Runtime& rt, jsi::String deviceId);
    bool switchDevice(jsi::Runtime& rt, jsi::String position);
    
    // Contrôles de la caméra
    bool startCamera(jsi::Runtime& rt, jsi::String deviceId);
    bool stopCamera(jsi::Runtime& rt);
    bool isActive(jsi::Runtime& rt);
    
    // Capture photo
    jsi::Object capturePhoto(jsi::Runtime& rt, jsi::Object options);
    
    // Enregistrement vidéo
    bool startRecording(jsi::Runtime& rt, jsi::Object options);
    jsi::Object stopRecording(jsi::Runtime& rt);
    bool isRecording(jsi::Runtime& rt);
    jsi::Object getRecordingProgress(jsi::Runtime& rt);
    
    // Contrôles flash/torche
    bool hasFlash(jsi::Runtime& rt);
    bool setFlashMode(jsi::Runtime& rt, jsi::String mode);
    bool setTorchMode(jsi::Runtime& rt, bool enabled);
    
    // Contrôles zoom
    double getMinZoom(jsi::Runtime& rt);
    double getMaxZoom(jsi::Runtime& rt);
    bool setZoom(jsi::Runtime& rt, double level);
    
    // Utilitaires
    jsi::Object getPreviewSize(jsi::Runtime& rt);
    jsi::Array getSupportedFormats(jsi::Runtime& rt, jsi::String deviceId);

private:
    // === MÉTHODES INTERNES (C++) ===
    
    bool initializeModule();
    void shutdownModule();
    
    // Versions internes des méthodes (sans JSI)
    std::vector<Camera::CameraDevice> getAvailableDevicesInternal();
    Camera::CameraDevice* getCurrentDeviceInternal();
    bool selectDeviceInternal(const std::string& deviceId);
    bool switchDeviceInternal(const std::string& position);
    bool startCameraInternal(const std::string& deviceId = "");
    bool stopCameraInternal();
    bool isActiveInternal();
    bool hasFlashInternal();
    bool setFlashModeInternal(const std::string& mode);
    bool setTorchModeInternal(bool enabled);
    double getMinZoomInternal();
    double getMaxZoomInternal();
    bool setZoomInternal(double level);

    // Progression rec (durée/taille)
    jsi::Object getRecordingProgressInternal(jsi::Runtime& rt);

private:
    // === COMPOSANTS MODULAIRES ===
    std::unique_ptr<Camera::CameraManager> cameraManager_;
    std::unique_ptr<Camera::PhotoCapture> photoCapture_;
    std::unique_ptr<Camera::VideoCapture> videoCapture_;
    std::unique_ptr<Camera::FlashController> flashController_;
    std::unique_ptr<Camera::ZoomController> zoomController_;
    std::unique_ptr<Camera::PermissionManager> permissionManager_;
    
    // État global
    mutable std::mutex stateMutex_;
    bool initialized_{false};
};

} // namespace facebook::react