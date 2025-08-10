#include "NativeCameraModule.h"

#ifdef __cplusplus
#if NAAYA_CAMERA_MODULE_ENABLED

#include <string>
#include <iostream>
// Includes complets pour l'implémentation
#include "Camera/core/CameraManager.hpp"
#include "Camera/capture/PhotoCapture.hpp"
#include "Camera/capture/VideoCapture.hpp"
#include "Camera/controls/FlashController.hpp"
#include "Camera/controls/ZoomController.hpp"
#include "Camera/utils/PermissionManager.hpp"
#include "Camera/common/Types.hpp"

#if defined(__APPLE__)
extern "C" void NaayaSetFlashMode(int mode);
#endif

namespace facebook::react {

NativeCameraModule::NativeCameraModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeCameraModuleCxxSpec<NativeCameraModule>(jsInvoker) {
    // Initialiser automatiquement le module
    initializeModule();
}

NativeCameraModule::~NativeCameraModule() {
    shutdownModule();
}

bool NativeCameraModule::initializeModule() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    
    if (initialized_) return true;
    
    try {
        // Initialiser tous les composants modulaires avec les Factory
        std::cout << "[DEBUG] NativeCameraModule: Création des composants..." << std::endl;
        cameraManager_ = Camera::CameraManagerFactory::create();
        photoCapture_ = Camera::PhotoCaptureFactory::create();
        videoCapture_ = Camera::VideoCaptureFactory::create();
        flashController_ = Camera::FlashControllerFactory::create();
        zoomController_ = Camera::ZoomControllerFactory::create();
        permissionManager_ = Camera::PermissionManagerFactory::create();
        
        // Initialiser tous les composants
        if (permissionManager_) {
            std::cout << "[DEBUG] NativeCameraModule: Initialisation PermissionManager..." << std::endl;
            permissionManager_->initialize();
        }
        
        if (cameraManager_) {
            std::cout << "[DEBUG] NativeCameraModule: Initialisation CameraManager..." << std::endl;
            bool initSuccess = cameraManager_->initialize();
            std::cout << "[DEBUG] NativeCameraModule: CameraManager initialize = " << (initSuccess ? "SUCCESS" : "FAILED") << std::endl;
        } else {
            std::cout << "[ERROR] NativeCameraModule: CameraManager est nullptr!" << std::endl;
        }
        
        if (photoCapture_) {
            photoCapture_->initialize();
        }
        
        if (videoCapture_) {
            videoCapture_->initialize();
        }
        
        if (flashController_) {
            flashController_->initialize();
        }
        
        if (zoomController_) {
            zoomController_->initialize();
        }
        
        initialized_ = true;
        return true;
        
    } catch (const std::exception& e) {
        // En cas d'erreur, nettoyer les composants partiellement initialisés
        shutdownModule();
        return false;
    }
}

void NativeCameraModule::shutdownModule() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    
    if (!initialized_) return;
    
    // Nettoyer tous les composants dans l'ordre inverse
    if (zoomController_) {
        zoomController_->shutdown();
        zoomController_.reset();
    }
    
    if (flashController_) {
        flashController_->shutdown();
        flashController_.reset();
    }
    
    if (videoCapture_) {
        videoCapture_->shutdown();
        videoCapture_.reset();
    }
    
    if (photoCapture_) {
        photoCapture_->shutdown();
        photoCapture_.reset();
    }
    
    if (cameraManager_) {
        cameraManager_->shutdown();
        cameraManager_.reset();
    }
    
    if (permissionManager_) {
        permissionManager_->shutdown();
        permissionManager_.reset();
    }
    
    initialized_ = false;
}

// === MÉTHODES INTERNES (C++) ===

std::vector<Camera::CameraDevice> NativeCameraModule::getAvailableDevicesInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    std::cout << "[DEBUG] getAvailableDevicesInternal: Début" << std::endl;
    
    if (!cameraManager_) {
        std::cout << "[ERROR] getAvailableDevicesInternal: cameraManager_ est nullptr" << std::endl;
        return {};
    }
    
    auto devices = cameraManager_->getAvailableDevices();
    std::cout << "[DEBUG] getAvailableDevicesInternal: cameraManager retourne " << devices.size() << " dispositifs" << std::endl;
    
    for (const auto& device : devices) {
        std::cout << "[DEBUG] Device: id=" << device.id << ", name=" << device.name 
                  << ", position=" << device.position << ", hasFlash=" << device.hasFlash << std::endl;
    }
    
    return devices;
}

Camera::CameraDevice* NativeCameraModule::getCurrentDeviceInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return nullptr;
    return const_cast<Camera::CameraDevice*>(cameraManager_->getCurrentDevice());
}

bool NativeCameraModule::selectDeviceInternal(const std::string& deviceId) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return false;
    return cameraManager_->selectDevice(deviceId);
}

bool NativeCameraModule::switchDeviceInternal(const std::string& position) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return false;
    return cameraManager_->selectDeviceByPosition(position);
}

bool NativeCameraModule::startCameraInternal(const std::string& deviceId) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return false;
    
    if (!deviceId.empty()) {
        if (!cameraManager_->selectDevice(deviceId)) {
            return false;
        }
    }
    return cameraManager_->startCamera();
}

bool NativeCameraModule::stopCameraInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return false;
    return cameraManager_->stopCamera();
}

bool NativeCameraModule::isActiveInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!cameraManager_) return false;
    return cameraManager_->isActive();
}

bool NativeCameraModule::hasFlashInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!flashController_) return false;
    return flashController_->hasFlash();
}

bool NativeCameraModule::setFlashModeInternal(const std::string& mode) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!flashController_) return false;
    
    Camera::FlashMode flashMode = Camera::FlashMode::OFF;
    if (mode == "auto") flashMode = Camera::FlashMode::AUTO;
    else if (mode == "on") flashMode = Camera::FlashMode::ON;
    else if (mode == "torch") flashMode = Camera::FlashMode::TORCH;
    
    // Mémoriser aussi côté iOS pour PhotoCaptureIOS
#if defined(__APPLE__)
    int iosMode = 0; // off
    switch (flashMode) {
      case Camera::FlashMode::ON: iosMode = 1; break;
      case Camera::FlashMode::AUTO: iosMode = 2; break;
      case Camera::FlashMode::TORCH: iosMode = 3; break;
      case Camera::FlashMode::OFF: default: iosMode = 0; break;
    }
    NaayaSetFlashMode(iosMode);
#endif

    return flashController_->setFlashMode(flashMode);
}

bool NativeCameraModule::setTorchModeInternal(bool enabled) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!flashController_) return false;
    return flashController_->setTorchEnabled(enabled);
}

double NativeCameraModule::getMinZoomInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!zoomController_) return 1.0;
    return zoomController_->getMinZoom();
}

double NativeCameraModule::getMaxZoomInternal() {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!zoomController_) return 1.0;
    return zoomController_->getMaxZoom();
}

bool NativeCameraModule::setZoomInternal(double level) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!zoomController_) return false;
    return zoomController_->setZoomLevel(level);
}

// === MÉTHODES JSI (EXPOSÉES À JAVASCRIPT) ===

jsi::Object NativeCameraModule::checkPermissions(jsi::Runtime& rt) {
    jsi::Object result = jsi::Object(rt);

    // Valeurs par défaut si le PermissionManager n'est pas disponible
    auto setDefault = [&](const char* key) {
        result.setProperty(rt, key, jsi::String::createFromUtf8(rt, "not-determined"));
    };

    if (!permissionManager_) {
        setDefault("camera");
        setDefault("microphone");
        setDefault("storage");
        return result;
    }

    // Lecture synchrone et mapping en chaînes
    const auto permissions = permissionManager_->checkPermissionsSync();
    const auto map = permissions.toStringMap();

    auto getOrDefault = [&](const char* key) -> std::string {
        auto it = map.find(key);
        return it != map.end() ? it->second : std::string("not-determined");
    };

    result.setProperty(rt, "camera", jsi::String::createFromUtf8(rt, getOrDefault("camera")));
    result.setProperty(rt, "microphone", jsi::String::createFromUtf8(rt, getOrDefault("microphone")));
    result.setProperty(rt, "storage", jsi::String::createFromUtf8(rt, getOrDefault("storage")));
    return result;
}

jsi::Object NativeCameraModule::requestPermissions(jsi::Runtime& rt) {
    jsi::Object result = jsi::Object(rt);

    auto setDefault = [&](const char* key) {
        result.setProperty(rt, key, jsi::String::createFromUtf8(rt, "not-determined"));
    };

    if (!permissionManager_) {
        setDefault("camera");
        setDefault("microphone");
        setDefault("storage");
        return result;
    }

    const auto permissions = permissionManager_->requestPermissionsSync();
    const auto map = permissions.toStringMap();

    auto getOrDefault = [&](const char* key) -> std::string {
        auto it = map.find(key);
        return it != map.end() ? it->second : std::string("not-determined");
    };

    result.setProperty(rt, "camera", jsi::String::createFromUtf8(rt, getOrDefault("camera")));
    result.setProperty(rt, "microphone", jsi::String::createFromUtf8(rt, getOrDefault("microphone")));
    result.setProperty(rt, "storage", jsi::String::createFromUtf8(rt, getOrDefault("storage")));
    return result;
}

jsi::Array NativeCameraModule::getAvailableDevices(jsi::Runtime& rt) {
    // Debug logging en C++
    std::cout << "[DEBUG] NativeCameraModule::getAvailableDevices appelé" << std::endl;
    auto devices = getAvailableDevicesInternal();
    std::cout << "[DEBUG] getAvailableDevicesInternal a retourné " << devices.size() << " dispositifs" << std::endl;
    jsi::Array result = jsi::Array(rt, devices.size());
    
    for (size_t i = 0; i < devices.size(); i++) {
        jsi::Object device = jsi::Object(rt);
        device.setProperty(rt, "id", jsi::String::createFromUtf8(rt, devices[i].id));
        device.setProperty(rt, "name", jsi::String::createFromUtf8(rt, devices[i].name));
        device.setProperty(rt, "position", jsi::String::createFromUtf8(rt, devices[i].position));
        device.setProperty(rt, "hasFlash", jsi::Value(devices[i].hasFlash));
        result.setValueAtIndex(rt, i, std::move(device));
    }
    
    return result;
}

std::optional<jsi::Object> NativeCameraModule::getCurrentDevice(jsi::Runtime& rt) {
    auto device = getCurrentDeviceInternal();
    if (!device) {
        return std::nullopt;
    }
    
    jsi::Object result = jsi::Object(rt);
    result.setProperty(rt, "id", jsi::String::createFromUtf8(rt, device->id));
    result.setProperty(rt, "name", jsi::String::createFromUtf8(rt, device->name));
    result.setProperty(rt, "position", jsi::String::createFromUtf8(rt, device->position));
    result.setProperty(rt, "hasFlash", jsi::Value(device->hasFlash));
    return result;
}

bool NativeCameraModule::selectDevice(jsi::Runtime& rt, jsi::String deviceId) {
    return selectDeviceInternal(deviceId.utf8(rt));
}

bool NativeCameraModule::switchDevice(jsi::Runtime& rt, jsi::String position) {
    return switchDeviceInternal(position.utf8(rt));
}

bool NativeCameraModule::startCamera(jsi::Runtime& rt, jsi::String deviceId) {
    return startCameraInternal(deviceId.utf8(rt));
}

bool NativeCameraModule::stopCamera(jsi::Runtime& rt) {
    return stopCameraInternal();
}

bool NativeCameraModule::isActive(jsi::Runtime& rt) {
    return isActiveInternal();
}

jsi::Object NativeCameraModule::capturePhoto(jsi::Runtime& rt, jsi::Object options) {
    Camera::PhotoCaptureOptions opts;
    std::string optDeviceId;
    // Lecture des options si présentes
    if (options.hasProperty(rt, "quality")) {
        auto v = options.getProperty(rt, "quality");
        if (v.isNumber()) opts.quality = v.asNumber();
    }
    if (options.hasProperty(rt, "base64")) {
        auto v = options.getProperty(rt, "base64");
        if (v.isBool()) opts.base64 = v.getBool();
    }
    if (options.hasProperty(rt, "exif")) {
        auto v = options.getProperty(rt, "exif");
        if (v.isBool()) opts.exif = v.getBool();
    }
    if (options.hasProperty(rt, "skipMetadata")) {
        auto v = options.getProperty(rt, "skipMetadata");
        if (v.isBool()) opts.skipMetadata = v.getBool();
    }
    if (options.hasProperty(rt, "format")) {
        auto v = options.getProperty(rt, "format");
        if (v.isString()) opts.format = v.asString(rt).utf8(rt);
    }
    if (options.hasProperty(rt, "deviceId")) {
        auto v = options.getProperty(rt, "deviceId");
        if (v.isString()) optDeviceId = v.asString(rt).utf8(rt);
    }

    auto makeEmpty = [&]() {
        jsi::Object empty(rt);
        empty.setProperty(rt, "uri", jsi::String::createFromUtf8(rt, ""));
        empty.setProperty(rt, "width", jsi::Value(0));
        empty.setProperty(rt, "height", jsi::Value(0));
        empty.setProperty(rt, "size", jsi::Value(0));
        return empty;
    };

    Camera::PhotoResult photo;
    try {
        std::lock_guard<std::mutex> lock(stateMutex_);
        if (!photoCapture_) {
            return makeEmpty();
        }
        // Sélectionner le device demandé si fourni
        if (!optDeviceId.empty() && cameraManager_) {
            cameraManager_->selectDevice(optDeviceId);
        }
        photo = photoCapture_->capturePhotoSync(opts);
    } catch (const std::exception& e) {
        (void)e; // éviter warning si log désactivé
        return makeEmpty();
    } catch (...) {
        return makeEmpty();
    }

    jsi::Object result = jsi::Object(rt);
    result.setProperty(rt, "uri", jsi::String::createFromUtf8(rt, photo.uri));
    result.setProperty(rt, "width", jsi::Value(photo.width));
    result.setProperty(rt, "height", jsi::Value(photo.height));
    if (!photo.base64.empty()) {
        result.setProperty(rt, "base64", jsi::String::createFromUtf8(rt, photo.base64));
    }
    if (!photo.exifData.empty()) {
        result.setProperty(rt, "exif", jsi::String::createFromUtf8(rt, photo.exifData));
    }
    if (photo.fileSize > 0) {
        result.setProperty(rt, "size", jsi::Value(static_cast<double>(photo.fileSize)));
    }
    return result;
}

bool NativeCameraModule::startRecording(jsi::Runtime& rt, jsi::Object options) {
    Camera::VideoCaptureOptions opts;
    std::string optDeviceId;
    if (options.hasProperty(rt, "quality")) {
        auto v = options.getProperty(rt, "quality");
        if (v.isString()) opts.quality = v.asString(rt).utf8(rt);
    }
    if (options.hasProperty(rt, "maxDuration")) {
        auto v = options.getProperty(rt, "maxDuration");
        if (v.isNumber()) opts.maxDuration = static_cast<int>(v.asNumber());
    }
    if (options.hasProperty(rt, "maxFileSize")) {
        auto v = options.getProperty(rt, "maxFileSize");
        if (v.isNumber()) opts.maxFileSize = static_cast<size_t>(v.asNumber());
    }
    if (options.hasProperty(rt, "videoBitrate")) {
        auto v = options.getProperty(rt, "videoBitrate");
        if (v.isNumber()) opts.videoBitrate = static_cast<int>(v.asNumber());
    }
    if (options.hasProperty(rt, "audioBitrate")) {
        auto v = options.getProperty(rt, "audioBitrate");
        if (v.isNumber()) opts.audioBitrate = static_cast<int>(v.asNumber());
    }
    if (options.hasProperty(rt, "recordAudio")) {
        auto v = options.getProperty(rt, "recordAudio");
        if (v.isBool()) opts.recordAudio = v.getBool();
    }
    if (options.hasProperty(rt, "codec")) {
        auto v = options.getProperty(rt, "codec");
        if (v.isString()) opts.codec = v.asString(rt).utf8(rt);
    }
  if (options.hasProperty(rt, "container")) {
    auto v = options.getProperty(rt, "container");
    if (v.isString()) opts.container = v.asString(rt).utf8(rt);
  }
  if (options.hasProperty(rt, "audioCodec")) {
    auto v = options.getProperty(rt, "audioCodec");
    if (v.isString()) opts.audioCodec = v.asString(rt).utf8(rt);
  }
  if (options.hasProperty(rt, "width")) {
    auto v = options.getProperty(rt, "width");
    if (v.isNumber()) opts.width = static_cast<int>(v.asNumber());
  }
  if (options.hasProperty(rt, "height")) {
    auto v = options.getProperty(rt, "height");
    if (v.isNumber()) opts.height = static_cast<int>(v.asNumber());
  }
  if (options.hasProperty(rt, "fps")) {
    auto v = options.getProperty(rt, "fps");
    if (v.isNumber()) opts.fps = static_cast<int>(v.asNumber());
  }
    if (options.hasProperty(rt, "deviceId")) {
        auto v = options.getProperty(rt, "deviceId");
        if (v.isString()) optDeviceId = v.asString(rt).utf8(rt);
    }
    // Ajouts avancés
    if (options.hasProperty(rt, "orientation")) {
        auto v = options.getProperty(rt, "orientation");
        if (v.isString()) opts.orientation = v.asString(rt).utf8(rt);
    }
    if (options.hasProperty(rt, "stabilization")) {
        auto v = options.getProperty(rt, "stabilization");
        if (v.isString()) opts.stabilization = v.asString(rt).utf8(rt);
    }
    if (options.hasProperty(rt, "lockAE")) {
        auto v = options.getProperty(rt, "lockAE");
        if (v.isBool()) opts.lockAE = v.getBool();
    }
    if (options.hasProperty(rt, "lockAWB")) {
        auto v = options.getProperty(rt, "lockAWB");
        if (v.isBool()) opts.lockAWB = v.getBool();
    }
    if (options.hasProperty(rt, "lockAF")) {
        auto v = options.getProperty(rt, "lockAF");
        if (v.isBool()) opts.lockAF = v.getBool();
    }
    if (options.hasProperty(rt, "saveDirectory")) {
        auto v = options.getProperty(rt, "saveDirectory");
        if (v.isString()) opts.saveDirectory = v.asString(rt).utf8(rt);
    }
    if (options.hasProperty(rt, "fileNamePrefix")) {
        auto v = options.getProperty(rt, "fileNamePrefix");
        if (v.isString()) opts.fileNamePrefix = v.asString(rt).utf8(rt);
    }

    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!videoCapture_) return false;
    if (!optDeviceId.empty() && cameraManager_) {
        cameraManager_->selectDevice(optDeviceId);
    }
    return videoCapture_->startRecording(opts);
}

jsi::Object NativeCameraModule::stopRecording(jsi::Runtime& rt) {
    Camera::VideoResult vr;
    {
        std::lock_guard<std::mutex> lock(stateMutex_);
        if (!videoCapture_) {
            jsi::Object empty = jsi::Object(rt);
            empty.setProperty(rt, "uri", jsi::String::createFromUtf8(rt, ""));
            empty.setProperty(rt, "duration", jsi::Value(0));
            empty.setProperty(rt, "size", jsi::Value(0));
            empty.setProperty(rt, "width", jsi::Value(0));
            empty.setProperty(rt, "height", jsi::Value(0));
            return empty;
        }
        vr = videoCapture_->stopRecording();
    }

    jsi::Object result = jsi::Object(rt);
    result.setProperty(rt, "uri", jsi::String::createFromUtf8(rt, vr.uri));
    result.setProperty(rt, "duration", jsi::Value(vr.duration));
    result.setProperty(rt, "size", jsi::Value(static_cast<double>(vr.fileSize)));
    result.setProperty(rt, "width", jsi::Value(vr.width));
    result.setProperty(rt, "height", jsi::Value(vr.height));
    return result;
}

bool NativeCameraModule::isRecording(jsi::Runtime& rt) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    if (!videoCapture_) return false;
    return videoCapture_->isRecording();
}

jsi::Object NativeCameraModule::getRecordingProgress(jsi::Runtime& rt) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    jsi::Object obj(rt);
    if (!videoCapture_) {
        obj.setProperty(rt, "duration", jsi::Value(0));
        obj.setProperty(rt, "size", jsi::Value(0));
        return obj;
    }
    double dur = videoCapture_->getCurrentDuration();
    size_t size = videoCapture_->getCurrentFileSize();
    obj.setProperty(rt, "duration", jsi::Value(dur));
    obj.setProperty(rt, "size", jsi::Value(static_cast<double>(size)));
    return obj;
}

bool NativeCameraModule::hasFlash(jsi::Runtime& rt) {
    return hasFlashInternal();
}

bool NativeCameraModule::setFlashMode(jsi::Runtime& rt, jsi::String mode) {
    return setFlashModeInternal(mode.utf8(rt));
}

bool NativeCameraModule::setTorchMode(jsi::Runtime& rt, bool enabled) {
    return setTorchModeInternal(enabled);
}

double NativeCameraModule::getMinZoom(jsi::Runtime& rt) {
    return getMinZoomInternal();
}

double NativeCameraModule::getMaxZoom(jsi::Runtime& rt) {
    return getMaxZoomInternal();
}

bool NativeCameraModule::setZoom(jsi::Runtime& rt, double level) {
    return setZoomInternal(level);
}

jsi::Object NativeCameraModule::getPreviewSize(jsi::Runtime& rt) {
    jsi::Object result = jsi::Object(rt);
    int width = 1920;
    int height = 1080;

    {
        std::lock_guard<std::mutex> lock(stateMutex_);
        if (cameraManager_) {
            auto size = cameraManager_->getPreviewSize();
            width = size.first;
            height = size.second;
        }
    }

    result.setProperty(rt, "width", jsi::Value(width));
    result.setProperty(rt, "height", jsi::Value(height));
    return result;
}

jsi::Array NativeCameraModule::getSupportedFormats(jsi::Runtime& rt, jsi::String deviceId) {
    std::vector<Camera::CameraFormat> formats;
    {
        std::lock_guard<std::mutex> lock(stateMutex_);
        if (cameraManager_) {
            const std::string devId = deviceId.utf8(rt);
            if (!devId.empty()) {
                // Sélectionner le dispositif ciblé pour récupérer ses formats
                cameraManager_->selectDevice(devId);
            }
            formats = cameraManager_->getSupportedFormats();
        }
    }

    jsi::Array result = jsi::Array(rt, formats.size());
    for (size_t i = 0; i < formats.size(); ++i) {
        const auto& f = formats[i];
        jsi::Object obj(rt);
        obj.setProperty(rt, "width", jsi::Value(f.width));
        obj.setProperty(rt, "height", jsi::Value(f.height));
        obj.setProperty(rt, "fps", jsi::Value(f.fps));
        obj.setProperty(rt, "pixelFormat", jsi::String::createFromUtf8(rt, f.pixelFormat));
        result.setValueAtIndex(rt, i, std::move(obj));
    }
    return result;
}

} // namespace facebook::react

#endif // NAAYA_CAMERA_MODULE_ENABLED
#endif // __cplusplus