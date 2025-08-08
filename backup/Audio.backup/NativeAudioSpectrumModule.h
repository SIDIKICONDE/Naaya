#pragma once

#include <NaayaJSI.h>

#include <jsi/jsi.h>
#include <ReactCommon/TurboModule.h>
#include <ReactCommon/TurboModuleUtils.h>
#include <memory>

namespace facebook::react {

class JSI_EXPORT NativeAudioSpectrumModule : public TurboModule {
public:
  explicit NativeAudioSpectrumModule(std::shared_ptr<CallInvoker> jsInvoker);

  static constexpr auto kModuleName = "NativeAudioSpectrumModule";

private:
  // Méthodes internes
  void start();
  void stop();
  jsi::Array getData(jsi::Runtime &rt);
};

} // namespace facebook::react


