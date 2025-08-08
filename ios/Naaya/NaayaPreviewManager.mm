#if __has_include(<UIKit/UIKit.h>)
#import "NaayaPreviewManager.h"
#import "NaayaPreviewView.h"

@implementation NaayaPreviewManager

RCT_EXPORT_MODULE(NaayaPreview)

- (UIView *)view {
  return [[NaayaPreviewView alloc] initWithFrame:CGRectZero];
}

@end
#endif


