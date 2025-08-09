#pragma once

#ifdef __cplusplus
#include <vector>
#include <cstdint>
#include <cmath>
#include <algorithm>

namespace AudioNR {

struct SpectralNRConfig {
    uint32_t sampleRate = 48000;
    size_t fftSize = 1024;       // power of two
    size_t hopSize = 256;        // 75% overlap by default
    double beta = 1.5;           // over-subtraction factor
    double floorGain = 0.05;     // spectral floor (0..1)
    double noiseUpdate = 0.98;   // MCRA smoothing (close to 1)
    bool enabled = false;
};

class SpectralNR {
public:
    explicit SpectralNR(const SpectralNRConfig& cfg);
    ~SpectralNR();

    void setConfig(const SpectralNRConfig& cfg);
    const SpectralNRConfig& getConfig() const { return cfg_; }

    // Mono frame processing; input length arbitrary, output matched
    void process(const float* input, float* output, size_t numSamples);

private:
    SpectralNRConfig cfg_{};
    std::vector<float> window_;
    std::vector<float> inBuf_;
    std::vector<float> outBuf_;
    size_t writePos_ = 0;

    // Noise magnitude estimate per bin
    std::vector<float> noiseMag_;
    bool noiseInit_ = true;

    // FFT buffers (simple Radix-2 Cooley–Tukey placeholder; replace with platform FFT if needed)
    void fft(const std::vector<float>& in, std::vector<float>& re, std::vector<float>& im);
    void ifft(const std::vector<float>& re, const std::vector<float>& im, std::vector<float>& out);
    void buildWindow();
};

} // namespace AudioNR
#endif // __cplusplus


