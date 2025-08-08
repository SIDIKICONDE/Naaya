#if __has_include(<UIKit/UIKit.h>)
#import "NaayaPreviewView.h"
#import <AVFoundation/AVFoundation.h>
#import "CameraSessionBridge.h"

@interface NaayaPreviewView ()
@property(nonatomic, strong) AVCaptureVideoPreviewLayer* previewLayer;
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
}

- (void)layoutSubviews { [super layoutSubviews]; self.previewLayer.frame = self.bounds; }

@end
#else
#import "NaayaPreviewView.h"
@implementation NaayaPreviewView @end
#endif


