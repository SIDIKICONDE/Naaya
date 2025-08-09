#import "NativeCameraModuleProvider.h"

#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>
#import "../../shared/NativeCameraModule.h"
#import "../../shared/NativeCameraFiltersModule.h"
#import "../../shared/NativeAudioEqualizerModule.h"

@implementation NativeCameraModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCameraModule>(params.jsInvoker);
}

@end

@implementation NativeCameraFiltersModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCameraFiltersModule>(params.jsInvoker);
}

@end

@implementation NativeAudioEqualizerModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeAudioEqualizerModule>(params.jsInvoker);
}

@end
