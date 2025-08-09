#pragma once

#ifdef __cplusplus
#include <vector>
#include <memory>
#include <cmath>
#include "../core/BiquadFilter.h"

namespace AudioNR {

struct NoiseReducerConfig {
    // Gate/expander
    double thresholdDb = -50.0;   // dBFS threshold below which expansion starts
    double ratio = 2.0;           // downward expander ratio (>1)
    double floorDb = -20.0;       // max attenuation in dB (e.g., -20 dB)
    double attackMs = 5.0;        // envelope/gain attack
    double releaseMs = 60.0;      // envelope/gain release

    // Pre-filter
    double highPassHz = 80.0;     // rumble removal
    bool enableHighPass = true;

    // Enable/disable
    bool enabled = false;
};

class NoiseReducer {
public:
    NoiseReducer(uint32_t sampleRate, int numChannels);
    ~NoiseReducer();

    void setConfig(const NoiseReducerConfig& cfg);
    const NoiseReducerConfig& getConfig() const { return config_; }

    void setSampleRate(uint32_t sampleRate);
    uint32_t getSampleRate() const { return sampleRate_; }

    // Process in-place or out-of-place
    void processMono(const float* input, float* output, size_t numSamples);
    void processStereo(const float* inL, const float* inR, float* outL, float* outR, size_t numSamples);

private:
    uint32_t sampleRate_;
    int channels_;
    NoiseReducerConfig config_{};

    // Per-channel filters and states
    struct ChannelState {
        std::unique_ptr<AudioEqualizer::BiquadFilter> highPass;
        double env = 0.0;      // envelope follower (linear)
        double gain = 1.0;     // smoothed gain (linear)
    };
    std::vector<ChannelState> ch_;

    // Cached coeffs
    double threshLin_ = 0.003;       // from dB
    double floorLin_ = 0.1;          // from dB
    double attackCoeffEnv_ = 0.9;    // envelope attack coeff
    double releaseCoeffEnv_ = 0.99;  // envelope release coeff
    double attackCoeffGain_ = 0.8;   // gain attack (increase)
    double releaseCoeffGain_ = 0.98; // gain release (decrease)

    void updateDerived();
    inline double dbToLin(double dB) const { return std::pow(10.0, dB / 20.0); }
    inline double linToDb(double lin) const { return 20.0 * std::log10(std::max(lin, 1e-10)); }
    inline double coefForMs(double ms) const {
        double T = std::max(ms, 0.1) / 1000.0;
        return std::exp(-1.0 / (T * static_cast<double>(sampleRate_)));
    }
    void ensureFilters();
    void processChannel(const float* in, float* out, size_t n, ChannelState& st);
};

} // namespace AudioNR
#endif // __cplusplus
