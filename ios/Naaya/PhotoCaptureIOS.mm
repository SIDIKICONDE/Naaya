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
// Paramètres avancés
typedef struct {
  double brightness;    
  double contrast;      
  double saturation;    
  double hue;           
  double gamma;         
  double warmth;        
  double tint;          
  double exposure;      
  double shadows;       
  double highlights;    
  double vignette;      
  double grain;         
} NaayaAdvancedFilterParams;
bool NaayaFilters_GetAdvancedParams(NaayaAdvancedFilterParams* outParams);
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
  // Appliquer filtre si actif (CoreImage côté capture) avec paramètres avancés si présents
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
        NaayaAdvancedFilterParams adv; BOOL hasAdv = NaayaFilters_GetAdvancedParams(&adv);
        if (!hasAdv) {
          // Fallback simple via l'intensité
          CIFilter* f = [CIFilter filterWithName:@"CIColorControls"]; [f setValue:ci forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputSaturation"]; [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"]; [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"]; out = f.outputImage ?: ci;
        } else {
          // Pipeline avancé aligné sur le preview/vidéo
          CIImage* tmp = ci;
          CIFilter* c = [CIFilter filterWithName:@"CIColorControls"]; [c setValue:tmp forKey:kCIInputImageKey]; [c setValue:@(MAX(-1.0, MIN(1.0, adv.brightness))) forKey:@"inputBrightness"]; [c setValue:@(MAX(0.0, MIN(2.0, adv.contrast))) forKey:@"inputContrast"]; [c setValue:@(MAX(0.0, MIN(2.0, adv.saturation))) forKey:@"inputSaturation"]; tmp = c.outputImage ?: tmp;
          if (fabs(adv.hue) > 0.01) { CIFilter* h = [CIFilter filterWithName:@"CIHueAdjust"]; [h setValue:tmp forKey:kCIInputImageKey]; [h setValue:@(adv.hue * M_PI / 180.0) forKey:@"inputAngle"]; tmp = h.outputImage ?: tmp; }
          if (fabs(adv.gamma - 1.0) > 0.01) { CIFilter* g = [CIFilter filterWithName:@"CIGammaAdjust"]; [g setValue:tmp forKey:kCIInputImageKey]; [g setValue:@(MAX(0.1, MIN(3.0, adv.gamma))) forKey:@"inputPower"]; tmp = g.outputImage ?: tmp; }
          if (fabs(adv.exposure) > 0.01) { CIFilter* e = [CIFilter filterWithName:@"CIExposureAdjust"]; [e setValue:tmp forKey:kCIInputImageKey]; [e setValue:@(MAX(-2.0, MIN(2.0, adv.exposure))) forKey:@"inputEV"]; tmp = e.outputImage ?: tmp; }
          if (fabs(adv.shadows) > 0.01 || fabs(adv.highlights) > 0.01) { CIFilter* sh = [CIFilter filterWithName:@"CIHighlightShadowAdjust"]; [sh setValue:tmp forKey:kCIInputImageKey]; double s = (adv.shadows + 1.0) / 2.0; double hl = (adv.highlights + 1.0) / 2.0; [sh setValue:@(MAX(0.0, MIN(1.0, s))) forKey:@"inputShadowAmount"]; [sh setValue:@(MAX(0.0, MIN(1.0, hl))) forKey:@"inputHighlightAmount"]; tmp = sh.outputImage ?: tmp; }
          if (fabs(adv.warmth) > 0.01 || fabs(adv.tint) > 0.01) { CIFilter* tt = [CIFilter filterWithName:@"CITemperatureAndTint"]; [tt setValue:tmp forKey:kCIInputImageKey]; CGFloat temp = (CGFloat)(6500.0 + adv.warmth * 2000.0); CGFloat tint = (CGFloat)(adv.tint * 50.0); CIVector* neutral = [CIVector vectorWithX:temp Y:tint]; CIVector* target = [CIVector vectorWithX:6500 Y:0]; [tt setValue:neutral forKey:@"inputNeutral"]; [tt setValue:target forKey:@"inputTargetNeutral"]; tmp = tt.outputImage ?: tmp; }
          if (fabs(adv.vignette) > 0.01) { CIFilter* v = [CIFilter filterWithName:@"CIVignette"]; [v setValue:tmp forKey:kCIInputImageKey]; [v setValue:@(MIN(1.0, MAX(0.0, adv.vignette)) * 2.0) forKey:@"inputIntensity"]; [v setValue:@(1.0) forKey:@"inputRadius"]; tmp = v.outputImage ?: tmp; }
          // Grain (bruit superposé)
          if (adv.grain > 0.01) {
            CGRect extent = ci.extent;
            CIFilter* rnd = [CIFilter filterWithName:@"CIRandomGenerator"];
            CIImage* noise = rnd.outputImage;
            if (noise) {
              noise = [noise imageByCroppingToRect:extent];
              CIFilter* ctrl = [CIFilter filterWithName:@"CIColorControls"];
              [ctrl setValue:noise forKey:kCIInputImageKey];
              [ctrl setValue:@(0.0) forKey:@"inputSaturation"];
              [ctrl setValue:@(0.0) forKey:@"inputBrightness"];
              [ctrl setValue:@(1.0 + MIN(1.0, MAX(0.0, adv.grain)) * 0.5) forKey:@"inputContrast"];
              noise = ctrl.outputImage ?: noise;
              CIFilter* blur = [CIFilter filterWithName:@"CIGaussianBlur"];
              [blur setValue:noise forKey:kCIInputImageKey];
              [blur setValue:@(0.5) forKey:@"inputRadius"];
              noise = [blur.outputImage imageByCroppingToRect:extent] ?: noise;
              CIFilter* mat = [CIFilter filterWithName:@"CIColorMatrix"];
              [mat setValue:noise forKey:kCIInputImageKey];
              [mat setValue:[CIVector vectorWithX:1 Y:0 Z:0 W:0] forKey:@"inputRVector"];
              [mat setValue:[CIVector vectorWithX:0 Y:1 Z:0 W:0] forKey:@"inputGVector"];
              [mat setValue:[CIVector vectorWithX:0 Y:0 Z:1 W:0] forKey:@"inputBVector"];
              [mat setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:0] forKey:@"inputAVector"];
              CGFloat alpha = (CGFloat)(MIN(1.0, MAX(0.0, adv.grain)) * 0.18);
              [mat setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:alpha] forKey:@"inputBiasVector"];
              CIImage* noiseA = mat.outputImage ?: noise;
              CIFilter* comp = [CIFilter filterWithName:@"CISourceOverCompositing"];
              [comp setValue:noiseA forKey:kCIInputImageKey];
              [comp setValue:tmp forKey:kCIInputBackgroundImageKey];
              tmp = [comp.outputImage imageByCroppingToRect:extent] ?: tmp;
            }
          }
          out = tmp;
        }
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
          self.data = [NSData dataWithData:(__bridge NSData*)jpegData];
          CFRelease(jpegData);
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
      NSDictionary* props = (__bridge NSDictionary*)CGImageSourceCopyPropertiesAtIndex(src, 0, NULL);
      if (props) {
        NSNumber* w = props[(NSString*)kCGImagePropertyPixelWidth];
        NSNumber* h = props[(NSString*)kCGImagePropertyPixelHeight];
        if (w && h) { self.size = CGSizeMake(w.doubleValue, h.doubleValue); }
      }
      if (props) CFRelease((__bridge CFTypeRef)props);
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
      // Lire le mode flash global défini par le module natif
      int mode = NaayaGetFlashMode(); // 0=off,1=on,2=auto
      AVCaptureFlashMode iosMode = AVCaptureFlashModeOff;
      if (mode == 1) iosMode = AVCaptureFlashModeOn;
      else if (mode == 2) iosMode = AVCaptureFlashModeAuto;

      // Clamp selon les modes supportés
      if (iosMode == AVCaptureFlashModeAuto && ![photoOutput.supportedFlashModes containsObject:@(AVCaptureFlashModeAuto)]) {
        iosMode = [photoOutput.supportedFlashModes containsObject:@(AVCaptureFlashModeOn)] ? AVCaptureFlashModeOn : AVCaptureFlashModeOff;
      }
      if (iosMode == AVCaptureFlashModeOn && ![photoOutput.supportedFlashModes containsObject:@(AVCaptureFlashModeOn)]) {
        iosMode = AVCaptureFlashModeOff;
      }
      settings.flashMode = iosMode;
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


