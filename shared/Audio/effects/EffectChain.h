#pragma once

#ifdef __cplusplus
#include "EffectBase.h"
#include <memory>
#include <vector>

namespace AudioFX {

class EffectChain {
public:
  EffectChain() = default;
  ~EffectChain() = default;

  void setEnabled(bool enabled) { enabled_ = enabled; }
  bool isEnabled() const { return enabled_; }

  void setSampleRate(uint32_t sampleRate, int numChannels) {
    sampleRate_ = sampleRate > 0 ? sampleRate : 48000;
    channels_ = (numChannels == 1 || numChannels == 2) ? numChannels : 2;
    for (auto& e : effects_) if (e) e->setSampleRate(sampleRate_, channels_);
  }

  template <typename T, typename... Args>
  T* emplaceEffect(Args&&... args) {
    auto ptr = std::make_unique<T>(std::forward<Args>(args)...);
    ptr->setSampleRate(sampleRate_, channels_);
    T* raw = ptr.get();
    effects_.push_back(std::move(ptr));
    return raw;
  }

  void clear() { effects_.clear(); }

  void processMono(const float* input, float* output, size_t numSamples) {
    if (!enabled_ || effects_.empty()) {
      if (output != input && input && output) for (size_t i = 0; i < numSamples; ++i) output[i] = input[i];
      return;
    }
    // first effect reads input, others in-place on tmp buffer
    if (!scratch_.size()) scratch_.resize(numSamples);
    // run first
    effects_[0]->processMono(input, output, numSamples);
    // then chain in-place
    for (size_t i = 1; i < effects_.size(); ++i) {
      effects_[i]->processMono(output, output, numSamples);
    }
  }

  void processStereo(const float* inL, const float* inR, float* outL, float* outR, size_t numSamples) {
    if (!enabled_ || effects_.empty()) {
      if (outL != inL && inL && outL) for (size_t i = 0; i < numSamples; ++i) outL[i] = inL[i];
      if (outR != inR && inR && outR) for (size_t i = 0; i < numSamples; ++i) outR[i] = inR[i];
      return;
    }
    effects_[0]->processStereo(inL, inR, outL, outR, numSamples);
    for (size_t i = 1; i < effects_.size(); ++i) {
      effects_[i]->processStereo(outL, outR, outL, outR, numSamples);
    }
  }

private:
  bool enabled_ = true;
  uint32_t sampleRate_ = 48000;
  int channels_ = 2;
  std::vector<std::unique_ptr<IAudioEffect>> effects_;
  std::vector<float> scratch_;
};

} // namespace AudioFX

#endif // __cplusplus


