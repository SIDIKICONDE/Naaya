#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>
#if __has_include(<MobileCoreServices/UTCoreTypes.h>)
#import <MobileCoreServices/UTCoreTypes.h>
#else
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#define kUTTypeJPEG CFSTR("public.jpeg")
#endif
#if __has_include(<MobileCoreServices/MobileCoreServices.h>)
#import <MobileCoreServices/MobileCoreServices.h>
#endif
#import <CoreImage/CoreImage.h>
// Éviter UIKit si indisponible en environnement de lint
#if __has_include(<UIKit/UIKit.h>)
#import <UIKit/UIKit.h>
#endif

#include "PhotoCaptureIOS.h"
#import "CameraSessionBridge.h"

// API C filtres depuis runtime C++
#ifdef __cplusplus
extern "C" {
#endif
bool NaayaFilters_HasFilter(void);
const char* NaayaFilters_GetCurrentName(void);
double NaayaFilters_GetCurrentIntensity(void);
#ifdef __cplusplus
}
#endif

@interface NaayaPhotoDelegate : NSObject <AVCapturePhotoCaptureDelegate>
@property(nonatomic, assign) dispatch_semaphore_t sem;
@property(nonatomic, strong) NSString* outPath;
@property(nonatomic, strong) NSData* data;
@property(nonatomic, assign) CGSize size;
@property(nonatomic, assign) BOOL success;
@end

@implementation NaayaPhotoDelegate
- (void)captureOutput:(AVCapturePhotoOutput *)output didFinishProcessingPhoto:(AVCapturePhoto *)photo error:(NSError *)error {
  if (error) {
    self.success = NO;
    dispatch_semaphore_signal(self.sem);
    return;
  }
  NSData* d = [photo fileDataRepresentation];
  // Appliquer filtre si actif (CI côté capture)
  if (d && NaayaFilters_HasFilter()) {
    CIImage* ci = [CIImage imageWithData:d];
    if (ci) {
      CIContext* ctx = [CIContext contextWithOptions:nil];
      NSString* name = NaayaFilters_GetCurrentName() ? [NSString stringWithUTF8String:NaayaFilters_GetCurrentName()] : @"";
      double intensity = NaayaFilters_GetCurrentIntensity();
      CIImage* out = ci;
      if ([name isEqualToString:@"sepia"]) {
        CIFilter* f = [CIFilter filterWithName:@"CISepiaTone"]; [f setValue:ci forKey:kCIInputImageKey]; [f setValue:@(MAX(0, MIN(1, intensity))) forKey:kCIInputIntensityKey]; out = f.outputImage ?: ci;
      } else if ([name isEqualToString:@"noir"]) {
        CIFilter* f = [CIFilter filterWithName:@"CIPhotoEffectNoir"]; [f setValue:ci forKey:kCIInputImageKey]; out = f.outputImage ?: ci;
      } else if ([name isEqualToString:@"monochrome"]) {
        CIFilter* f = [CIFilter filterWithName:@"CIColorMonochrome"]; [f setValue:ci forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputIntensity"]; out = f.outputImage ?: ci;
      } else if ([name isEqualToString:@"color_controls"]) {
        CIFilter* f = [CIFilter filterWithName:@"CIColorControls"]; [f setValue:ci forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputSaturation"]; [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"]; [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"]; out = f.outputImage ?: ci;
      }
      CGImageRef cg = [ctx createCGImage:out fromRect:out.extent];
      if (cg) {
        // Encodage JPEG sans UIKit
        CFMutableDataRef jpegData = CFDataCreateMutable(kCFAllocatorDefault, 0);
        CGImageDestinationRef dest = CGImageDestinationCreateWithData(jpegData, kUTTypeJPEG, 1, NULL);
        if (dest) {
          const CGFloat quality = 0.95;
          NSDictionary* options = @{ (NSString*)kCGImageDestinationLossyCompressionQuality: @(quality) };
          CGImageDestinationAddImage(dest, cg, (__bridge CFDictionaryRef)options);
          CGImageDestinationFinalize(dest);
          self.data = [NSData dataWithData:(__bridge_transfer NSData*)jpegData];
          CFRelease(dest);
        } else {
          self.data = d;
          CFRelease(jpegData);
        }
        CGImageRelease(cg);
      } else {
        self.data = d;
      }
    } else {
      self.data = d;
    }
  } else {
    self.data = d;
  }
  if (self.data) {
    CGImageSourceRef src = CGImageSourceCreateWithData((__bridge CFDataRef)d, NULL);
    if (src) {
      NSDictionary* props = (__bridge_transfer NSDictionary*)CGImageSourceCopyPropertiesAtIndex(src, 0, NULL);
      if (props) {
        NSNumber* w = props[(NSString*)kCGImagePropertyPixelWidth];
        NSNumber* h = props[(NSString*)kCGImagePropertyPixelHeight];
        if (w && h) { self.size = CGSizeMake(w.doubleValue, h.doubleValue); }
      }
      CFRelease(src);
    }
  }
}
- (void)captureOutput:(AVCapturePhotoOutput *)output didFinishCaptureForResolvedSettings:(AVCaptureResolvedPhotoSettings *)resolvedSettings error:(NSError *)error {
  if (self.data && self.outPath) {
    [self.data writeToFile:self.outPath atomically:YES];
    self.success = YES;
  } else {
    self.success = NO;
  }
  dispatch_semaphore_signal(self.sem);
}
@end

namespace Camera {

class IOSPhotoCapture final : public PhotoCapture {
public:
  IOSPhotoCapture() = default;
  ~IOSPhotoCapture() override = default;

protected:
  bool initializePlatform() override { return true; }

  void shutdownPlatform() override {}

  PhotoResult capturePhotoPlatform(const PhotoCaptureOptions& options) override {
    AVCaptureSession* session = NaayaGetSharedSession();
    if (!session) {
      return PhotoResult{"file:///tmp/naaya-photo.jpg", 1920, 1080, 1024 * 1024};
    }

    AVCapturePhotoOutput* photoOutput = NaayaGetPhotoOutput();
    if (!photoOutput) {
      photoOutput = [[AVCapturePhotoOutput alloc] init];
      if ([session canAddOutput:photoOutput]) {
        [session beginConfiguration];
        [session addOutput:photoOutput];
        [session commitConfiguration];
        NaayaSetPhotoOutput(photoOutput);
      }
    }

    // Préparer chemin de sauvegarde
    std::string dir = this->getSaveDirectory();
    if (dir.empty()) { dir = "/tmp/naaya/photos"; }
    NSString* nsDir = [NSString stringWithUTF8String:dir.c_str()];
    [[NSFileManager defaultManager] createDirectoryAtPath:nsDir withIntermediateDirectories:YES attributes:nil error:nil];
    std::string fileName = this->generateFileName("jpg");
    NSString* nsPath = [nsDir stringByAppendingPathComponent:[NSString stringWithUTF8String:fileName.c_str()]];

    // Délégué de capture synchronisé par sémaphore
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    __block NSData* imageData = nil;
    __block CGSize imageSize = CGSizeMake(0, 0);
    __block BOOL ok = NO;

    NaayaPhotoDelegate* delegate = [NaayaPhotoDelegate new];
    delegate.sem = sem;
    delegate.outPath = nsPath;

    AVCapturePhotoSettings* settings = [AVCapturePhotoSettings photoSettings];
    settings.highResolutionPhotoEnabled = YES;
    // Appliquer le flash mode selon le contrôleur global (via device capabilities)
    AVCaptureDeviceInput* input = NaayaGetCurrentInput();
    AVCaptureDevice* device = input ? input.device : nil;
    if (device && device.hasFlash) {
      // Par défaut, utiliser 'auto' si supporté
      if ([photoOutput.supportedFlashModes containsObject:@(AVCaptureFlashModeAuto)]) {
        settings.flashMode = AVCaptureFlashModeAuto;
      } else if ([photoOutput.supportedFlashModes containsObject:@(AVCaptureFlashModeOn)]) {
        settings.flashMode = AVCaptureFlashModeOn;
      } else {
        settings.flashMode = AVCaptureFlashModeOff;
      }
    } else {
      settings.flashMode = AVCaptureFlashModeOff;
    }
    [photoOutput capturePhotoWithSettings:settings delegate:delegate];

    // Attendre la fin de capture
    dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
    imageData = delegate.data;
    imageSize = delegate.size;
    ok = delegate.success;

    size_t fileSize = 0;
    if (ok) {
      NSDictionary* attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:nsPath error:nil];
      fileSize = (size_t)[attrs fileSize];
    }

    PhotoResult result;
    result.uri = std::string("file://") + nsPath.UTF8String;
    result.width = (int)imageSize.width;
    result.height = (int)imageSize.height;
    result.fileSize = fileSize;
    if (options.base64 && imageData) {
      NSString* b64 = [imageData base64EncodedStringWithOptions:0];
      result.base64 = b64 ? std::string([b64 UTF8String]) : std::string();
    }
    // exif optionnel: laissé vide par simplicité
    return result;
  }

  bool cancelCapturePlatform() override { return true; }
};

std::unique_ptr<PhotoCapture> createIOSPhotoCapture() {
  return std::make_unique<IOSPhotoCapture>();
}

} // namespace Camera


