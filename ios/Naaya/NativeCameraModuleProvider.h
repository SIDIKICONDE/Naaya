#import <Foundation/Foundation.h>
#import <ReactCommon/RCTTurboModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface NativeCameraModuleProvider : NSObject <RCTModuleProvider>
@end

@interface NativeCameraFiltersModuleProvider : NSObject <RCTModuleProvider>
@end


// Provider pour le module Turbo C++ d'égaliseur audio
@interface NativeAudioEqualizerModuleProvider : NSObject <RCTModuleProvider>
@end

NS_ASSUME_NONNULL_END
