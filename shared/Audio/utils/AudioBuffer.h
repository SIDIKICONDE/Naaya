#pragma once

#ifdef __cplusplus
#include "Constants.h"
#include <memory>
#include <cstring>
#include <cstddef>

namespace AudioEqualizer {

class AudioBuffer {
public:
    AudioBuffer(size_t numChannels, size_t numSamples);
    ~AudioBuffer();

    // Get buffer data
    float* getChannel(size_t channel);
    const float* getChannel(size_t channel) const;
    
    // Get write pointer
    float** getArrayOfWritePointers();
    const float* const* getArrayOfReadPointers() const;
    
    // Buffer info
    size_t getNumChannels() const { return m_numChannels; }
    size_t getNumSamples() const { return m_numSamples; }
    
    // Clear buffer
    void clear();
    void clear(size_t channel);
    void clear(size_t startSample, size_t numSamples);
    
    // Copy operations
    void copyFrom(const AudioBuffer& source);
    void copyFrom(size_t destChannel, const float* source, size_t numSamples);
    void copyFrom(size_t destChannel, size_t destStartSample,
                  const AudioBuffer& source, size_t sourceChannel,
                  size_t sourceStartSample, size_t numSamples);
    
    // Add operations (for mixing)
    void addFrom(size_t destChannel, const float* source, size_t numSamples, float gain = 1.0f);
    void addFrom(const AudioBuffer& source, float gain = 1.0f);
    
    // Apply gain
    void applyGain(float gain);
    void applyGain(size_t channel, float gain);
    void applyGain(size_t channel, size_t startSample, size_t numSamples, float gain);
    
    // Apply gain ramp (for smooth parameter changes)
    void applyGainRamp(size_t channel, size_t startSample, size_t numSamples,
                       float startGain, float endGain);
    
    // Get magnitude
    float getMagnitude(size_t channel, size_t startSample, size_t numSamples) const;
    float getRMSLevel(size_t channel, size_t startSample, size_t numSamples) const;

private:
    size_t m_numChannels;
    size_t m_numSamples;
    std::unique_ptr<float[]> m_data;
    std::unique_ptr<float*[]> m_channels;
    
    // Allocate aligned memory for SIMD operations
    void allocateData();
    void allocateChannels();
    
    // Helper to ensure alignment
    static size_t getAlignedSize(size_t size);
};

// Inline implementations for performance
inline float* AudioBuffer::getChannel(size_t channel) {
    return (channel < m_numChannels) ? m_channels[channel] : nullptr;
}

inline const float* AudioBuffer::getChannel(size_t channel) const {
    return (channel < m_numChannels) ? m_channels[channel] : nullptr;
}

} // namespace AudioEqualizer

#else
/* Ce header contient uniquement des déclarations C++.
   Aucune API C n'est exposée lorsqu'il est inclus dans un TU C/Obj-C. */
#endif