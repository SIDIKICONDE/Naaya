#import "NativeCameraModuleProvider.h"

// Environnements où les headers React peuvent ne pas être résolus par l'analyseur (lint)
// Utiliser des gardes pour éviter les faux positifs tout en conservant la compilation Xcode.
#if __has_include(<ReactCommon/RCTTurboModule.h>)
#import <ReactCommon/RCTTurboModule.h>
#endif
#if __has_include(<ReactCommon/CallInvoker.h>)
#import <ReactCommon/CallInvoker.h>
#endif
#if __has_include(<ReactCommon/TurboModule.h>)
#import <ReactCommon/TurboModule.h>
#endif
#include <memory>

// Fallback minimal pour l'analyse statique quand les headers ci-dessus ne sont pas disponibles
#if !__has_include(<ReactCommon/RCTTurboModule.h>) || !__has_include(<ReactCommon/TurboModule.h>)
namespace facebook { namespace react {
class CallInvoker { public: virtual ~CallInvoker() = default; };
class TurboModule {
 public:
  virtual ~TurboModule() = default;
 protected:
  explicit TurboModule(const char*, std::shared_ptr<CallInvoker> = nullptr) {}
};
class ObjCTurboModule {
 public:
  struct InitParams {
    std::shared_ptr<CallInvoker> jsInvoker;
  };
};
}} // namespace facebook::react
#endif

// Inclure les headers C++ des modules si disponibles, sinon fournir des stubs compatibles
#if __has_include("../../shared/NativeCameraModule.h")
#import "../../shared/NativeCameraModule.h"
#endif

// Si le header existe mais le module est désactivé (en-têtes manquants), fournir un stub compatible
#if defined(NAAYA_CAMERA_MODULE_ENABLED) && (NAAYA_CAMERA_MODULE_ENABLED == 0)
namespace facebook { namespace react {
class NativeCameraModule : public TurboModule {
 public:
  explicit NativeCameraModule(std::shared_ptr<CallInvoker>) : TurboModule("NativeCameraModule", nullptr) {}
};
}} // namespace facebook::react
#endif

#if __has_include("../../shared/NativeCameraFiltersModule.h")
#import "../../shared/NativeCameraFiltersModule.h"
#endif

#if defined(NAAYA_CAMERA_FILTERS_ENABLED) && (NAAYA_CAMERA_FILTERS_ENABLED == 0)
namespace facebook { namespace react {
class NativeCameraFiltersModule : public TurboModule {
 public:
  explicit NativeCameraFiltersModule(std::shared_ptr<CallInvoker>) : TurboModule("NativeCameraFiltersModule", nullptr) {}
};
}} // namespace facebook::react
#endif

#if __has_include("../../shared/NativeAudioEqualizerModule.h")
#import "../../shared/NativeAudioEqualizerModule.h"
#endif

// Pas de stub par macro: le provider retournera nullptr si le header n'est pas disponible


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
  #if __has_include("../../shared/NativeAudioEqualizerModule.h")
    return std::make_shared<facebook::react::NativeAudioEqualizerModule>(params.jsInvoker);
  #else
    return nullptr;
  #endif
}

@end
