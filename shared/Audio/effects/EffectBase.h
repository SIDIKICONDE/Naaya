#pragma once

#ifdef __cplusplus
#include <cstdint>
#include <cstddef>

namespace AudioFX {

class IAudioEffect {
public:
  virtual ~IAudioEffect() = default;

  virtual void setSampleRate(uint32_t sampleRate, int numChannels) {
    sampleRate_ = sampleRate > 0 ? sampleRate : 48000;
    channels_ = (numChannels == 1 || numChannels == 2) ? numChannels : 2;
  }

  virtual void setEnabled(bool enabled) { enabled_ = enabled; }
  bool isEnabled() const { return enabled_; }

  // Process mono buffer
  virtual void processMono(const float* input, float* output, size_t numSamples) {
    if (!enabled_ || !input || !output || numSamples == 0) {
      if (output && input && output != input) {
        for (size_t i = 0; i < numSamples; ++i) output[i] = input[i];
      }
      return;
    }
    // Default: passthrough
    if (output != input) {
      for (size_t i = 0; i < numSamples; ++i) output[i] = input[i];
    }
  }

  // Process stereo buffers
  virtual void processStereo(const float* inL, const float* inR,
                             float* outL, float* outR, size_t numSamples) {
    if (!enabled_ || !inL || !inR || !outL || !outR || numSamples == 0) {
      if (outL && inL && outL != inL) {
        for (size_t i = 0; i < numSamples; ++i) outL[i] = inL[i];
      }
      if (outR && inR && outR != inR) {
        for (size_t i = 0; i < numSamples; ++i) outR[i] = inR[i];
      }
      return;
    }
    // Default: passthrough
    if (outL != inL) for (size_t i = 0; i < numSamples; ++i) outL[i] = inL[i];
    if (outR != inR) for (size_t i = 0; i < numSamples; ++i) outR[i] = inR[i];
  }

protected:
  uint32_t sampleRate_ = 48000;
  int channels_ = 2;
  bool enabled_ = true;
};

} // namespace AudioFX

#endif // __cplusplus


