#include "SpectralNR.h"
#include <cstring>

namespace AudioNR {

static inline float hann(size_t n, size_t N) {
    return 0.5f * (1.0f - std::cos(2.0f * static_cast<float>(M_PI) * static_cast<float>(n) / static_cast<float>(N - 1)));
}

SpectralNR::SpectralNR(const SpectralNRConfig& cfg) { setConfig(cfg); }
SpectralNR::~SpectralNR() = default;

void SpectralNR::setConfig(const SpectralNRConfig& cfg) {
    cfg_ = cfg;
    buildWindow();
    inBuf_.assign(cfg_.fftSize, 0.0f);
    outBuf_.assign(cfg_.fftSize, 0.0f);
    noiseMag_.assign(cfg_.fftSize / 2 + 1, 0.0f);
    writePos_ = 0;
    noiseInit_ = true;
}

void SpectralNR::buildWindow() {
    window_.resize(cfg_.fftSize);
    for (size_t n = 0; n < cfg_.fftSize; ++n) window_[n] = hann(n, cfg_.fftSize);
}

void SpectralNR::fft(const std::vector<float>& in, std::vector<float>& re, std::vector<float>& im) {
    // Naive DFT O(N^2) fallback for simplicity; replace with platform FFT for production
    size_t N = cfg_.fftSize;
    re.assign(N, 0.0f); im.assign(N, 0.0f);
    const double twoPiOverN = 2.0 * M_PI / static_cast<double>(N);
    for (size_t k = 0; k < N; ++k) {
        double sumRe = 0.0, sumIm = 0.0;
        for (size_t n = 0; n < N; ++n) {
            double angle = twoPiOverN * static_cast<double>(k * n);
            sumRe += in[n] * std::cos(angle);
            sumIm -= in[n] * std::sin(angle);
        }
        re[k] = static_cast<float>(sumRe);
        im[k] = static_cast<float>(sumIm);
    }
}

void SpectralNR::ifft(const std::vector<float>& re, const std::vector<float>& im, std::vector<float>& out) {
    size_t N = cfg_.fftSize;
    out.assign(N, 0.0f);
    const double twoPiOverN = 2.0 * M_PI / static_cast<double>(N);
    for (size_t n = 0; n < N; ++n) {
        double sum = 0.0;
        for (size_t k = 0; k < N; ++k) {
            double angle = twoPiOverN * static_cast<double>(k * n);
            sum += re[k] * std::cos(angle) - im[k] * std::sin(angle);
        }
        out[n] = static_cast<float>(sum / static_cast<double>(N));
    }
}

void SpectralNR::process(const float* input, float* output, size_t numSamples) {
    if (!cfg_.enabled) {
        if (output != input) std::memcpy(output, input, numSamples * sizeof(float));
        return;
    }
    size_t pos = 0;
    while (pos < numSamples) {
        size_t toCopy = std::min(cfg_.hopSize, numSamples - pos);
        // Shift buffer left by hop
        std::memmove(inBuf_.data(), inBuf_.data() + cfg_.hopSize, (cfg_.fftSize - cfg_.hopSize) * sizeof(float));
        // Copy new input
        std::memcpy(inBuf_.data() + (cfg_.fftSize - cfg_.hopSize), input + pos, toCopy * sizeof(float));
        if (toCopy < cfg_.hopSize) {
            std::memset(inBuf_.data() + (cfg_.fftSize - cfg_.hopSize + toCopy), 0, (cfg_.hopSize - toCopy) * sizeof(float));
        }

        // Window
        std::vector<float> frame(cfg_.fftSize);
        for (size_t i = 0; i < cfg_.fftSize; ++i) frame[i] = inBuf_[i] * window_[i];

        // FFT
        std::vector<float> re, im;
        fft(frame, re, im);

        // Magnitude and phase
        size_t half = cfg_.fftSize / 2;
        std::vector<float> mag(half + 1), ph(half + 1);
        for (size_t k = 0; k <= half; ++k) {
            float r = re[k]; float ii = im[k];
            mag[k] = std::sqrt(r * r + ii * ii);
            ph[k] = std::atan2(ii, r);
        }

        // Noise estimate (MCRA-like)
        if (noiseInit_) {
            for (size_t k = 0; k <= half; ++k) noiseMag_[k] = mag[k];
            noiseInit_ = false;
        } else {
            for (size_t k = 0; k <= half; ++k) noiseMag_[k] = static_cast<float>(cfg_.noiseUpdate * noiseMag_[k] + (1.0 - cfg_.noiseUpdate) * mag[k]);
        }

        // Spectral subtraction with floor
        for (size_t k = 0; k <= half; ++k) {
            float sub = mag[k] - static_cast<float>(cfg_.beta) * noiseMag_[k];
            if (sub < cfg_.floorGain * noiseMag_[k]) sub = static_cast<float>(cfg_.floorGain * noiseMag_[k]);
            mag[k] = sub;
        }

        // Reconstruct full spectrum (Hermitian for real signal)
        for (size_t k = 0; k <= half; ++k) {
            re[k] = mag[k] * std::cos(ph[k]);
            im[k] = mag[k] * std::sin(ph[k]);
        }
        for (size_t k = half + 1; k < cfg_.fftSize; ++k) {
            size_t kr = cfg_.fftSize - k;
            re[k] = re[kr];
            im[k] = -im[kr];
        }

        // IFFT
        std::vector<float> time;
        ifft(re, im, time);

        // Overlap-add
        if (outBuf_.size() != cfg_.fftSize) outBuf_.assign(cfg_.fftSize, 0.0f);
        for (size_t i = 0; i < cfg_.fftSize; ++i) outBuf_[i] += time[i] * window_[i];

        // Output hop segment
        size_t outCount = std::min(cfg_.hopSize, numSamples - pos);
        std::memcpy(output + pos, outBuf_.data(), outCount * sizeof(float));
        // Shift out buffer left
        std::memmove(outBuf_.data(), outBuf_.data() + cfg_.hopSize, (cfg_.fftSize - cfg_.hopSize) * sizeof(float));
        std::memset(outBuf_.data() + (cfg_.fftSize - cfg_.hopSize), 0, cfg_.hopSize * sizeof(float));

        pos += toCopy;
    }
}

} // namespace AudioNR


