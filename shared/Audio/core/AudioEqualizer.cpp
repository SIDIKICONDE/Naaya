#include "AudioEqualizer.h"
#include <cmath>
#include <algorithm>
#include <cstring>

namespace AudioEqualizer {

AudioEqualizer::AudioEqualizer(size_t numBands, uint32_t sampleRate)
    : m_sampleRate(sampleRate)
    , m_masterGain(1.0)
    , m_bypass(false)
    , m_parametersChanged(false) {
    initialize(numBands, sampleRate);
}

AudioEqualizer::~AudioEqualizer() = default;

void AudioEqualizer::initialize(size_t numBands, uint32_t sampleRate) {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    
    m_sampleRate = sampleRate;
    m_bands.clear();
    m_bands.resize(numBands);
    
    // Plus de buffer temporaire nécessaire (master gain appliqué in-place)
    
    // Setup default bands
    setupDefaultBands();
    
    // Update all filters
    updateFilters();
}

void AudioEqualizer::setupDefaultBands() {
    size_t numBands = m_bands.size();
    
    if (numBands == NUM_BANDS) {
        // Use predefined frequencies for 10-band EQ
        for (size_t i = 0; i < numBands; ++i) {
            m_bands[i].frequency = DEFAULT_FREQUENCIES[i];
            m_bands[i].gain = 0.0;
            m_bands[i].q = DEFAULT_Q;
            m_bands[i].type = FilterType::PEAK;
            m_bands[i].enabled = true;
        }
        
        // Set first and last bands as shelf filters
        m_bands[0].type = FilterType::LOWSHELF;
        m_bands[numBands - 1].type = FilterType::HIGHSHELF;
    } else {
        // Calculate logarithmically spaced frequencies
        double minFreq = 20.0;
        double maxFreq = 20000.0;
        double logMin = std::log10(minFreq);
        double logMax = std::log10(maxFreq);
        double logStep = (logMax - logMin) / (numBands - 1);
        
        for (size_t i = 0; i < numBands; ++i) {
            double logFreq = logMin + i * logStep;
            m_bands[i].frequency = std::pow(10.0, logFreq);
            m_bands[i].gain = 0.0;
            m_bands[i].q = DEFAULT_Q;
            m_bands[i].type = FilterType::PEAK;
            m_bands[i].enabled = true;
        }
        
        // Set first and last bands as shelf filters
        if (numBands > 0) {
            m_bands[0].type = FilterType::LOWSHELF;
            if (numBands > 1) {
                m_bands[numBands - 1].type = FilterType::HIGHSHELF;
            }
        }
    }
}

void AudioEqualizer::updateFilters() {
    for (size_t i = 0; i < m_bands.size(); ++i) {
        updateBandFilter(i);
    }
}

void AudioEqualizer::updateBandFilter(size_t bandIndex) {
    if (bandIndex >= m_bands.size()) return;
    
    EQBand& band = m_bands[bandIndex];
    
    switch (band.type) {
        case FilterType::LOWPASS:
            band.filter->calculateLowpass(band.frequency, m_sampleRate, band.q);
            break;
        case FilterType::HIGHPASS:
            band.filter->calculateHighpass(band.frequency, m_sampleRate, band.q);
            break;
        case FilterType::BANDPASS:
            band.filter->calculateBandpass(band.frequency, m_sampleRate, band.q);
            break;
        case FilterType::NOTCH:
            band.filter->calculateNotch(band.frequency, m_sampleRate, band.q);
            break;
        case FilterType::PEAK:
            band.filter->calculatePeaking(band.frequency, m_sampleRate, band.q, band.gain);
            break;
        case FilterType::LOWSHELF:
            band.filter->calculateLowShelf(band.frequency, m_sampleRate, band.q, band.gain);
            break;
        case FilterType::HIGHSHELF:
            band.filter->calculateHighShelf(band.frequency, m_sampleRate, band.q, band.gain);
            break;
        case FilterType::ALLPASS:
            band.filter->calculateAllpass(band.frequency, m_sampleRate, band.q);
            break;
    }
}

void AudioEqualizer::process(const float* input, float* output, size_t numSamples) {
    if (m_bypass.load()) {
        // Bypass mode - just copy input to output
        std::memcpy(output, input, numSamples * sizeof(float));
        return;
    }
    
    // Use optimized processing path
    processOptimized(input, output, numSamples);
}

void AudioEqualizer::processOptimized(const float* input, float* output, size_t numSamples) {
    // Check if parameters have changed
    if (m_parametersChanged.load()) {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        updateFilters();
        m_parametersChanged.store(false);
    }
    
    // Optimisation: traiter par blocs plus grands pour améliorer la localité du cache
    constexpr size_t OPTIMAL_BLOCK_SIZE = 1024;  // Augmenté pour meilleure efficacité cache
    size_t blockSize = std::min(numSamples, OPTIMAL_BLOCK_SIZE);
    size_t processedSamples = 0;
    
    // Pré-calculer les filtres actifs pour éviter les vérifications répétées
    std::vector<const EQBand*> activeBands;
    activeBands.reserve(m_bands.size());
    for (const auto& band : m_bands) {
        if (band.enabled && std::abs(band.gain) > 0.01) {
            activeBands.push_back(&band);
        }
    }
    
    // Si aucun filtre actif, appliquer seulement le gain master
    if (activeBands.empty()) {
        float masterGainLinear = static_cast<float>(dbToLinear(m_masterGain.load()));
        if (std::abs(masterGainLinear - 1.0f) < 0.001f) {
            // Pas de traitement nécessaire, copie directe
            if (output != input) {
                std::memcpy(output, input, numSamples * sizeof(float));
            }
        } else {
            // Appliquer seulement le gain master avec SIMD
            #ifdef __AVX2__
            const __m256 gain = _mm256_set1_ps(masterGainLinear);
            size_t simdSamples = numSamples & ~7;
            
            for (size_t i = 0; i < simdSamples; i += 8) {
                __m256 data = _mm256_loadu_ps(input + i);
                data = _mm256_mul_ps(data, gain);
                _mm256_storeu_ps(output + i, data);
            }
            
            // Traiter les échantillons restants
            for (size_t i = simdSamples; i < numSamples; ++i) {
                output[i] = input[i] * masterGainLinear;
            }
            #elif defined(__SSE2__)
            const __m128 gain = _mm_set1_ps(masterGainLinear);
            size_t simdSamples = numSamples & ~3;
            
            for (size_t i = 0; i < simdSamples; i += 4) {
                __m128 data = _mm_loadu_ps(input + i);
                data = _mm_mul_ps(data, gain);
                _mm_storeu_ps(output + i, data);
            }
            
            // Traiter les échantillons restants
            for (size_t i = simdSamples; i < numSamples; ++i) {
                output[i] = input[i] * masterGainLinear;
            }
            #else
            for (size_t i = 0; i < numSamples; ++i) {
                output[i] = input[i] * masterGainLinear;
            }
            #endif
        }
        return;
    }
    
    while (processedSamples < numSamples) {
        size_t samplesToProcess = std::min(blockSize, numSamples - processedSamples);
        const float* blockInput = input + processedSamples;
        float* blockOutput = output + processedSamples;
        
        // Copier l'entrée vers la sortie pour le premier filtre
        if (blockOutput != blockInput) {
            std::memcpy(blockOutput, blockInput, samplesToProcess * sizeof(float));
        }
        
        // Appliquer chaque bande de filtre active
        for (const auto* band : activeBands) {
            band->filter->process(blockOutput, blockOutput, samplesToProcess);
        }
        
        // Appliquer le gain master avec SIMD
        float masterGainLinear = static_cast<float>(dbToLinear(m_masterGain.load()));
        if (std::abs(masterGainLinear - 1.0f) > 0.001f) {
            #ifdef __AVX2__
            const __m256 gain = _mm256_set1_ps(masterGainLinear);
            size_t simdSamples = samplesToProcess & ~7;
            
            for (size_t i = 0; i < simdSamples; i += 8) {
                __m256 data = _mm256_loadu_ps(blockOutput + i);
                data = _mm256_mul_ps(data, gain);
                _mm256_storeu_ps(blockOutput + i, data);
            }
            
            for (size_t i = simdSamples; i < samplesToProcess; ++i) {
                blockOutput[i] *= masterGainLinear;
            }
            #elif defined(__SSE2__)
            const __m128 gain = _mm_set1_ps(masterGainLinear);
            size_t simdSamples = samplesToProcess & ~3;
            
            for (size_t i = 0; i < simdSamples; i += 4) {
                __m128 data = _mm_loadu_ps(blockOutput + i);
                data = _mm_mul_ps(data, gain);
                _mm_storeu_ps(blockOutput + i, data);
            }
            
            for (size_t i = simdSamples; i < samplesToProcess; ++i) {
                blockOutput[i] *= masterGainLinear;
            }
            #else
            for (size_t i = 0; i < samplesToProcess; ++i) {
                blockOutput[i] *= masterGainLinear;
            }
            #endif
        }
        
        processedSamples += samplesToProcess;
    }
}

void AudioEqualizer::processStereo(const float* inputL, const float* inputR,
                                  float* outputL, float* outputR, size_t numSamples) {
    if (m_bypass.load()) {
        // Bypass mode - copie SIMD optimisée
        if (outputL != inputL || outputR != inputR) {
            #ifdef __AVX2__
            size_t simdSamples = numSamples & ~7;
            for (size_t i = 0; i < simdSamples; i += 8) {
                __m256 dataL = _mm256_loadu_ps(inputL + i);
                __m256 dataR = _mm256_loadu_ps(inputR + i);
                _mm256_storeu_ps(outputL + i, dataL);
                _mm256_storeu_ps(outputR + i, dataR);
            }
            // Copier les échantillons restants
            for (size_t i = simdSamples; i < numSamples; ++i) {
                outputL[i] = inputL[i];
                outputR[i] = inputR[i];
            }
            #else
            std::memcpy(outputL, inputL, numSamples * sizeof(float));
            std::memcpy(outputR, inputR, numSamples * sizeof(float));
            #endif
        }
        return;
    }
    
    // Check if parameters have changed
    if (m_parametersChanged.load()) {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        updateFilters();
        m_parametersChanged.store(false);
    }
    
    // Optimisation: traiter par blocs plus grands
    constexpr size_t OPTIMAL_BLOCK_SIZE = 1024;
    size_t blockSize = std::min(numSamples, OPTIMAL_BLOCK_SIZE);
    size_t processedSamples = 0;
    
    // Pré-calculer les filtres actifs
    std::vector<const EQBand*> activeBands;
    activeBands.reserve(m_bands.size());
    for (const auto& band : m_bands) {
        if (band.enabled && std::abs(band.gain) > 0.01) {
            activeBands.push_back(&band);
        }
    }
    
    while (processedSamples < numSamples) {
        size_t samplesToProcess = std::min(blockSize, numSamples - processedSamples);
        const float* blockInputL = inputL + processedSamples;
        const float* blockInputR = inputR + processedSamples;
        float* blockOutputL = outputL + processedSamples;
        float* blockOutputR = outputR + processedSamples;
        
        // Copier l'entrée vers la sortie
        if (blockOutputL != blockInputL || blockOutputR != blockInputR) {
            std::memcpy(blockOutputL, blockInputL, samplesToProcess * sizeof(float));
            std::memcpy(blockOutputR, blockInputR, samplesToProcess * sizeof(float));
        }
        
        // Appliquer chaque bande de filtre active
        for (const auto* band : activeBands) {
            band->filter->processStereo(blockOutputL, blockOutputR,
                                       blockOutputL, blockOutputR, samplesToProcess);
        }
        
        // Appliquer le gain master avec SIMD pour les deux canaux
        float masterGainLinear = static_cast<float>(dbToLinear(m_masterGain.load()));
        if (std::abs(masterGainLinear - 1.0f) > 0.001f) {
            #ifdef __AVX2__
            const __m256 gain = _mm256_set1_ps(masterGainLinear);
            size_t simdSamples = samplesToProcess & ~7;
            
            for (size_t i = 0; i < simdSamples; i += 8) {
                __m256 dataL = _mm256_loadu_ps(blockOutputL + i);
                __m256 dataR = _mm256_loadu_ps(blockOutputR + i);
                dataL = _mm256_mul_ps(dataL, gain);
                dataR = _mm256_mul_ps(dataR, gain);
                _mm256_storeu_ps(blockOutputL + i, dataL);
                _mm256_storeu_ps(blockOutputR + i, dataR);
            }
            
            for (size_t i = simdSamples; i < samplesToProcess; ++i) {
                blockOutputL[i] *= masterGainLinear;
                blockOutputR[i] *= masterGainLinear;
            }
            #else
            for (size_t i = 0; i < samplesToProcess; ++i) {
                blockOutputL[i] *= masterGainLinear;
                blockOutputR[i] *= masterGainLinear;
            }
            #endif
        }
        
        processedSamples += samplesToProcess;
    }
}

// Band control methods
void AudioEqualizer::setBandGain(size_t bandIndex, double gainDB) {
    if (bandIndex >= m_bands.size()) return;
    
    gainDB = std::max(MIN_GAIN_DB, std::min(MAX_GAIN_DB, gainDB));
    
    {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_bands[bandIndex].gain = gainDB;
        m_parametersChanged.store(true);
    }
}

void AudioEqualizer::setBandFrequency(size_t bandIndex, double frequency) {
    if (bandIndex >= m_bands.size()) return;
    
    frequency = std::max(20.0, std::min(m_sampleRate / 2.0, frequency));
    
    {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_bands[bandIndex].frequency = frequency;
        m_parametersChanged.store(true);
    }
}

void AudioEqualizer::setBandQ(size_t bandIndex, double q) {
    if (bandIndex >= m_bands.size()) return;
    
    q = std::max(MIN_Q, std::min(MAX_Q, q));
    
    {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_bands[bandIndex].q = q;
        m_parametersChanged.store(true);
    }
}

void AudioEqualizer::setBandType(size_t bandIndex, FilterType type) {
    if (bandIndex >= m_bands.size()) return;
    
    {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_bands[bandIndex].type = type;
        m_parametersChanged.store(true);
    }
}

void AudioEqualizer::setBandEnabled(size_t bandIndex, bool enabled) {
    if (bandIndex >= m_bands.size()) return;
    
    {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_bands[bandIndex].enabled = enabled;
    }
}

// Get band parameters
double AudioEqualizer::getBandGain(size_t bandIndex) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    return (bandIndex < m_bands.size()) ? m_bands[bandIndex].gain : 0.0;
}

double AudioEqualizer::getBandFrequency(size_t bandIndex) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    return (bandIndex < m_bands.size()) ? m_bands[bandIndex].frequency : 0.0;
}

double AudioEqualizer::getBandQ(size_t bandIndex) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    return (bandIndex < m_bands.size()) ? m_bands[bandIndex].q : DEFAULT_Q;
}

FilterType AudioEqualizer::getBandType(size_t bandIndex) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    return (bandIndex < m_bands.size()) ? m_bands[bandIndex].type : FilterType::PEAK;
}

bool AudioEqualizer::isBandEnabled(size_t bandIndex) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    return (bandIndex < m_bands.size()) ? m_bands[bandIndex].enabled : false;
}

// Global controls
void AudioEqualizer::setMasterGain(double gainDB) {
    gainDB = std::max(MIN_GAIN_DB, std::min(MAX_GAIN_DB, gainDB));
    m_masterGain.store(gainDB);
}

double AudioEqualizer::getMasterGain() const {
    return m_masterGain.load();
}

void AudioEqualizer::setBypass(bool bypass) {
    m_bypass.store(bypass);
}

bool AudioEqualizer::isBypassed() const {
    return m_bypass.load();
}

// Preset management
void AudioEqualizer::loadPreset(const EQPreset& preset) {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    
    size_t numBands = std::min(preset.gains.size(), m_bands.size());
    for (size_t i = 0; i < numBands; ++i) {
        m_bands[i].gain = preset.gains[i];
    }
    
    m_parametersChanged.store(true);
}

void AudioEqualizer::savePreset(EQPreset& preset) const {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    
    preset.gains.clear();
    preset.gains.reserve(m_bands.size());
    
    for (const auto& band : m_bands) {
        preset.gains.push_back(band.gain);
    }
}

void AudioEqualizer::resetAllBands() {
    std::lock_guard<std::mutex> lock(m_parameterMutex);
    
    for (auto& band : m_bands) {
        band.gain = 0.0;
    }
    
    m_parametersChanged.store(true);
}

void AudioEqualizer::setSampleRate(uint32_t sampleRate) {
    if (sampleRate != m_sampleRate) {
        std::lock_guard<std::mutex> lock(m_parameterMutex);
        m_sampleRate = sampleRate;
        m_parametersChanged.store(true);
    }
}

uint32_t AudioEqualizer::getSampleRate() const {
    return m_sampleRate;
}

void AudioEqualizer::beginParameterUpdate() {
    m_parameterMutex.lock();
}

void AudioEqualizer::endParameterUpdate() {
    m_parametersChanged.store(true);
    m_parameterMutex.unlock();
}

// Helper functions
double AudioEqualizer::dbToLinear(double db) const {
    return std::pow(10.0, db / 20.0);
}

double AudioEqualizer::linearToDb(double linear) const {
    return 20.0 * std::log10(std::max(linear, EPSILON));
}

// Preset Factory implementations
EQPreset EQPresetFactory::createFlatPreset() {
    EQPreset preset;
    preset.name = "Flat";
    preset.gains = std::vector<double>(NUM_BANDS, 0.0);
    return preset;
}

EQPreset EQPresetFactory::createRockPreset() {
    EQPreset preset;
    preset.name = "Rock";
    preset.gains = {4.0, 3.0, -1.0, -2.0, -1.0, 2.0, 3.0, 4.0, 3.0, 2.0};
    return preset;
}

EQPreset EQPresetFactory::createPopPreset() {
    EQPreset preset;
    preset.name = "Pop";
    preset.gains = {-1.0, 2.0, 4.0, 3.0, 0.0, -1.0, -1.0, 0.0, 2.0, 3.0};
    return preset;
}

EQPreset EQPresetFactory::createJazzPreset() {
    EQPreset preset;
    preset.name = "Jazz";
    preset.gains = {0.0, 2.0, 1.0, 2.0, -2.0, -2.0, 0.0, 1.0, 2.0, 3.0};
    return preset;
}

EQPreset EQPresetFactory::createClassicalPreset() {
    EQPreset preset;
    preset.name = "Classical";
    preset.gains = {0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -2.0, -2.0, -2.0, -3.0};
    return preset;
}

EQPreset EQPresetFactory::createElectronicPreset() {
    EQPreset preset;
    preset.name = "Electronic";
    preset.gains = {4.0, 3.0, 1.0, 0.0, -2.0, 2.0, 1.0, 1.0, 3.0, 4.0};
    return preset;
}

EQPreset EQPresetFactory::createVocalBoostPreset() {
    EQPreset preset;
    preset.name = "Vocal Boost";
    preset.gains = {-2.0, -1.0, 0.0, 2.0, 4.0, 4.0, 3.0, 2.0, 0.0, -1.0};
    return preset;
}

EQPreset EQPresetFactory::createBassBoostPreset() {
    EQPreset preset;
    preset.name = "Bass Boost";
    preset.gains = {6.0, 5.0, 4.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
    return preset;
}

EQPreset EQPresetFactory::createTrebleBoostPreset() {
    EQPreset preset;
    preset.name = "Treble Boost";
    preset.gains = {0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 4.0, 5.0, 6.0};
    return preset;
}

EQPreset EQPresetFactory::createLoudnessPreset() {
    EQPreset preset;
    preset.name = "Loudness";
    preset.gains = {5.0, 3.0, 0.0, -1.0, -2.0, -2.0, -1.0, 0.0, 3.0, 5.0};
    return preset;
}

} // namespace AudioEqualizer
