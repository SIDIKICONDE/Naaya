#import <Foundation/Foundation.h>
#if __has_include(<jsi/jsi.h>)
#import <jsi/jsi.h>
using namespace facebook;
#endif
#if __has_include(<TargetConditionals.h>)
#import <TargetConditionals.h>
#endif

#if __has_include("../../node_modules/react-native-vision-camera/ios/FrameProcessors/Frame.h")
#import "../../node_modules/react-native-vision-camera/ios/FrameProcessors/Frame.h"
#import "../../node_modules/react-native-vision-camera/ios/FrameProcessors/FrameProcessorPlugin.h"
#define NAAYA_HAS_VISION_CAMERA 1
#else
#define NAAYA_HAS_VISION_CAMERA 0
// Stubs pour compilation hors iOS/CI linter
@interface FrameProcessorPlugin : NSObject @end
@implementation FrameProcessorPlugin @end
#define VISION_EXPORT_FRAME_PROCESSOR(a, b)
@interface Frame : NSObject
@property(nonatomic, readonly) size_t width;
@property(nonatomic, readonly) size_t height;
@end
#endif

#include "../../shared/Camera/utils/FrameBridge.hpp"

@interface NaayaFrameProcessor : FrameProcessorPlugin
@end

@implementation NaayaFrameProcessor

- (id)callback:(Frame *)frame withArguments:(NSDictionary * _Nullable)arguments {
  // Enregistre largeur/hauteur côté C++ (debug)
  Camera::Bridge::submitFrameInfo((int)frame.width, (int)frame.height);
  return @(frame.width);
}

VISION_EXPORT_FRAME_PROCESSOR(NaayaFrameProcessor, naayaProcessFrame)

@end


