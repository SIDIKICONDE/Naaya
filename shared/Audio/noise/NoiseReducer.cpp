#include "NoiseReducer.h"

namespace AudioNR {

NoiseReducer::NoiseReducer(uint32_t sampleRate, int numChannels)
    : sampleRate_(sampleRate), channels_(numChannels) {
    if (channels_ < 1) channels_ = 1;
    if (channels_ > 2) channels_ = 2;
    ch_.resize(static_cast<size_t>(channels_));
    ensureFilters();
    updateDerived();
}

NoiseReducer::~NoiseReducer() = default;

void NoiseReducer::setSampleRate(uint32_t sampleRate) {
    if (sampleRate_ == sampleRate) return;
    sampleRate_ = sampleRate;
    ensureFilters();
    updateDerived();
}

void NoiseReducer::setConfig(const NoiseReducerConfig& cfg) {
    config_ = cfg;
    ensureFilters();
    updateDerived();
}

void NoiseReducer::updateDerived() {
    threshLin_ = dbToLin(config_.thresholdDb);
    floorLin_ = dbToLin(config_.floorDb);
    // Envelope follower coefficients
    attackCoeffEnv_ = coefForMs(config_.attackMs);
    releaseCoeffEnv_ = coefForMs(config_.releaseMs);
    // Gain smoothing coefficients (slightly faster attack than release)
    attackCoeffGain_ = coefForMs(std::max(1.0, config_.attackMs * 0.5));
    releaseCoeffGain_ = coefForMs(std::max(5.0, config_.releaseMs));
}

void NoiseReducer::ensureFilters() {
    for (auto& st : ch_) {
        if (config_.enableHighPass) {
            if (!st.highPass) st.highPass = std::make_unique<AudioEqualizer::BiquadFilter>();
            st.highPass->calculateHighpass(config_.highPassHz, sampleRate_, 0.707);
        } else {
            st.highPass.reset();
        }
    }
}

void NoiseReducer::processMono(const float* input, float* output, size_t numSamples) {
    if (!config_.enabled) {
        if (output != input) std::memcpy(output, input, numSamples * sizeof(float));
        return;
    }
    processChannel(input, output, numSamples, ch_[0]);
}

void NoiseReducer::processStereo(const float* inL, const float* inR, float* outL, float* outR, size_t numSamples) {
    if (!config_.enabled) {
        if (outL != inL) std::memcpy(outL, inL, numSamples * sizeof(float));
        if (outR != inR) std::memcpy(outR, inR, numSamples * sizeof(float));
        return;
    }
    processChannel(inL, outL, numSamples, ch_[0]);
    processChannel(inR, outR, numSamples, ch_[1]);
}

void NoiseReducer::processChannel(const float* in, float* out, size_t n, ChannelState& st) {
    // Optional high-pass pre-filter to remove rumble
    if (st.highPass) {
        st.highPass->process(in, out, n); // use out as temp
    } else {
        if (out != in) std::memcpy(out, in, n * sizeof(float));
    }

    // Envelope follower and expander gain
    // Simple RMS-like envelope using absolute value smoothing (fast, low cost)
    for (size_t i = 0; i < n; ++i) {
        double x = static_cast<double>(out[i]);
        double ax = std::abs(x);
        // Envelope
        if (ax > st.env) st.env = attackCoeffEnv_ * st.env + (1.0 - attackCoeffEnv_) * ax;
        else             st.env = releaseCoeffEnv_ * st.env + (1.0 - releaseCoeffEnv_) * ax;

        // Compute static curve for downward expander
        double gTarget = 1.0;
        if (st.env < threshLin_) {
            // below threshold, apply ratio attenuation towards floor
            double below = (threshLin_ - st.env) / std::max(threshLin_, 1e-9);
            double attDb = std::min(config_.floorDb, -20.0 * std::log10(1.0 + below * (config_.ratio - 1.0)));
            gTarget = dbToLin(attDb);
            if (gTarget < floorLin_) gTarget = floorLin_;
        }

        // Smooth gain (avoid pumping)
        if (gTarget > st.gain) st.gain = attackCoeffGain_ * st.gain + (1.0 - attackCoeffGain_) * gTarget;
        else                   st.gain = releaseCoeffGain_ * st.gain + (1.0 - releaseCoeffGain_) * gTarget;

        out[i] = static_cast<float>(out[i] * st.gain);
    }
}

} // namespace AudioNR


