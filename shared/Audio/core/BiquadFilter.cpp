#include "BiquadFilter.h"
#include <cmath>

namespace AudioEqualizer {

BiquadFilter::BiquadFilter() 
    : m_a0(1.0), m_a1(0.0), m_a2(0.0)
    , m_b1(0.0), m_b2(0.0)
    , m_y1(0.0), m_y2(0.0)
    , m_y1R(0.0), m_y2R(0.0) {
}

BiquadFilter::~BiquadFilter() = default;

void BiquadFilter::setCoefficients(double a0, double a1, double a2, 
                                  double b0, double b1, double b2) {
    normalizeCoefficients(a0, a1, a2, b0, b1, b2);
    m_a0 = a0;
    m_a1 = a1;
    m_a2 = a2;
    m_b1 = b1;
    m_b2 = b2;
}

void BiquadFilter::normalizeCoefficients(double& a0, double& a1, double& a2, 
                                        double& b0, double& b1, double& b2) {
    if (std::abs(b0) < EPSILON) {
        b0 = 1.0;
    }
    
    double inv_b0 = 1.0 / b0;
    a0 *= inv_b0;
    a1 *= inv_b0;
    a2 *= inv_b0;
    b1 *= inv_b0;
    b2 *= inv_b0;
}

void BiquadFilter::calculateLowpass(double frequency, double sampleRate, double q) {
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha;
    double a0 = (1.0 - cos_omega) / 2.0;
    double a1 = 1.0 - cos_omega;
    double a2 = (1.0 - cos_omega) / 2.0;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateHighpass(double frequency, double sampleRate, double q) {
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha;
    double a0 = (1.0 + cos_omega) / 2.0;
    double a1 = -(1.0 + cos_omega);
    double a2 = (1.0 + cos_omega) / 2.0;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateBandpass(double frequency, double sampleRate, double q) {
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha;
    double a0 = alpha;
    double a1 = 0.0;
    double a2 = -alpha;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateNotch(double frequency, double sampleRate, double q) {
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha;
    double a0 = 1.0;
    double a1 = -2.0 * cos_omega;
    double a2 = 1.0;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculatePeaking(double frequency, double sampleRate, double q, double gainDB) {
    double A = std::pow(10.0, gainDB / 40.0);
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha / A;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha / A;
    double a0 = 1.0 + alpha * A;
    double a1 = -2.0 * cos_omega;
    double a2 = 1.0 - alpha * A;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateLowShelf(double frequency, double sampleRate, double q, double gainDB) {
    double A = std::pow(10.0, gainDB / 40.0);
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double S = 1.0; // Shelf slope parameter
    double alpha = sin_omega / 2.0 * std::sqrt((A + 1.0 / A) * (1.0 / S - 1.0) + 2.0);
    
    double sqrt_A = std::sqrt(A);
    double two_sqrt_A_alpha = 2.0 * sqrt_A * alpha;
    
    double b0 = (A + 1.0) + (A - 1.0) * cos_omega + two_sqrt_A_alpha;
    double b1 = -2.0 * ((A - 1.0) + (A + 1.0) * cos_omega);
    double b2 = (A + 1.0) + (A - 1.0) * cos_omega - two_sqrt_A_alpha;
    double a0 = A * ((A + 1.0) - (A - 1.0) * cos_omega + two_sqrt_A_alpha);
    double a1 = 2.0 * A * ((A - 1.0) - (A + 1.0) * cos_omega);
    double a2 = A * ((A + 1.0) - (A - 1.0) * cos_omega - two_sqrt_A_alpha);
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateHighShelf(double frequency, double sampleRate, double q, double gainDB) {
    double A = std::pow(10.0, gainDB / 40.0);
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double S = 1.0; // Shelf slope parameter
    double alpha = sin_omega / 2.0 * std::sqrt((A + 1.0 / A) * (1.0 / S - 1.0) + 2.0);
    
    double sqrt_A = std::sqrt(A);
    double two_sqrt_A_alpha = 2.0 * sqrt_A * alpha;
    
    double b0 = (A + 1.0) - (A - 1.0) * cos_omega + two_sqrt_A_alpha;
    double b1 = 2.0 * ((A - 1.0) - (A + 1.0) * cos_omega);
    double b2 = (A + 1.0) - (A - 1.0) * cos_omega - two_sqrt_A_alpha;
    double a0 = A * ((A + 1.0) + (A - 1.0) * cos_omega + two_sqrt_A_alpha);
    double a1 = -2.0 * A * ((A - 1.0) + (A + 1.0) * cos_omega);
    double a2 = A * ((A + 1.0) + (A - 1.0) * cos_omega - two_sqrt_A_alpha);
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::calculateAllpass(double frequency, double sampleRate, double q) {
    double omega = TWO_PI * frequency / sampleRate;
    double sin_omega = std::sin(omega);
    double cos_omega = std::cos(omega);
    double alpha = sin_omega / (2.0 * q);
    
    double b0 = 1.0 + alpha;
    double b1 = -2.0 * cos_omega;
    double b2 = 1.0 - alpha;
    double a0 = 1.0 - alpha;
    double a1 = -2.0 * cos_omega;
    double a2 = 1.0 + alpha;
    
    setCoefficients(a0, a1, a2, b0, b1, b2);
}

void BiquadFilter::process(const float* input, float* output, size_t numSamples) {
#if defined(__AVX2__)
    // Use AVX2 optimized version on x86_64
    processAVX2(input, output, numSamples);
#elif defined(__SSE2__)
    // Use SSE2 optimized version on x86
    processSSE2(input, output, numSamples);
#elif defined(__ARM_NEON)
    // Use NEON optimized version on ARM
    processNEON(input, output, numSamples);
#else
    // Fallback to optimized scalar processing with Direct Form II Transposed
    double y1 = m_y1, y2 = m_y2;
    
    // Process in blocks for better cache efficiency
    constexpr size_t BLOCK_SIZE = 32;
    size_t fullBlocks = numSamples / BLOCK_SIZE;
    size_t remaining = numSamples % BLOCK_SIZE;
    
    for (size_t block = 0; block < fullBlocks; ++block) {
        size_t offset = block * BLOCK_SIZE;
        for (size_t i = 0; i < BLOCK_SIZE; ++i) {
            double x = static_cast<double>(input[offset + i]);
            double w = x - m_b1 * y1 - m_b2 * y2;
            double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
            
            y2 = y1;
            y1 = preventDenormal(w);
            
            output[offset + i] = static_cast<float>(y);
        }
    }
    
    // Process remaining samples
    size_t offset = fullBlocks * BLOCK_SIZE;
    for (size_t i = 0; i < remaining; ++i) {
        double x = static_cast<double>(input[offset + i]);
        double w = x - m_b1 * y1 - m_b2 * y2;
        double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
        
        y2 = y1;
        y1 = preventDenormal(w);
        
        output[offset + i] = static_cast<float>(y);
    }
    
    m_y1 = y1;
    m_y2 = y2;
#endif
}

void BiquadFilter::processStereo(const float* inputL, const float* inputR,
                                float* outputL, float* outputR, size_t numSamples) {
    // Process left channel (DF-II transposé)
    double y1 = m_y1, y2 = m_y2;
    
    for (size_t i = 0; i < numSamples; ++i) {
        double x = static_cast<double>(inputL[i]);
        double w = x - m_b1 * y1 - m_b2 * y2;
        double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
        
        y2 = y1;
        y1 = preventDenormal(w);
        
        outputL[i] = static_cast<float>(y);
    }
    
    m_y1 = y1; m_y2 = y2;
    
    // Process right channel (DF-II transposé)
    y1 = m_y1R; y2 = m_y2R;
    
    for (size_t i = 0; i < numSamples; ++i) {
        double x = static_cast<double>(inputR[i]);
        double w = x - m_b1 * y1 - m_b2 * y2;
        double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
        
        y2 = y1;
        y1 = preventDenormal(w);
        
        outputR[i] = static_cast<float>(y);
    }
    
    m_y1R = y1; m_y2R = y2;
}

#ifdef __ARM_NEON
void BiquadFilter::processNEON(const float* input, float* output, size_t numSamples) {
    // Traitement par blocs de 4, mais enchaîné séquentiellement (états récursifs)
    size_t simdSamples = numSamples & ~3;

    for (size_t i = 0; i < simdSamples; i += 4) {
        float inVals[4];
        vst1q_f32(inVals, vld1q_f32(&input[i]));

        float outVals[4];
        outVals[0] = processSample(inVals[0]);
        outVals[1] = processSample(inVals[1]);
        outVals[2] = processSample(inVals[2]);
        outVals[3] = processSample(inVals[3]);

        float32x4_t outVec = vld1q_f32(outVals);
        vst1q_f32(&output[i], outVec);
    }

    // Reste
    for (size_t i = simdSamples; i < numSamples; ++i) {
        output[i] = processSample(input[i]);
    }
}
#endif

#ifdef __AVX2__
void BiquadFilter::processAVX2(const float* input, float* output, size_t numSamples) {
    // Process 8 samples at a time using AVX2
    // Note: Biquad filters are inherently sequential, so we process in chunks
    // but still maintain state between samples
    
    double y1 = m_y1, y2 = m_y2;
    
    // Process in blocks of 8 for AVX2
    size_t simdSamples = numSamples & ~7;
    size_t i = 0;
    
    // Coefficients as AVX vectors
    __m256d a0_vec = _mm256_set1_pd(m_a0);
    __m256d a1_vec = _mm256_set1_pd(m_a1);
    __m256d a2_vec = _mm256_set1_pd(m_a2);
    __m256d b1_vec = _mm256_set1_pd(m_b1);
    __m256d b2_vec = _mm256_set1_pd(m_b2);
    
    // Process 4 samples at a time (using double precision for stability)
    for (; i + 3 < simdSamples; i += 4) {
        // Load 4 floats and convert to double
        __m128 input_float = _mm_loadu_ps(&input[i]);
        __m256d x_vec = _mm256_cvtps_pd(input_float);
        
        // Process each sample (still sequential due to feedback)
        alignas(32) double x_arr[4];
        alignas(32) double y_arr[4];
        _mm256_store_pd(x_arr, x_vec);
        
        for (int j = 0; j < 4; ++j) {
            double x = x_arr[j];
            double w = x - m_b1 * y1 - m_b2 * y2;
            double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
            
            y2 = y1;
            y1 = preventDenormal(w);
            y_arr[j] = y;
        }
        
        // Convert back to float and store
        __m256d y_vec = _mm256_load_pd(y_arr);
        __m128 output_float = _mm256_cvtpd_ps(y_vec);
        _mm_storeu_ps(&output[i], output_float);
    }
    
    // Process remaining samples
    for (; i < numSamples; ++i) {
        double x = static_cast<double>(input[i]);
        double w = x - m_b1 * y1 - m_b2 * y2;
        double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
        
        y2 = y1;
        y1 = preventDenormal(w);
        
        output[i] = static_cast<float>(y);
    }
    
    m_y1 = y1;
    m_y2 = y2;
}
#endif

#ifdef __SSE2__
void BiquadFilter::processSSE2(const float* input, float* output, size_t numSamples) {
    // Optimized SSE2 implementation with Direct Form II Transposed
    double y1 = m_y1, y2 = m_y2;
    
    // Process in blocks of 4 samples for SSE efficiency
    size_t simdSamples = numSamples & ~3;
    
    // Process SIMD blocks
    for (size_t i = 0; i < simdSamples; i += 4) {
        __m128 in = _mm_loadu_ps(&input[i]);
        alignas(16) float temp[4];
        _mm_store_ps(temp, in);
        
        // Process each sample with Direct Form II Transposed
        for (int j = 0; j < 4; ++j) {
            double x = static_cast<double>(temp[j]);
            double w = x - m_b1 * y1 - m_b2 * y2;
            double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
            
            y2 = y1;
            y1 = preventDenormal(w);
            temp[j] = static_cast<float>(y);
        }
        
        __m128 out = _mm_load_ps(temp);
        _mm_storeu_ps(&output[i], out);
    }
    
    // Process remaining samples
    for (size_t i = simdSamples; i < numSamples; ++i) {
        double x = static_cast<double>(input[i]);
        double w = x - m_b1 * y1 - m_b2 * y2;
        double y = m_a0 * w + m_a1 * y1 + m_a2 * y2;
        
        y2 = y1;
        y1 = preventDenormal(w);
        output[i] = static_cast<float>(y);
    }
    
    m_y1 = y1;
    m_y2 = y2;
}
#endif

void BiquadFilter::reset() {
    m_y1 = m_y2 = 0.0;
    m_y1R = m_y2R = 0.0;
}

void BiquadFilter::getCoefficients(double& a0, double& a1, double& a2,
                                  double& b0, double& b1, double& b2) const {
    a0 = m_a0;
    a1 = m_a1;
    a2 = m_a2;
    b0 = 1.0;
    b1 = m_b1;
    b2 = m_b2;
}

} // namespace AudioEqualizer