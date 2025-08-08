#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

#include "CameraManagerIOS.h"
#import "CameraSessionBridge.h"

using namespace std;

namespace Camera {

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
  }

  bool selectDevicePlatform(const string &deviceId) override {
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

    [captureSession_ beginConfiguration];
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
      [captureSession_ commitConfiguration];
      return true;
    }
    [captureSession_ commitConfiguration];
    return false;
  }

  bool startCameraPlatform() override {
    if (!captureSession_) {
      captureSession_ = [[AVCaptureSession alloc] init];
      captureSession_.sessionPreset = AVCaptureSessionPresetHigh;
    }
    if (![captureSession_ isRunning]) {
      [captureSession_ startRunning];
    }
    return true;
  }

  bool stopCameraPlatform() override {
    if (captureSession_ && [captureSession_ isRunning]) {
      [captureSession_ stopRunning];
    }
    return true;
  }

  bool isActivePlatform() const override {
    return captureSession_ && [captureSession_ isRunning];
  }

  vector<CameraFormat> getSupportedFormatsPlatform() const override {
    vector<CameraFormat> formats;
    // Si un device courant est sélectionné, exposer quelques presets typiques
    // AVFoundation ne donne pas directement (w,h,fps) ici sans config avancée.
    formats.emplace_back(1920, 1080, 30, "YUV420");
    formats.emplace_back(1280, 720, 60, "YUV420");
    return formats;
  }

  bool setFormatPlatform(const CameraFormat &format) override {
    // Map simple sur les presets standards
    if (!captureSession_) return false;
    NSString *preset = AVCaptureSessionPresetHigh;
    if (format.width == 1280 && format.height == 720) {
      preset = AVCaptureSessionPreset1280x720;
    } else if (format.width == 1920 && format.height == 1080) {
      preset = AVCaptureSessionPreset1920x1080;
    }
    if ([captureSession_ canSetSessionPreset:preset]) {
      [captureSession_ beginConfiguration];
      captureSession_.sessionPreset = preset;
      [captureSession_ commitConfiguration];
      return true;
    }
    return false;
  }

  // Contrôles avancés (stubs minimalistes iOS côté Manager)
  bool setZoomLevelPlatform(double /*level*/) override { return true; }
  double getZoomLevelPlatform() const override { return 1.0; }
  bool setFlashModePlatform(FlashMode /*mode*/) override { return true; }
  FlashMode getFlashModePlatform() const override { return FlashMode::OFF; }
  bool setTorchModePlatform(bool /*enabled*/) override { return false; }
  bool getTorchModePlatform() const override { return false; }

  // Capture (déléguée à Photo/VideoCapture spécialisés iOS)
  bool capturePhotoPlatform(const PhotoCaptureOptions& /*options*/) override { return true; }
  bool startRecordingPlatform(const VideoCaptureOptions& /*options*/) override { return true; }
  bool stopRecordingPlatform() override { return true; }
  bool isRecordingPlatform() const override { return false; }

private:
  AVCaptureSession *captureSession_ = nil;
  AVCaptureDeviceInput *currentInput_ = nil;
};

// Fabrique iOS
std::unique_ptr<CameraManager> createIOSCameraManager() {
  return std::make_unique<IOSCameraManager>();
}

} // namespace Camera


