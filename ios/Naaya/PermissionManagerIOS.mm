#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

#if __has_include(<UIKit/UIKit.h>)
#import <UIKit/UIKit.h>
#define NAAYA_HAS_UIKIT 1
#else
#define NAAYA_HAS_UIKIT 0
#endif

#include "PermissionManagerIOS.h"
// Assurer la présence de <memory> pour std::unique_ptr
#include <memory>

namespace Camera {

class IOSPermissionManager final : public PermissionManager {
public:
  IOSPermissionManager() = default;
  ~IOSPermissionManager() override = default;

protected:
  bool initializePlatform() override { return true; }
  void shutdownPlatform() override {}

  CameraPermissions checkPermissionsPlatform() override {
    CameraPermissions p;
    // Caméra
    AVAuthorizationStatus cam = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
    p.camera = mapStatus(cam);
    // Micro
    AVAuthorizationStatus mic = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
    p.microphone = mapStatus(mic);
    // Stockage: iOS ne requiert pas de permission générique pour écrire dans le sandbox
    p.storage = PermissionStatus::GRANTED;
    return p;
  }

  CameraPermissions requestPermissionsPlatform() override {
    CameraPermissions result = checkPermissionsPlatform();
    // Demander caméra si nécessaire (synchrone via sémaphore GCD)
    if (result.camera == PermissionStatus::NOT_DETERMINED) {
      __block AVAuthorizationStatus st = AVAuthorizationStatusNotDetermined;
      dispatch_semaphore_t sem = dispatch_semaphore_create(0);
      [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
        st = granted ? AVAuthorizationStatusAuthorized : AVAuthorizationStatusDenied;
        dispatch_semaphore_signal(sem);
      }];
      dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
      result.camera = mapStatus(st);
    }
    // Demander micro si nécessaire
    if (result.microphone == PermissionStatus::NOT_DETERMINED) {
      __block AVAuthorizationStatus st = AVAuthorizationStatusNotDetermined;
      dispatch_semaphore_t sem = dispatch_semaphore_create(0);
      [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) {
        st = granted ? AVAuthorizationStatusAuthorized : AVAuthorizationStatusDenied;
        dispatch_semaphore_signal(sem);
      }];
      dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
      result.microphone = mapStatus(st);
    }
    result.storage = PermissionStatus::GRANTED;
    return result;
  }

  PermissionStatus requestPermissionPlatform(const std::string& permission) override {
    if (permission == "camera") {
      (void)requestPermissionsPlatform();
      return checkPermissionsPlatform().camera;
    }
    if (permission == "microphone") {
      (void)requestPermissionsPlatform();
      return checkPermissionsPlatform().microphone;
    }
    return PermissionStatus::GRANTED;
  }

  void showPermissionAlertPlatform(const CameraPermissions& /*permissions*/) override {
#if NAAYA_HAS_UIKIT
    NSString* msg = @"L'accès à la caméra/micro est requis pour utiliser cette fonctionnalité.";
    UIAlertController* alert = [UIAlertController alertControllerWithTitle:@"Permission requise"
                                                                   message:msg
                                                            preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:nil]];
    UIWindow* key = UIApplication.sharedApplication.keyWindow;
    [key.rootViewController presentViewController:alert animated:YES completion:nil];
#else
    // En environnement sans UIKit (linter/CI), ne rien faire
#endif
  }

  bool openAppSettingsPlatform() override {
#if NAAYA_HAS_UIKIT
    NSURL* url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
    if ([[UIApplication sharedApplication] canOpenURL:url]) {
      [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
      return true;
    }
    return false;
#else
    return false;
#endif
  }

  bool canRequestPermissionPlatform(const std::string& permission) const override {
    if (permission == "camera") {
      AVAuthorizationStatus s = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
      return s == AVAuthorizationStatusNotDetermined;
    }
    if (permission == "microphone") {
      AVAuthorizationStatus s = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio];
      return s == AVAuthorizationStatusNotDetermined;
    }
    return true;
  }

private:
  static PermissionStatus mapStatus(AVAuthorizationStatus s) {
    switch (s) {
      case AVAuthorizationStatusAuthorized: return PermissionStatus::GRANTED;
      case AVAuthorizationStatusDenied: return PermissionStatus::DENIED;
      case AVAuthorizationStatusRestricted: return PermissionStatus::RESTRICTED;
      case AVAuthorizationStatusNotDetermined: default: return PermissionStatus::NOT_DETERMINED;
    }
  }
};

std::unique_ptr<PermissionManager> createIOSPermissionManager() {
  return std::unique_ptr<PermissionManager>(new IOSPermissionManager());
}

} // namespace Camera


