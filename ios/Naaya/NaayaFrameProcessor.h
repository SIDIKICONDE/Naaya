#pragma once

#ifdef __OBJC__
#import <Foundation/Foundation.h>

// Déclaration compatible Objective‑C/ObjC++
// S'adapte à la présence éventuelle de react-native-vision-camera
#if __has_include("../../node_modules/react-native-vision-camera/ios/FrameProcessors/FrameProcessorPlugin.h")
#import "../../node_modules/react-native-vision-camera/ios/FrameProcessors/FrameProcessorPlugin.h"
@interface NaayaFrameProcessor : FrameProcessorPlugin
#else
@interface NaayaFrameProcessor : NSObject
#endif
@end
#endif // __OBJC__
