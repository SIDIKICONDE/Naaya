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

  // Mapping basique des filtres CoreImage
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
    CIFilter* f = [CIFilter filterWithName:@"CIColorControls"];
    [f setValue:inputImage forKey:kCIInputImageKey];
    [f setValue:@(1.0) forKey:@"inputSaturation"];
    [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"];
    [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"];
    outputImage = f.outputImage ?: inputImage;
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


