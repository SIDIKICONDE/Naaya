#include "AudioBuffer.h"
#include <cmath>
#include <algorithm>
#include <cstdlib>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

#ifdef __SSE2__
#include <emmintrin.h>
#endif

namespace AudioEqualizer {

AudioBuffer::AudioBuffer(size_t numChannels, size_t numSamples)
    : m_numChannels(numChannels)
    , m_numSamples(numSamples) {
    allocateData();
    allocateChannels();
    clear();
}

AudioBuffer::~AudioBuffer() = default;

void AudioBuffer::allocateData() {
    size_t totalSamples = m_numChannels * getAlignedSize(m_numSamples);
    m_data = std::make_unique<float[]>(totalSamples);
}

void AudioBuffer::allocateChannels() {
    m_channels = std::make_unique<float*[]>(m_numChannels);
    size_t alignedSamples = getAlignedSize(m_numSamples);
    
    for (size_t ch = 0; ch < m_numChannels; ++ch) {
        m_channels[ch] = m_data.get() + (ch * alignedSamples);
    }
}

size_t AudioBuffer::getAlignedSize(size_t size) {
    // Align to 16-byte boundary for SIMD
    return (size + 3) & ~3;  // Align to 4 floats (16 bytes)
}

float** AudioBuffer::getArrayOfWritePointers() {
    return m_channels.get();
}

const float* const* AudioBuffer::getArrayOfReadPointers() const {
    return const_cast<const float* const*>(m_channels.get());
}

void AudioBuffer::clear() {
    size_t totalSamples = m_numChannels * getAlignedSize(m_numSamples);
    std::memset(m_data.get(), 0, totalSamples * sizeof(float));
}

void AudioBuffer::clear(size_t channel) {
    if (channel < m_numChannels) {
        std::memset(m_channels[channel], 0, m_numSamples * sizeof(float));
    }
}

void AudioBuffer::clear(size_t startSample, size_t numSamples) {
    for (size_t ch = 0; ch < m_numChannels; ++ch) {
        if (startSample + numSamples <= m_numSamples) {
            std::memset(m_channels[ch] + startSample, 0, numSamples * sizeof(float));
        }
    }
}

void AudioBuffer::copyFrom(const AudioBuffer& source) {
    size_t channelsToCopy = std::min(m_numChannels, source.getNumChannels());
    size_t samplesToCopy = std::min(m_numSamples, source.getNumSamples());
    
    for (size_t ch = 0; ch < channelsToCopy; ++ch) {
        std::memcpy(m_channels[ch], source.getChannel(ch), samplesToCopy * sizeof(float));
    }
}

void AudioBuffer::copyFrom(size_t destChannel, const float* source, size_t numSamples) {
    if (destChannel < m_numChannels && source != nullptr) {
        size_t samplesToCopy = std::min(numSamples, m_numSamples);
        std::memcpy(m_channels[destChannel], source, samplesToCopy * sizeof(float));
    }
}

void AudioBuffer::copyFrom(size_t destChannel, size_t destStartSample,
                          const AudioBuffer& source, size_t sourceChannel,
                          size_t sourceStartSample, size_t numSamples) {
    if (destChannel < m_numChannels && sourceChannel < source.getNumChannels()) {
        size_t maxDestSamples = (destStartSample < m_numSamples) ? 
                                m_numSamples - destStartSample : 0;
        size_t maxSourceSamples = (sourceStartSample < source.getNumSamples()) ?
                                  source.getNumSamples() - sourceStartSample : 0;
        size_t samplesToCopy = std::min({numSamples, maxDestSamples, maxSourceSamples});
        
        if (samplesToCopy > 0) {
            std::memcpy(m_channels[destChannel] + destStartSample,
                       source.getChannel(sourceChannel) + sourceStartSample,
                       samplesToCopy * sizeof(float));
        }
    }
}

void AudioBuffer::addFrom(size_t destChannel, const float* source, size_t numSamples, float gain) {
    if (destChannel >= m_numChannels || source == nullptr) return;
    
    float* dest = m_channels[destChannel];
    size_t samplesToProcess = std::min(numSamples, m_numSamples);
    
#ifdef __ARM_NEON
    // NEON optimized version
    size_t simdSamples = samplesToProcess & ~3;
    float32x4_t gainVec = vdupq_n_f32(gain);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        float32x4_t srcVec = vld1q_f32(&source[i]);
        float32x4_t destVec = vld1q_f32(&dest[i]);
        destVec = vmlaq_f32(destVec, srcVec, gainVec);
        vst1q_f32(&dest[i], destVec);
    }
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        dest[i] += source[i] * gain;
    }
#elif defined(__SSE2__)
    // SSE2 optimized version
    size_t simdSamples = samplesToProcess & ~3;
    __m128 gainVec = _mm_set1_ps(gain);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        __m128 srcVec = _mm_loadu_ps(&source[i]);
        __m128 destVec = _mm_loadu_ps(&dest[i]);
        srcVec = _mm_mul_ps(srcVec, gainVec);
        destVec = _mm_add_ps(destVec, srcVec);
        _mm_storeu_ps(&dest[i], destVec);
    }
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        dest[i] += source[i] * gain;
    }
#else
    // Scalar version
    if (gain == 1.0f) {
        for (size_t i = 0; i < samplesToProcess; ++i) {
            dest[i] += source[i];
        }
    } else {
        for (size_t i = 0; i < samplesToProcess; ++i) {
            dest[i] += source[i] * gain;
        }
    }
#endif
}

void AudioBuffer::addFrom(const AudioBuffer& source, float gain) {
    size_t channelsToAdd = std::min(m_numChannels, source.getNumChannels());
    
    for (size_t ch = 0; ch < channelsToAdd; ++ch) {
        addFrom(ch, source.getChannel(ch), source.getNumSamples(), gain);
    }
}

void AudioBuffer::applyGain(float gain) {
    for (size_t ch = 0; ch < m_numChannels; ++ch) {
        applyGain(ch, gain);
    }
}

void AudioBuffer::applyGain(size_t channel, float gain) {
    if (channel < m_numChannels) {
        applyGain(channel, 0, m_numSamples, gain);
    }
}

void AudioBuffer::applyGain(size_t channel, size_t startSample, size_t numSamples, float gain) {
    if (channel >= m_numChannels) return;
    
    float* data = m_channels[channel] + startSample;
    size_t samplesToProcess = std::min(numSamples, m_numSamples - startSample);
    
#ifdef __ARM_NEON
    // NEON optimized version
    size_t simdSamples = samplesToProcess & ~3;
    float32x4_t gainVec = vdupq_n_f32(gain);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        float32x4_t vec = vld1q_f32(&data[i]);
        vec = vmulq_f32(vec, gainVec);
        vst1q_f32(&data[i], vec);
    }
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        data[i] *= gain;
    }
#elif defined(__SSE2__)
    // SSE2 optimized version
    size_t simdSamples = samplesToProcess & ~3;
    __m128 gainVec = _mm_set1_ps(gain);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        __m128 vec = _mm_loadu_ps(&data[i]);
        vec = _mm_mul_ps(vec, gainVec);
        _mm_storeu_ps(&data[i], vec);
    }
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        data[i] *= gain;
    }
#else
    // Scalar version
    for (size_t i = 0; i < samplesToProcess; ++i) {
        data[i] *= gain;
    }
#endif
}

void AudioBuffer::applyGainRamp(size_t channel, size_t startSample, size_t numSamples,
                               float startGain, float endGain) {
    if (channel >= m_numChannels) return;
    
    float* data = m_channels[channel] + startSample;
    size_t samplesToProcess = std::min(numSamples, m_numSamples - startSample);
    
    if (samplesToProcess == 0) return;
    
    float gainIncrement = (endGain - startGain) / static_cast<float>(samplesToProcess);
    float currentGain = startGain;
    
    for (size_t i = 0; i < samplesToProcess; ++i) {
        data[i] *= currentGain;
        currentGain += gainIncrement;
    }
}

float AudioBuffer::getMagnitude(size_t channel, size_t startSample, size_t numSamples) const {
    if (channel >= m_numChannels) return 0.0f;
    
    const float* data = m_channels[channel] + startSample;
    size_t samplesToProcess = std::min(numSamples, m_numSamples - startSample);
    
    float maxMagnitude = 0.0f;
    
#ifdef __ARM_NEON
    // NEON optimized version
    size_t simdSamples = samplesToProcess & ~3;
    float32x4_t maxVec = vdupq_n_f32(0.0f);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        float32x4_t vec = vld1q_f32(&data[i]);
        vec = vabsq_f32(vec);
        maxVec = vmaxq_f32(maxVec, vec);
    }
    
    // Extract maximum from vector
    float32x2_t max2 = vmax_f32(vget_low_f32(maxVec), vget_high_f32(maxVec));
    maxMagnitude = std::max(vget_lane_f32(max2, 0), vget_lane_f32(max2, 1));
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        maxMagnitude = std::max(maxMagnitude, std::abs(data[i]));
    }
#else
    // Scalar version
    for (size_t i = 0; i < samplesToProcess; ++i) {
        maxMagnitude = std::max(maxMagnitude, std::abs(data[i]));
    }
#endif
    
    return maxMagnitude;
}

float AudioBuffer::getRMSLevel(size_t channel, size_t startSample, size_t numSamples) const {
    if (channel >= m_numChannels || numSamples == 0) return 0.0f;
    
    const float* data = m_channels[channel] + startSample;
    size_t samplesToProcess = std::min(numSamples, m_numSamples - startSample);
    
    double sum = 0.0;
    
#ifdef __ARM_NEON
    // NEON optimized version
    size_t simdSamples = samplesToProcess & ~3;
    float32x4_t sumVec = vdupq_n_f32(0.0f);
    
    for (size_t i = 0; i < simdSamples; i += 4) {
        float32x4_t vec = vld1q_f32(&data[i]);
        vec = vmulq_f32(vec, vec);  // Square the values
        sumVec = vaddq_f32(sumVec, vec);
    }
    
    // Sum the vector elements
    float32x2_t sum2 = vadd_f32(vget_low_f32(sumVec), vget_high_f32(sumVec));
    sum = vget_lane_f32(sum2, 0) + vget_lane_f32(sum2, 1);
    
    // Process remaining samples
    for (size_t i = simdSamples; i < samplesToProcess; ++i) {
        sum += data[i] * data[i];
    }
#else
    // Scalar version
    for (size_t i = 0; i < samplesToProcess; ++i) {
        sum += data[i] * data[i];
    }
#endif
    
    return static_cast<float>(std::sqrt(sum / samplesToProcess));
}

} // namespace AudioEqualizer