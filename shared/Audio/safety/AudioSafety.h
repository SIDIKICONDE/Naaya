#pragma once

#ifdef __cplusplus

#include <vector>
#include <cstdint>
#include <cmath>
#include <algorithm>

namespace AudioSafety {

struct SafetyConfig {
    bool enabled = true;
    // DC removal
    bool dcRemovalEnabled = true;
    double dcThreshold = 0.002; // linear (~-54 dBFS)
    // Limiter
    bool limiterEnabled = true;
    double limiterThresholdDb = -1.0; // dBFS
    bool softKneeLimiter = true;
    double kneeWidthDb = 6.0;
    // Feedback detection
    bool feedbackDetectEnabled = true;
    double feedbackCorrThreshold = 0.95; // normalized autocorrelation
};

struct SafetyReport {
    double peak = 0.0;
    double rms = 0.0;
    double dcOffset = 0.0;
    uint32_t clippedSamples = 0;
    bool overloadActive = false;
    double feedbackScore = 0.0; // 0..1
    bool hasNaN = false;
};

class AudioSafetyEngine {
public:
    AudioSafetyEngine(uint32_t sampleRate, int channels);
    ~AudioSafetyEngine();

    void setSampleRate(uint32_t sr);
    void setConfig(const SafetyConfig& cfg);
    const SafetyConfig& getConfig() const { return config_; }
    SafetyReport getLastReport() const { return report_; }

    void processMono(float* buffer, size_t numSamples);
    void processStereo(float* left, float* right, size_t numSamples);

private:
    uint32_t sampleRate_;
    int channels_;
    SafetyConfig config_{};
    SafetyReport report_{};
    double limiterThresholdLin_ = 0.89; // from dB

    // Helpers
    inline double dbToLin(double dB) const { return std::pow(10.0, dB / 20.0); }
    void analyzeAndClean(float* x, size_t n);
    void dcRemove(float* x, size_t n, double mean);
    void limitBuffer(float* x, size_t n);
    double estimateFeedbackScore(const float* x, size_t n);
};

} // namespace AudioSafety

#endif // __cplusplus


