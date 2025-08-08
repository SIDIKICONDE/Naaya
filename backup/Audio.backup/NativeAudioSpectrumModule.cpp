#include "NativeAudioSpectrumModule.h"

#if __APPLE__
extern "C" {
void NaayaAudioSpectrumStart(void);
void NaayaAudioSpectrumStop(void);
size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount);
}
#endif

namespace facebook::react {

NativeAudioSpectrumModule::NativeAudioSpectrumModule(std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeAudioSpectrumModule", jsInvoker) {
  methodMap_["start"] = MethodMetadata{0, [](jsi::Runtime & /*rt*/, TurboModule &tm, const jsi::Value * /*args*/, size_t /*count*/) -> jsi::Value {
    auto &self = static_cast<NativeAudioSpectrumModule &>(tm);
    self.start();
    return jsi::Value::undefined();
  }};

  methodMap_["stop"] = MethodMetadata{0, [](jsi::Runtime & /*rt*/, TurboModule &tm, const jsi::Value * /*args*/, size_t /*count*/) -> jsi::Value {
    auto &self = static_cast<NativeAudioSpectrumModule &>(tm);
    self.stop();
    return jsi::Value::undefined();
  }};

  methodMap_["getData"] = MethodMetadata{0, [](jsi::Runtime &rt, TurboModule &tm, const jsi::Value * /*args*/, size_t /*count*/) -> jsi::Value {
    auto &self = static_cast<NativeAudioSpectrumModule &>(tm);
    return self.getData(rt);
  }};
}

void NativeAudioSpectrumModule::start() {
#if __APPLE__
  NaayaAudioSpectrumStart();
#endif
}

void NativeAudioSpectrumModule::stop() {
#if __APPLE__
  NaayaAudioSpectrumStop();
#endif
}

jsi::Array NativeAudioSpectrumModule::getData(jsi::Runtime &rt) {
  const size_t kMax = 64;
  jsi::Array arr(rt, kMax);
#if __APPLE__
  float buf[kMax];
  size_t n = NaayaAudioSpectrumCopyMagnitudes(buf, kMax);
  for (size_t i = 0; i < kMax; ++i) {
    double v = i < n ? static_cast<double>(buf[i]) : 0.0;
    arr.setValueAtIndex(rt, i, jsi::Value(v));
  }
#else
  for (size_t i = 0; i < kMax; ++i) {
    arr.setValueAtIndex(rt, i, jsi::Value(0));
  }
#endif
  return arr;
}

} // namespace facebook::react


