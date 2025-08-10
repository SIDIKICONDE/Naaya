#pragma once

#ifdef __cplusplus
#include "BiquadFilter.h"
#include "../utils/Constants.h"
#include <vector>
#include <memory>
#include <atomic>
#include <mutex>
#include <cstdint>

// SIMD optimizations
#ifdef __AVX2__
#include <immintrin.h>
#elif defined(__SSE2__)
#include <emmintrin.h>
#endif

namespace AudioEqualizer {

// Structure for a single EQ band
struct EQBand {
    double frequency;
    double gain;      // in dB
    double q;
    FilterType type;
    std::unique_ptr<BiquadFilter> filter;
    bool enabled;
    
    EQBand() : frequency(1000.0), gain(0.0), q(DEFAULT_Q), 
               type(FilterType::PEAK), enabled(true) {
        filter = std::make_unique<BiquadFilter>();
    }
};

// Preset structure
struct EQPreset {
    std::string name;
    std::vector<double> gains;  // Gains for each band in dB
};

class AudioEqualizer {
public:
    AudioEqualizer(size_t numBands = NUM_BANDS, uint32_t sampleRate = DEFAULT_SAMPLE_RATE);
    ~AudioEqualizer();

    // Initialize equalizer with specific parameters
    void initialize(size_t numBands, uint32_t sampleRate);
    
    // Process audio
    void process(const float* input, float* output, size_t numSamples);
    void processStereo(const float* inputL, const float* inputR,
                      float* outputL, float* outputR, size_t numSamples);
    
    // Band control
    void setBandGain(size_t bandIndex, double gainDB);
    void setBandFrequency(size_t bandIndex, double frequency);
    void setBandQ(size_t bandIndex, double q);
    void setBandType(size_t bandIndex, FilterType type);
    void setBandEnabled(size_t bandIndex, bool enabled);
    
    // Get band parameters
    double getBandGain(size_t bandIndex) const;
    double getBandFrequency(size_t bandIndex) const;
    double getBandQ(size_t bandIndex) const;
    FilterType getBandType(size_t bandIndex) const;
    bool isBandEnabled(size_t bandIndex) const;
    
    // Global controls
    void setMasterGain(double gainDB);
    double getMasterGain() const;
    void setBypass(bool bypass);
    bool isBypassed() const;
    
    // Preset management
    void loadPreset(const EQPreset& preset);
    void savePreset(EQPreset& preset) const;
    void resetAllBands();
    
    // Sample rate
    void setSampleRate(uint32_t sampleRate);
    uint32_t getSampleRate() const;
    
    // Get number of bands
    size_t getNumBands() const { return m_bands.size(); }
    
    // Thread-safe parameter updates
    void beginParameterUpdate();
    void endParameterUpdate();

private:
    std::vector<EQBand> m_bands;
    uint32_t m_sampleRate;
    
    // Master controls
    std::atomic<double> m_masterGain;
    std::atomic<bool> m_bypass;
    
    // Thread safety
    mutable std::mutex m_parameterMutex;
    std::atomic<bool> m_parametersChanged;
    
    // Helper functions
    void updateFilters();
    void updateBandFilter(size_t bandIndex);
    double dbToLinear(double db) const;
    double linearToDb(double linear) const;
    
    // Optimized processing paths
    void processOptimized(const float* input, float* output, size_t numSamples);
    
    // Default band setup
    void setupDefaultBands();
};

// Preset factory
class EQPresetFactory {
public:
    static EQPreset createFlatPreset();
    static EQPreset createRockPreset();
    static EQPreset createPopPreset();
    static EQPreset createJazzPreset();
    static EQPreset createClassicalPreset();
    static EQPreset createElectronicPreset();
    static EQPreset createVocalBoostPreset();
    static EQPreset createBassBoostPreset();
    static EQPreset createTrebleBoostPreset();
    static EQPreset createLoudnessPreset();
};

} // namespace AudioEqualizer
#else
// C compilation guard
#endif
