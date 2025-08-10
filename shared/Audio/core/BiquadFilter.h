#pragma once

#ifdef __cplusplus
#include "../utils/Constants.h"
#include <cmath>

#ifdef __ARM_NEON
#include <arm_neon.h>
#endif

#ifdef __SSE2__
#include <emmintrin.h>
#endif

namespace AudioEqualizer {

class BiquadFilter {
public:
    BiquadFilter();
    ~BiquadFilter();

    // Configure filter coefficients
    void setCoefficients(double a0, double a1, double a2, double b0, double b1, double b2);
    
    // Calculate coefficients for different filter types
    void calculateLowpass(double frequency, double sampleRate, double q);
    void calculateHighpass(double frequency, double sampleRate, double q);
    void calculateBandpass(double frequency, double sampleRate, double q);
    void calculateNotch(double frequency, double sampleRate, double q);
    void calculatePeaking(double frequency, double sampleRate, double q, double gainDB);
    void calculateLowShelf(double frequency, double sampleRate, double q, double gainDB);
    void calculateHighShelf(double frequency, double sampleRate, double q, double gainDB);
    void calculateAllpass(double frequency, double sampleRate, double q);

    // Process audio samples
    void process(const float* input, float* output, size_t numSamples);
    void processStereo(const float* inputL, const float* inputR, 
                      float* outputL, float* outputR, size_t numSamples);
    
    // Process single sample (for real-time processing)
    inline float processSample(float input);
    
    // Reset filter state
    void reset();

    // Get current coefficients
    void getCoefficients(double& a0, double& a1, double& a2, 
                        double& b0, double& b1, double& b2) const;

private:
    // Filter coefficients
    double m_a0, m_a1, m_a2;  // Feedforward coefficients
    double m_b1, m_b2;        // Feedback coefficients (b0 is normalized to 1)
    
    // Filter state (Direct Form II)
    double m_y1, m_y2;        // Previous outputs for left/mono channel
    double m_y1R, m_y2R;      // Previous outputs for right channel
    
    // Helper function
    
    
    // Prevent denormal numbers
    inline double preventDenormal(double x) {
        return (std::abs(x) < EPSILON) ? 0.0 : x;
    }
    
    // Normalize coefficients
    void normalizeCoefficients(double& a0, double& a1, double& a2, 
                              double& b0, double& b1, double& b2);
    
    // SIMD optimized processing methods
    #ifdef __AVX2__
    void processAVX2(const float* input, float* output, size_t numSamples);
    #endif
    
    #ifdef __SSE2__
    void processSSE2(const float* input, float* output, size_t numSamples);
    #endif
    
    #ifdef __ARM_NEON
    void processNEON(const float* input, float* output, size_t numSamples);
    #endif
};

} // namespace AudioEqualizer

// Inline implementation for real-time processing
inline float AudioEqualizer::BiquadFilter::processSample(float input) {
    // Direct Form II implementation
    double x = static_cast<double>(input);
    
    // Apply input side
    double w = x - m_b1 * m_y1 - m_b2 * m_y2;
    
    // Apply output side
    double y = m_a0 * w + m_a1 * m_y1 + m_a2 * m_y2;
    
    // Update state variables
    m_y2 = m_y1;
    m_y1 = preventDenormal(w);
    
    return static_cast<float>(y);
}

#else
// C/ObjC compilation guard: no API exposed
#endif
