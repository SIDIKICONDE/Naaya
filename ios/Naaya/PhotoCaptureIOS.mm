#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>

#include "PhotoCaptureIOS.h"
#import "CameraSessionBridge.h"

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
  self.data = d;
  if (d) {
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


