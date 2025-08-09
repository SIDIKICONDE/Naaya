#if __has_include(<UIKit/UIKit.h>)
#import "NaayaPreviewView.h"
#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <QuartzCore/QuartzCore.h>
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
#ifdef __cplusplus
}
#endif

@interface NaayaPreviewView () <AVCaptureVideoDataOutputSampleBufferDelegate>
@property(nonatomic, strong) AVCaptureVideoPreviewLayer* previewLayer;
@property(nonatomic, strong) AVCaptureVideoDataOutput* videoOutput;
@property(nonatomic) dispatch_queue_t videoQueue;
@property(nonatomic, strong) CIContext* ciContext;
@property(nonatomic, strong) CALayer* filteredLayer;
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
}

- (void)layoutSubviews { [super layoutSubviews]; self.previewLayer.frame = self.bounds; }

#pragma mark - AVCaptureVideoDataOutputSampleBufferDelegate

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
  (void)output; (void)connection;
  BOOL hasFilter = NaayaFilters_HasFilter();
  if (!hasFilter) {
    // Revenir à l'aperçu natif si aucun filtre
    if (self.usingFilteredPreview) {
      dispatch_async(dispatch_get_main_queue(), ^{
        self.filteredLayer.opacity = 0.0;
        self.usingFilteredPreview = NO;
      });
    }
    return;
  }

  const char* cname = NaayaFilters_GetCurrentName();
  double intensity = NaayaFilters_GetCurrentIntensity();
  NSString* name = cname ? [NSString stringWithUTF8String:cname] : @"";

  CVImageBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!pixelBuffer) return;

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
#else
#import "NaayaPreviewView.h"
@implementation NaayaPreviewView @end
#endif


