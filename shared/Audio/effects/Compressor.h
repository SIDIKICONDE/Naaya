#pragma once

#ifdef __cplusplus
#include "EffectBase.h"
#include <algorithm>
#include <cmath>

namespace AudioFX {

class CompressorEffect final : public IAudioEffect {
public:
  void setParameters(double thresholdDb, double ratio, double attackMs, double releaseMs, double makeupDb) {
    thresholdDb_ = thresholdDb;
    ratio_ = std::max(1.0, ratio);
    attackMs_ = std::max(0.1, attackMs);
    releaseMs_ = std::max(0.1, releaseMs);
    makeupDb_ = makeupDb;
    updateCoefficients();
  }

  void setSampleRate(uint32_t sampleRate, int numChannels) override {
    IAudioEffect::setSampleRate(sampleRate, numChannels);
    updateCoefficients();
    envL_ = envR_ = 0.0;
    gainL_ = gainR_ = 1.0;
  }

  void processMono(const float* input, float* output, size_t numSamples) override {
    if (!isEnabled() || !input || !output || numSamples == 0) {
      if (output != input && input && output) for (size_t i = 0; i < numSamples; ++i) output[i] = input[i];
      return;
    }
    for (size_t i = 0; i < numSamples; ++i) {
      double x = static_cast<double>(input[i]);
      double ax = std::abs(x) + 1e-12;
      // envelope follower
      double coeff = (ax > envL_) ? attackCoeff_ : releaseCoeff_;
      envL_ = coeff * envL_ + (1.0 - coeff) * ax;
      double levelDb = 20.0 * std::log10(envL_);
      // static curve
      double outDb = levelDb;
      if (levelDb > thresholdDb_) {
        outDb = thresholdDb_ + (levelDb - thresholdDb_) / ratio_;
      }
      double gainDb = (outDb - levelDb) + makeupDb_;
      double gTarget = std::pow(10.0, gainDb / 20.0);
      // smooth gain (faster up than down)
      double gCoeff = (gTarget > gainL_) ? gainAttackCoeff_ : gainReleaseCoeff_;
      gainL_ = gCoeff * gainL_ + (1.0 - gCoeff) * gTarget;
      double y = x * gainL_;
      output[i] = static_cast<float>(y);
    }
  }

  void processStereo(const float* inL, const float* inR, float* outL, float* outR, size_t numSamples) override {
    if (!isEnabled() || !inL || !inR || !outL || !outR || numSamples == 0) {
      if (outL != inL && inL && outL) for (size_t i = 0; i < numSamples; ++i) outL[i] = inL[i];
      if (outR != inR && inR && outR) for (size_t i = 0; i < numSamples; ++i) outR[i] = inR[i];
      return;
    }
    for (size_t i = 0; i < numSamples; ++i) {
      double xl = static_cast<double>(inL[i]);
      double xr = static_cast<double>(inR[i]);
      double ax = 0.5 * (std::abs(xl) + std::abs(xr)) + 1e-12;
      double coeff = (ax > envL_) ? attackCoeff_ : releaseCoeff_;
      envL_ = coeff * envL_ + (1.0 - coeff) * ax;
      double levelDb = 20.0 * std::log10(envL_);
      double outDb = levelDb;
      if (levelDb > thresholdDb_) outDb = thresholdDb_ + (levelDb - thresholdDb_) / ratio_;
      double gainDb = (outDb - levelDb) + makeupDb_;
      double gTarget = std::pow(10.0, gainDb / 20.0);
      double gCoeff = (gTarget > gainL_) ? gainAttackCoeff_ : gainReleaseCoeff_;
      gainL_ = gCoeff * gainL_ + (1.0 - gCoeff) * gTarget;
      outL[i] = static_cast<float>(xl * gainL_);
      outR[i] = static_cast<float>(xr * gainL_);
    }
  }

private:
  void updateCoefficients() {
    auto coefForMs = [this](double ms) {
      double T = std::max(0.1, ms) / 1000.0;
      return std::exp(-1.0 / (T * static_cast<double>(sampleRate_)));
    };
    attackCoeff_ = coefForMs(attackMs_);
    releaseCoeff_ = coefForMs(releaseMs_);
    gainAttackCoeff_ = coefForMs(std::max(1.0, attackMs_ * 0.5));
    gainReleaseCoeff_ = coefForMs(std::max(5.0, releaseMs_));
  }

  // params
  double thresholdDb_ = -18.0;
  double ratio_ = 3.0;
  double attackMs_ = 10.0;
  double releaseMs_ = 80.0;
  double makeupDb_ = 0.0;

  // state
  double envL_ = 0.0;
  double envR_ = 0.0;
  double gainL_ = 1.0;
  double gainR_ = 1.0;
  double attackCoeff_ = 0.9;
  double releaseCoeff_ = 0.99;
  double gainAttackCoeff_ = 0.8;
  double gainReleaseCoeff_ = 0.98;
};

} // namespace AudioFX

#endif // __cplusplus


