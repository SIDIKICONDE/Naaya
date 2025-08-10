#if __has_include(<UIKit/UIKit.h>)
#import "NaayaPreviewView.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <QuartzCore/QuartzCore.h>
#import <Metal/Metal.h>
#import "CameraSessionBridge.h"

// API C exposée par le module filtres C++
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
// API de traitement FFmpeg (si disponible)
bool NaayaFilters_ProcessBGRA(const uint8_t* inData,
                              int inStride,
                              int width,
                              int height,
                              double fps,
                              uint8_t* outData,
                              int outStride);
#ifdef __cplusplus
}
#endif

@interface NaayaPreviewView () <AVCaptureVideoDataOutputSampleBufferDelegate>
@property(nonatomic, strong) AVCaptureVideoPreviewLayer* previewLayer;
@property(nonatomic, strong) AVCaptureVideoDataOutput* videoOutput;
@property(nonatomic) dispatch_queue_t videoQueue;
@property(nonatomic, strong) CIContext* ciContext;
@property(nonatomic, strong) CALayer* filteredLayer;
@property(nonatomic, strong) AVSampleBufferDisplayLayer* displayLayer;
@property(nonatomic, strong) CAMetalLayer* metalLayer;
@property(nonatomic, strong) id<MTLDevice> metalDevice;
@property(nonatomic, strong) id<MTLCommandQueue> metalQueue;
@property(nonatomic, strong) CIContext* ciMetalContext;
@property(nonatomic, assign) BOOL usingFilteredPreview;
@end

@implementation NaayaPreviewView

+ (Class)layerClass { return [AVCaptureVideoPreviewLayer class]; }

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) { [self setupPreview]; }
  return self;
}

- (void)awakeFromNib { [super awakeFromNib]; [self setupPreview]; }

- (void)setupPreview {
  AVCaptureSession* session = NaayaGetSharedSession();
  AVCaptureVideoPreviewLayer* layer = (AVCaptureVideoPreviewLayer*)self.layer;
  layer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  layer.session = session;
  self.previewLayer = layer;

  // Couche de rendu filtré superposée
  CALayer* filtered = [CALayer layer];
  filtered.frame = self.bounds;
  filtered.contentsGravity = kCAGravityResizeAspectFill;
  filtered.masksToBounds = YES;
  filtered.opacity = 0.0; // caché par défaut
  [self.layer addSublayer:filtered];
  self.filteredLayer = filtered;

  // Contexte CI
  self.ciContext = [CIContext contextWithOptions:nil];

  // Sortie vidéo (pour frames brutes)
  if (session) {
    AVCaptureVideoDataOutput* output = [[AVCaptureVideoDataOutput alloc] init];
    // Format facile pour CoreImage
    output.videoSettings = @{ (NSString*)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA) };
    output.alwaysDiscardsLateVideoFrames = YES;
    dispatch_queue_t queue = dispatch_queue_create("naaya.camera.videoQueue", DISPATCH_QUEUE_SERIAL);
    [output setSampleBufferDelegate:self queue:queue];
    self.videoQueue = queue;
    if ([session canAddOutput:output]) {
      [session beginConfiguration];
      [session addOutput:output];
      AVCaptureConnection* conn = [output connectionWithMediaType:AVMediaTypeVideo];
      if (conn.isVideoOrientationSupported) {
        conn.videoOrientation = AVCaptureVideoOrientationPortrait;
      }
      [session commitConfiguration];
      self.videoOutput = output;
    }
  }

  // Couche d'affichage vidéo pour éviter CGImage à chaque frame
  self.displayLayer = [AVSampleBufferDisplayLayer layer];
  self.displayLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  self.displayLayer.frame = self.bounds;
  self.displayLayer.hidden = YES;
  [self.layer addSublayer:self.displayLayer];

  // Chemin Metal (rendu GPU natif)
  self.metalDevice = MTLCreateSystemDefaultDevice();
  if (self.metalDevice) {
    self.metalLayer = [CAMetalLayer layer];
    self.metalLayer.device = self.metalDevice;
    self.metalLayer.pixelFormat = MTLPixelFormatBGRA8Unorm;
    self.metalLayer.frame = self.bounds;
    self.metalLayer.contentsScale = [UIScreen mainScreen].scale;
    self.metalLayer.hidden = YES;
    [self.layer addSublayer:self.metalLayer];
    self.metalQueue = [self.metalDevice newCommandQueue];
    self.ciMetalContext = [CIContext contextWithMTLDevice:self.metalDevice options:nil];
  }
}

- (void)layoutSubviews { [super layoutSubviews]; self.previewLayer.frame = self.bounds; self.filteredLayer.frame = self.bounds; self.displayLayer.frame = self.bounds; self.metalLayer.frame = self.bounds; }

#pragma mark - AVCaptureVideoDataOutputSampleBufferDelegate

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
  (void)output; (void)connection;
  BOOL hasFilter = NaayaFilters_HasFilter();
  if (!hasFilter) {
    // Revenir à l'aperçu natif si aucun filtre
    if (self.usingFilteredPreview) {
      dispatch_async(dispatch_get_main_queue(), ^{
        self.filteredLayer.opacity = 0.0;
        if (self.displayLayer) {
          [self.displayLayer flushAndRemoveImage];
          self.displayLayer.hidden = YES;
        }
        if (self.metalLayer) {
          self.metalLayer.hidden = YES;
        }
        self.usingFilteredPreview = NO;
      });
    }
    return;
  }

  const char* cname = NaayaFilters_GetCurrentName();
  double intensity = NaayaFilters_GetCurrentIntensity();
  NSString* name = cname ? [NSString stringWithUTF8String:cname] : @"";
  // Support des paramètres de query sur le nom (ex: lut3d:/path.cube?interp=nearest)
  NSString* query = nil;
  if ([name hasPrefix:@"lut3d:"]) {
    NSRange qpos = [name rangeOfString:@"?"];
    if (qpos.location != NSNotFound) {
      query = [name substringFromIndex:qpos.location + 1];
      name = [name substringToIndex:qpos.location];
    }
  }

  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!pixelBuffer) return;
  
  // === Tentative de traitement via FFmpeg en priorité ===
  BOOL ffmpegProcessed = NO;
  
  // Verrouiller le pixel buffer pour accès direct
  CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
  
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);
  size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);
  uint8_t* baseAddress = (uint8_t*)CVPixelBufferGetBaseAddress(pixelBuffer);
  
  if (baseAddress) {
    // Créer un pixel buffer de sortie
    CVPixelBufferRef outputBuffer = NULL;
    NSDictionary* attrs = @{
      (NSString*)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA),
      (NSString*)kCVPixelBufferWidthKey: @(width),
      (NSString*)kCVPixelBufferHeightKey: @(height),
      (NSString*)kCVPixelBufferIOSurfacePropertiesKey: @{}
    };
    
    CVReturn status = CVPixelBufferCreate(kCFAllocatorDefault,
                                          width, height,
                                          kCVPixelFormatType_32BGRA,
                                          (__bridge CFDictionaryRef)attrs,
                                          &outputBuffer);
    
    if (status == kCVReturnSuccess && outputBuffer) {
      CVPixelBufferLockBaseAddress(outputBuffer, 0);
      uint8_t* outBase = (uint8_t*)CVPixelBufferGetBaseAddress(outputBuffer);
      size_t outStride = CVPixelBufferGetBytesPerRow(outputBuffer);
      
      // Essayer FFmpeg (30 fps par défaut pour preview)
      ffmpegProcessed = NaayaFilters_ProcessBGRA(baseAddress, (int)bytesPerRow,
                                                 (int)width, (int)height, 30.0,
                                                 outBase, (int)outStride);
      
      CVPixelBufferUnlockBaseAddress(outputBuffer, 0);
      
      if (ffmpegProcessed) {
        // Chemin Metal prioritaire si disponible (zéro création de sample buffer)
        if (self.metalDevice && self.metalLayer && self.ciMetalContext && self.metalQueue) {
          id<CAMetalDrawable> drawable = [self.metalLayer nextDrawable];
          if (drawable) {
            CIImage* filteredImage = [CIImage imageWithCVPixelBuffer:outputBuffer];
            if (filteredImage) {
              CGRect extent = filteredImage.extent;
              id<MTLCommandBuffer> cb = [self.metalQueue commandBuffer];
              static CGColorSpaceRef sRGB = NULL;
              if (!sRGB) { sRGB = CGColorSpaceCreateDeviceRGB(); }
              [self.ciMetalContext render:filteredImage
                              toMTLTexture:drawable.texture
                             commandBuffer:cb
                                   bounds:extent
                                colorSpace:sRGB];
              [cb presentDrawable:drawable];
              [cb commit];
              dispatch_async(dispatch_get_main_queue(), ^{
                self.filteredLayer.opacity = 0.0;
                if (self.displayLayer) { [self.displayLayer flushAndRemoveImage]; self.displayLayer.hidden = YES; }
                self.metalLayer.hidden = NO;
                self.usingFilteredPreview = YES;
              });
            }
          }
        } else {
          // Fallback: AVSampleBufferDisplayLayer
          CMVideoFormatDescriptionRef fmtDesc = NULL;
          OSStatus fr = CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault, outputBuffer, &fmtDesc);
          if (fr == noErr && fmtDesc) {
            CMSampleTimingInfo timing = kCMTimingInfoInvalid;
            timing.presentationTimeStamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer);
            CMSampleBufferRef dispSample = NULL;
            OSStatus cr = CMSampleBufferCreateReadyWithImageBuffer(kCFAllocatorDefault, outputBuffer, fmtDesc, &timing, &dispSample);
            if (cr == noErr && dispSample) {
              CFArrayRef attachments = CMSampleBufferGetSampleAttachmentsArray(dispSample, YES);
              if (attachments && CFArrayGetCount(attachments) > 0) {
                CFMutableDictionaryRef dict = (CFMutableDictionaryRef)CFArrayGetValueAtIndex(attachments, 0);
                CFDictionarySetValue(dict, kCMSampleAttachmentKey_DisplayImmediately, kCFBooleanTrue);
              }
              dispatch_async(dispatch_get_main_queue(), ^{
                self.filteredLayer.opacity = 0.0;
                self.displayLayer.hidden = NO;
                [self.displayLayer enqueueSampleBuffer:dispSample];
                self.usingFilteredPreview = YES;
              });
              CFRelease(dispSample);
            }
            CFRelease(fmtDesc);
          }
        }
        CVPixelBufferRelease(outputBuffer);
        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
        return;
      }
      
      CVPixelBufferRelease(outputBuffer);
    }
  }
  
  CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
  
  // === Fallback vers Core Image si FFmpeg non disponible ou échec ===
  CIImage* inputImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
  if (!inputImage) return;

  CIImage* outputImage = inputImage;

  // Mapping des filtres CoreImage (de base)
  if ([name isEqualToString:@"sepia"]) {
    CIFilter* f = [CIFilter filterWithName:@"CISepiaTone"];
    [f setValue:inputImage forKey:kCIInputImageKey];
    [f setValue:@(MAX(0.0, MIN(1.0, intensity))) forKey:kCIInputIntensityKey];
    outputImage = f.outputImage ?: inputImage;
  } else if ([name isEqualToString:@"noir"]) {
    CIFilter* f = [CIFilter filterWithName:@"CIPhotoEffectNoir"];
    [f setValue:inputImage forKey:kCIInputImageKey];
    outputImage = f.outputImage ?: inputImage;
  } else if ([name isEqualToString:@"monochrome"]) {
    CIFilter* f = [CIFilter filterWithName:@"CIColorMonochrome"];
    [f setValue:inputImage forKey:kCIInputImageKey];
    [f setValue:@(1.0) forKey:@"inputIntensity"];
    outputImage = f.outputImage ?: inputImage;
  } else if ([name isEqualToString:@"color_controls"]) {
    // Choisir pipeline en fonction de la présence de paramètres avancés
    NaayaAdvancedFilterParams adv;
    BOOL hasAdv = NaayaFilters_GetAdvancedParams(&adv);
    if (!hasAdv) {
      // Fallback compat: slider d'intensité simple
      CIFilter* f = [CIFilter filterWithName:@"CIColorControls"];
      [f setValue:inputImage forKey:kCIInputImageKey];
      [f setValue:@(1.0) forKey:@"inputSaturation"];
      [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"];
      [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"];
      outputImage = f.outputImage ?: inputImage;
    } else {
      // Pipeline avancé sans double application
      CIImage* tmp = inputImage;
      // 1) Color controls (brightness/contrast/saturation)
      {
        CIFilter* c = [CIFilter filterWithName:@"CIColorControls"];
        [c setValue:tmp forKey:kCIInputImageKey];
        [c setValue:@(MAX(-1.0, MIN(1.0, adv.brightness))) forKey:@"inputBrightness"];
        [c setValue:@(MAX(0.0, MIN(2.0, adv.contrast))) forKey:@"inputContrast"];
        [c setValue:@(MAX(0.0, MIN(2.0, adv.saturation))) forKey:@"inputSaturation"];
        tmp = c.outputImage ?: tmp;
      }
      // 2) Hue (degrés -> radians)
      if (fabs(adv.hue) > 0.01) {
        CIFilter* h = [CIFilter filterWithName:@"CIHueAdjust"];
        [h setValue:tmp forKey:kCIInputImageKey];
        double radians = adv.hue * M_PI / 180.0;
        [h setValue:@(radians) forKey:@"inputAngle"];
        tmp = h.outputImage ?: tmp;
      }
      // 3) Gamma
      if (fabs(adv.gamma - 1.0) > 0.01) {
        CIFilter* g = [CIFilter filterWithName:@"CIGammaAdjust"];
        [g setValue:tmp forKey:kCIInputImageKey];
        [g setValue:@(MAX(0.1, MIN(3.0, adv.gamma))) forKey:@"inputPower"];
        tmp = g.outputImage ?: tmp;
      }
      // 4) Exposition
      if (fabs(adv.exposure) > 0.01) {
        CIFilter* e = [CIFilter filterWithName:@"CIExposureAdjust"];
        [e setValue:tmp forKey:kCIInputImageKey];
        [e setValue:@(MAX(-2.0, MIN(2.0, adv.exposure))) forKey:@"inputEV"];
        tmp = e.outputImage ?: tmp;
      }
      // 5) Shadows/Highlights
      if (fabs(adv.shadows) > 0.01 || fabs(adv.highlights) > 0.01) {
        CIFilter* sh = [CIFilter filterWithName:@"CIHighlightShadowAdjust"];
        [sh setValue:tmp forKey:kCIInputImageKey];
        double s = (adv.shadows + 1.0) / 2.0;
        double hl = (adv.highlights + 1.0) / 2.0;
        [sh setValue:@(MAX(0.0, MIN(1.0, s))) forKey:@"inputShadowAmount"];
        [sh setValue:@(MAX(0.0, MIN(1.0, hl))) forKey:@"inputHighlightAmount"];
        tmp = sh.outputImage ?: tmp;
      }
      // 6) Température & Teinte
      if (fabs(adv.warmth) > 0.01 || fabs(adv.tint) > 0.01) {
        CIFilter* tt = [CIFilter filterWithName:@"CITemperatureAndTint"];
        [tt setValue:tmp forKey:kCIInputImageKey];
        CGFloat temp = (CGFloat)(6500.0 + adv.warmth * 2000.0);
        CGFloat tint = (CGFloat)(adv.tint * 50.0);
        CIVector* neutral = [CIVector vectorWithX:temp Y:tint];
        CIVector* target = [CIVector vectorWithX:6500 Y:0];
        [tt setValue:neutral forKey:@"inputNeutral"];
        [tt setValue:target forKey:@"inputTargetNeutral"];
        tmp = tt.outputImage ?: tmp;
      }
      // 7) Vignette
      if (adv.vignette > 0.01) {
        CIFilter* v = [CIFilter filterWithName:@"CIVignette"];
        [v setValue:tmp forKey:kCIInputImageKey];
        [v setValue:@(MIN(1.0, MAX(0.0, adv.vignette)) * 2.0) forKey:@"inputIntensity"];
        [v setValue:@(1.0) forKey:@"inputRadius"];
        tmp = v.outputImage ?: tmp;
      }
      // 8) Grain (bruit superposé)
      if (adv.grain > 0.01) {
        CGRect extent = inputImage.extent;
        CIFilter* rnd = [CIFilter filterWithName:@"CIRandomGenerator"];
        CIImage* noise = rnd.outputImage;
        if (noise) {
          noise = [noise imageByCroppingToRect:extent];
          // Monochrome et légère douceur
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
          // Fixer alpha via matrice couleur
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
      outputImage = tmp;
    }
  }

  // Rendu vers CGImage (naïf) puis CALayer
  CGRect extent = inputImage.extent;
  CGImageRef cgimg = [self.ciContext createCGImage:outputImage fromRect:extent];
  if (!cgimg) return;
  id contents = (__bridge id)cgimg;
  dispatch_async(dispatch_get_main_queue(), ^{
    self.filteredLayer.frame = self.bounds;
    self.filteredLayer.contents = contents;
    self.filteredLayer.opacity = 1.0;
    self.usingFilteredPreview = YES;
  });
  CGImageRelease(cgimg);
}

@end
#endif


