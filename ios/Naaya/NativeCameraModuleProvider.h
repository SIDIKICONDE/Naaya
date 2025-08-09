#ifdef __OBJC__
#import <Foundation/Foundation.h>

#if __has_include(<ReactCommon/RCTTurboModule.h>)
#import <ReactCommon/RCTTurboModule.h>
#else
@protocol RCTModuleProvider;
#endif

NS_ASSUME_NONNULL_BEGIN

// Adopte le protocole uniquement si disponible pour éviter les avertissements du linter
#if __has_include(<ReactCommon/RCTTurboModule.h>)
@interface NativeCameraModuleProvider : NSObject <RCTModuleProvider>
#else
@interface NativeCameraModuleProvider : NSObject
#endif
@end

#if __has_include(<ReactCommon/RCTTurboModule.h>)
@interface NativeCameraFiltersModuleProvider : NSObject <RCTModuleProvider>
#else
@interface NativeCameraFiltersModuleProvider : NSObject
#endif
@end

// Provider pour le module Turbo C++ d'égaliseur audio
#if __has_include(<ReactCommon/RCTTurboModule.h>)
@interface NativeAudioEqualizerModuleProvider : NSObject <RCTModuleProvider>
#else
@interface NativeAudioEqualizerModuleProvider : NSObject
#endif
@end

NS_ASSUME_NONNULL_END
#endif
