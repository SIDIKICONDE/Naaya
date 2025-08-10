#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <TargetConditionals.h>
#import <CoreMedia/CoreMedia.h>

#include "CameraManagerIOS.h"
#import "CameraSessionBridge.h"
#include "../../shared/Camera/controls/ZoomController.hpp"
#include "../../shared/Camera/controls/FlashController.hpp"

using namespace std;

namespace Camera {

// Garde RAII pour garantir begin/commit de session
struct SessionConfigurationGuard {
  AVCaptureSession *session;
  explicit SessionConfigurationGuard(AVCaptureSession *s) : session(s) {
    if (session) [session beginConfiguration];
  }
  ~SessionConfigurationGuard() {
    if (session) [session commitConfiguration];
  }
};

static inline bool isCameraAuthorized() {
#if TARGET_OS_SIMULATOR
  return true;
#else
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  return status == AVAuthorizationStatusAuthorized;
#endif
}

// Utilitaire: convertir un OSType (fourcc) en std::string lisible (ex: '420f', 'BGRA')
static std::string FourCCToString(OSType code) {
  char buf[5];
  buf[0] = (char)((code >> 24) & 0xFF);
  buf[1] = (char)((code >> 16) & 0xFF);
  buf[2] = (char)((code >> 8) & 0xFF);
  buf[3] = (char)(code & 0xFF);
  buf[4] = '\0';
  // Remplacer les caractères non imprimables par '.' pour éviter des surprises
  for (int i = 0; i < 4; ++i) {
    if (buf[i] < 32 || buf[i] > 126) buf[i] = '.';
  }
  return std::string(buf);
}

// Implémentation iOS minimale conforme à l'interface CameraManager
class IOSCameraManager final : public CameraManager {
public:
  IOSCameraManager() = default;
  ~IOSCameraManager() override = default;

protected:
  bool initializePlatform() override {
    // Préparer la session AVFoundation de façon paresseuse
    if (!captureSession_) {
      captureSession_ = NaayaGetSharedSession();
      if (!captureSession_) {
        captureSession_ = [[AVCaptureSession alloc] init];
        captureSession_.sessionPreset = AVCaptureSessionPresetHigh;
        NaayaSetSharedSession(captureSession_, currentInput_);
      }
    }
    // Énumérer une première fois pour remplir le cache côté base
    (void)enumerateDevices();
    return true;
  }

  void shutdownPlatform() override {
    if (captureSession_) {
      if ([captureSession_ isRunning]) {
        [captureSession_ stopRunning];
      }
      captureSession_ = nil;
      currentInput_ = nil;
    }
  }

  vector<CameraDevice> enumerateDevices() override {
    vector<CameraDevice> devices;
#if TARGET_OS_SIMULATOR
    // Retourner un device fictif en simulateur
    devices.emplace_back("simulator", "iOS Simulator Camera", "front", /*hasFlash*/ false, /*available*/ true);
    return devices;
#else
    // Vidéo uniquement (caméra)
    NSArray<AVCaptureDevice *> *videoDevices = [AVCaptureDevice devicesWithMediaType:AVMediaTypeVideo];
    for (AVCaptureDevice *dev in videoDevices) {
      string id = dev.uniqueID.UTF8String;
      string name = dev.localizedName.UTF8String;
      string position = (dev.position == AVCaptureDevicePositionFront) ? "front" : "back";
      bool hasFlash = dev.hasFlash;
      bool available = dev.isConnected;
      devices.emplace_back(id, name, position, hasFlash, available);
    }
    return devices;
#endif
  }

  bool selectDevicePlatform(const string &deviceId) override {
#if TARGET_OS_SIMULATOR
    // En simulateur, accepter l'ID fictif sans config AVFoundation
    (void)deviceId;
    selectedSimulator_ = true;
    return true;
#else
    // Refuser si pas de permission caméra
    if (!isCameraAuthorized()) {
      return false;
    }
    // Résoudre l'AVCaptureDevice
    AVCaptureDevice *target = nil;
    for (AVCaptureDevice *dev in [AVCaptureDevice devicesWithMediaType:AVMediaTypeVideo]) {
      if ([[dev uniqueID] isEqualToString:[NSString stringWithUTF8String:deviceId.c_str()]]) {
        target = dev;
        break;
      }
    }
    if (!target) {
      return false;
    }
    if (![target isConnected]) {
      return false;
    }

    NSError *error = nil;
    AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:target error:&error];
    if (error || !input) {
      return false;
    }

    // Remplacer l'input courant de la session
    if (!captureSession_) {
      captureSession_ = NaayaGetSharedSession();
      if (!captureSession_) {
        captureSession_ = [[AVCaptureSession alloc] init];
        captureSession_.sessionPreset = AVCaptureSessionPresetHigh;
        NaayaSetSharedSession(captureSession_, currentInput_);
      }
    }

    {
      SessionConfigurationGuard guard(captureSession_);
      if (currentInput_) {
        // Supprimer l'input courant s'il est présent
        if ([[captureSession_ inputs] containsObject:currentInput_]) {
          [captureSession_ removeInput:currentInput_];
        }
      }
      if ([captureSession_ canAddInput:input]) {
        [captureSession_ addInput:input];
        currentInput_ = input;
        NaayaSetSharedSession(captureSession_, currentInput_);
        return true;
      }
      return false;
    }
#endif
  }

  bool startCameraPlatform() override {
#if TARGET_OS_SIMULATOR
    // Simuler une session active
    if (!captureSession_) {
      captureSession_ = [[AVCaptureSession alloc] init];
      captureSession_.sessionPreset = AVCaptureSessionPresetHigh;
    }
    selectedSimulator_ = true;
    simulatorActive_ = true;
    return true;
#else
    if (!isCameraAuthorized()) {
      return false;
    }
    if (!captureSession_) {
      captureSession_ = [[AVCaptureSession alloc] init];
      captureSession_.sessionPreset = AVCaptureSessionPresetHigh;
    }
    if (![captureSession_ isRunning]) {
      [captureSession_ startRunning];
    }
    return true;
#endif
  }

  bool stopCameraPlatform() override {
#if TARGET_OS_SIMULATOR
    simulatorActive_ = false;
    return true;
#else
    if (captureSession_ && [captureSession_ isRunning]) {
      [captureSession_ stopRunning];
    }
    return true;
#endif
  }

  bool isActivePlatform() const override {
#if TARGET_OS_SIMULATOR
    return simulatorActive_;
#else
    return captureSession_ && [captureSession_ isRunning];
#endif
  }

  vector<CameraFormat> getSupportedFormatsPlatform() const override {
    vector<CameraFormat> formats;
#if TARGET_OS_SIMULATOR
    // Valeurs simulées
    formats.emplace_back(1920, 1080, 30, "420f");
    formats.emplace_back(1280, 720, 60, "420f");
    return formats;
#else
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device) {
      // Choisir le premier device vidéo disponible si aucun input courant
      NSArray<AVCaptureDevice *> *videoDevices = [AVCaptureDevice devicesWithMediaType:AVMediaTypeVideo];
      device = videoDevices.firstObject;
    }
    if (!device) {
      return formats;
    }

    for (AVCaptureDeviceFormat *fmt in device.formats) {
      CMFormatDescriptionRef desc = fmt.formatDescription;
      if (!desc) continue;
      CMVideoDimensions dims = CMVideoFormatDescriptionGetDimensions(desc);
      OSType subtype = CMFormatDescriptionGetMediaSubType(desc);
      std::string pixel = FourCCToString(subtype);

      // Récupérer le fps max supporté pour ce format
      double maxFps = 0.0;
      for (AVFrameRateRange *range in fmt.videoSupportedFrameRateRanges) {
        if (range.maxFrameRate > maxFps) {
          maxFps = range.maxFrameRate;
        }
      }
      int fps = static_cast<int>(floor(maxFps + 1e-6));
      if (fps <= 0) fps = 30; // fallback

      // Éviter les doublons grossiers (même dims/pixel/fps)
      bool exists = false;
      for (const auto &f : formats) {
        if (f.width == dims.width && f.height == dims.height && f.fps == fps && f.pixelFormat == pixel) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        formats.emplace_back(static_cast<int>(dims.width), static_cast<int>(dims.height), fps, pixel);
      }
    }

    // Optionnel: trier par résolution décroissante puis fps
    std::sort(formats.begin(), formats.end(), [](const CameraFormat &a, const CameraFormat &b) {
      if (a.width * a.height != b.width * b.height) return a.width * a.height > b.width * b.height;
      if (a.fps != b.fps) return a.fps > b.fps;
      return a.pixelFormat < b.pixelFormat;
    });

    return formats;
#endif
  }

  bool setFormatPlatform(const CameraFormat &format) override {
    if (!captureSession_) return false;
#if TARGET_OS_SIMULATOR
    (void)format;
    return true;
#else
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device) return false;

    // Trouver un AVCaptureDeviceFormat correspondant aux dimensions (et si possible au pixelFormat)
    AVCaptureDeviceFormat *best = nil;
    double bestFpsMax = 0.0;
    for (AVCaptureDeviceFormat *fmt in device.formats) {
      CMFormatDescriptionRef desc = fmt.formatDescription;
      if (!desc) continue;
      CMVideoDimensions dims = CMVideoFormatDescriptionGetDimensions(desc);
      if (dims.width != format.width || dims.height != format.height) continue;

      // Optionnel: comparer le pixel format si fourni
      bool pixelOk = true;
      if (!format.pixelFormat.empty()) {
        std::string pixel = FourCCToString(CMFormatDescriptionGetMediaSubType(desc));
        pixelOk = (pixel == format.pixelFormat);
      }
      if (!pixelOk) continue;

      // Vérifier la plage de fps et garder celle avec le max le plus élevé (ou qui englobe le fps souhaité)
      double localMax = 0.0;
      bool fpsSupported = false;
      for (AVFrameRateRange *range in fmt.videoSupportedFrameRateRanges) {
        if (range.maxFrameRate > localMax) localMax = range.maxFrameRate;
        if (format.fps >= (int)floor(range.minFrameRate) && format.fps <= (int)ceil(range.maxFrameRate)) {
          fpsSupported = true;
        }
      }

      if (!best || fpsSupported || localMax > bestFpsMax) {
        best = fmt;
        bestFpsMax = localMax;
        if (fpsSupported) {
          // match parfait, on peut sortir si on veut
        }
      }
    }

    if (!best) {
      // Aucun format exact trouvé
      return false;
    }

    NSError *error = nil;
    if (![device lockForConfiguration:&error]) {
      return false;
    }

    // Appliquer la configuration dans une transaction de session
    [captureSession_ beginConfiguration];
    device.activeFormat = best;

    // Déterminer le fps à appliquer (clamp dans la plage supportée)
    double desiredFps = format.fps > 0 ? (double)format.fps : 30.0;
    double minF = 0.0, maxF = 0.0;
    for (AVFrameRateRange *range in best.videoSupportedFrameRateRanges) {
      if (range.maxFrameRate > maxF) maxF = range.maxFrameRate;
      if (minF == 0.0 || range.minFrameRate < minF) minF = range.minFrameRate;
    }
    if (maxF <= 0.0) maxF = 30.0;
    if (minF <= 0.0) minF = 1.0;
    if (desiredFps < minF) desiredFps = minF;
    if (desiredFps > maxF) desiredFps = maxF;

    CMTime frameDuration = CMTimeMake(1, (int32_t)llround(desiredFps));
    device.activeVideoMinFrameDuration = frameDuration;
    device.activeVideoMaxFrameDuration = frameDuration;

    // Optionnel: Ajuster le preset pour des presets connus (sans forcer si incompatible)
    NSString *preset = AVCaptureSessionPresetHigh;
    if (format.width == 1280 && format.height == 720) {
      preset = AVCaptureSessionPreset1280x720;
    } else if (format.width == 1920 && format.height == 1080) {
      preset = AVCaptureSessionPreset1920x1080;
    } else if (format.width == 3840 && format.height == 2160) {
      preset = AVCaptureSessionPreset3840x2160;
    }
    if ([captureSession_ canSetSessionPreset:preset]) {
      // Protéger par un guard pour commit même si exceptions Objective-C
      SessionConfigurationGuard guard(captureSession_);
      captureSession_.sessionPreset = preset;
    }
    // commit déjà effectué par guard
    
    [device unlockForConfiguration];
    return true;
#endif
  }

  // Contrôles avancés iOS via AVCaptureDevice
  bool setZoomLevelPlatform(double level) override {
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device) return false;
    NSError *error = nil;
    if (![device lockForConfiguration:&error]) {
      return false;
    }
    double minZ = 1.0;
    double maxZ = 10.0;
    #if TARGET_OS_IOS
    if (@available(iOS 11.0, *)) {
      if ([device respondsToSelector:@selector(minAvailableVideoZoomFactor)]) {
        minZ = device.minAvailableVideoZoomFactor;
      }
      if ([device respondsToSelector:@selector(maxAvailableVideoZoomFactor)]) {
        maxZ = device.maxAvailableVideoZoomFactor;
      }
    }
    #endif
    double clamped = std::max(minZ, std::min(maxZ, level));
    #if TARGET_OS_IOS
    if (@available(iOS 11.0, *)) {
      device.videoZoomFactor = clamped;
    }
    #endif
    [device unlockForConfiguration];
    return true;
  }
  double getZoomLevelPlatform() const override {
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device) return 1.0;
    #if TARGET_OS_IOS
    if (@available(iOS 11.0, *)) {
      return device.videoZoomFactor;
    }
    #endif
    return 1.0;
  }
  bool setFlashModePlatform(FlashMode mode) override {
    // Le flash mode est appliqué lors de la capture photo (voir PhotoCaptureIOS)
    // Ici on valide juste la capacité du device
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device) return false;
    return device.hasFlash;
  }
  FlashMode getFlashModePlatform() const override {
    return FlashMode::OFF;
  }
  bool setTorchModePlatform(bool enabled) override {
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device || !device.hasTorch) return false;
    NSError *error = nil;
    if (![device lockForConfiguration:&error]) {
      return false;
    }
    BOOL ok = NO;
    if (enabled) {
      if ([device isTorchModeSupported:AVCaptureTorchModeOn]) {
        ok = [device setTorchModeOnWithLevel:AVCaptureMaxAvailableTorchLevel error:&error];
      }
    } else {
      if ([device isTorchModeSupported:AVCaptureTorchModeOff]) {
        device.torchMode = AVCaptureTorchModeOff;
        ok = YES;
      }
    }
    [device unlockForConfiguration];
    return ok;
  }
  bool getTorchModePlatform() const override {
    AVCaptureDevice *device = currentInput_ ? currentInput_.device : nil;
    if (!device || !device.hasTorch) return false;
    #if TARGET_OS_IOS
    return device.torchMode == AVCaptureTorchModeOn;
    #else
    return false;
    #endif
  }

  // Capture (déléguée à Photo/VideoCapture spécialisés iOS)
  bool capturePhotoPlatform(const PhotoCaptureOptions& /*options*/) override { return true; }
  bool startRecordingPlatform(const VideoCaptureOptions& /*options*/) override { return true; }
  bool stopRecordingPlatform() override { return true; }
  bool isRecordingPlatform() const override { return false; }

  // Contrôle du timer (implémentation iOS)
  bool setTimerPlatform(int seconds) override {
   
    return seconds >= 0 && seconds <= 60; // Limite raisonnable pour iOS
  }

  int getTimerPlatform() const override {
   
    return 0; // Par défaut, pas de timer actif
  }

private:
  AVCaptureSession *captureSession_ = nil;
  AVCaptureDeviceInput *currentInput_ = nil;
#if TARGET_OS_SIMULATOR
  bool simulatorActive_ = false;
  bool selectedSimulator_ = false;
#endif
};

// Fabrique iOS
std::unique_ptr<CameraManager> createIOSCameraManager() {
  return std::make_unique<IOSCameraManager>();
}

// Implémentations d'usine pour iOS des contrôleurs
std::unique_ptr<ZoomController> CreateIOSZoomController() {
  class IOSZoomController : public ZoomController {
   protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool setZoomLevelPlatform(double level) override {
      AVCaptureDeviceInput *input = NaayaGetCurrentInput();
      AVCaptureDevice *device = input ? input.device : nil;
      if (!device) return false;
      NSError *error = nil;
      if (![device lockForConfiguration:&error]) return false;
      double minZ = 1.0;
      double maxZ = 10.0;
      #if TARGET_OS_IOS
      if (@available(iOS 11.0, *)) {
        if ([device respondsToSelector:@selector(minAvailableVideoZoomFactor)]) {
          minZ = device.minAvailableVideoZoomFactor;
        }
        if ([device respondsToSelector:@selector(maxAvailableVideoZoomFactor)]) {
          maxZ = device.maxAvailableVideoZoomFactor;
        }
      }
      #endif
      double clamped = std::max(minZ, std::min(maxZ, level));
      #if TARGET_OS_IOS
      if (@available(iOS 11.0, *)) {
        device.videoZoomFactor = clamped;
      }
      #endif
      [device unlockForConfiguration];
      return true;
    }
    std::pair<double,double> getZoomRangePlatform() const override {
      AVCaptureDeviceInput *input = NaayaGetCurrentInput();
      AVCaptureDevice *device = input ? input.device : nil;
      if (!device) return {1.0, 1.0};
      double minZ = 1.0;
      double maxZ = 10.0;
      #if TARGET_OS_IOS
      if (@available(iOS 11.0, *)) {
        if ([device respondsToSelector:@selector(minAvailableVideoZoomFactor)]) {
          minZ = device.minAvailableVideoZoomFactor;
        }
        if ([device respondsToSelector:@selector(maxAvailableVideoZoomFactor)]) {
          maxZ = device.maxAvailableVideoZoomFactor;
        }
      }
      #endif
      return { minZ, maxZ };
    }
    bool zoomToPointPlatform(double, double, double level) override { return setZoomLevelPlatform(level); }
    bool setGestureZoomEnabledPlatform(bool) override { return true; }
    bool setSmoothZoomPlatform(bool, int) override { return true; }
  };
  return std::make_unique<IOSZoomController>();
}

std::unique_ptr<FlashController> CreateIOSFlashController() {
  class IOSFlashController : public FlashController {
   protected:
    bool initializePlatform() override { return true; }
    void shutdownPlatform() override {}
    bool hasFlashPlatform() const override {
      AVCaptureDeviceInput *input = NaayaGetCurrentInput();
      AVCaptureDevice *device = input ? input.device : nil;
      return device && device.hasFlash;
    }
    bool setFlashModePlatform(FlashMode) override { return hasFlashPlatform(); }
    bool setTorchEnabledPlatform(bool enabled) override {
      AVCaptureDeviceInput *input = NaayaGetCurrentInput();
      AVCaptureDevice *device = input ? input.device : nil;
      if (!device || !device.hasTorch) return false;
      NSError *error = nil;
      if (![device lockForConfiguration:&error]) return false;
      BOOL ok = NO;
      if (enabled) {
        if ([device isTorchModeSupported:AVCaptureTorchModeOn]) {
          ok = [device setTorchModeOnWithLevel:AVCaptureMaxAvailableTorchLevel error:&error];
        }
      } else {
        if ([device isTorchModeSupported:AVCaptureTorchModeOff]) {
          device.torchMode = AVCaptureTorchModeOff;
          ok = YES;
        }
      }
      [device unlockForConfiguration];
      return ok;
    }
    bool triggerFlashPlatform() override { return true; }
    bool setFlashIntensityPlatform(double) override { return true; }
    double getFlashIntensityPlatform() const override { return 1.0; }
    bool supportsVariableIntensityPlatform() const override { return false; }
  };
  return std::make_unique<IOSFlashController>();
}



} // namespace Camera


