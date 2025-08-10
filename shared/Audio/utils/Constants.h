#pragma once

#ifdef __cplusplus
#include <cstdint>
#include <cstddef>
#include <cmath>

namespace AudioEqualizer {

// Audio processing constants
constexpr double PI = 3.14159265358979323846;
constexpr double TWO_PI = 2.0 * PI;

// Sample rates
constexpr uint32_t SAMPLE_RATE_44100 = 44100;
constexpr uint32_t SAMPLE_RATE_48000 = 48000;
constexpr uint32_t DEFAULT_SAMPLE_RATE = SAMPLE_RATE_48000;

// Processing parameters
constexpr size_t DEFAULT_BLOCK_SIZE = 512;
constexpr size_t MAX_BLOCK_SIZE = 2048;
constexpr size_t MIN_BLOCK_SIZE = 64;

// Equalizer bands
constexpr size_t NUM_BANDS = 10;
constexpr size_t MAX_BANDS = 31;

// Default frequency bands for 10-band EQ (Hz)
constexpr double DEFAULT_FREQUENCIES[NUM_BANDS] = {
    31.25,   // Sub-bass
    62.5,    // Bass
    125.0,   // Low-mid
    250.0,   // Mid
    500.0,   // Mid
    1000.0,  // Mid-high
    2000.0,  // High-mid
    4000.0,  // Presence
    8000.0,  // Brilliance
    16000.0  // Air
};

// Q factor ranges
constexpr double MIN_Q = 0.1;
constexpr double MAX_Q = 10.0;
constexpr double DEFAULT_Q = 0.707; // Butterworth response

// Gain ranges (dB)
constexpr double MIN_GAIN_DB = -24.0;
constexpr double MAX_GAIN_DB = 24.0;
constexpr double DEFAULT_GAIN_DB = 0.0;

// Filter types
enum class FilterType {
    LOWPASS,
    HIGHPASS,
    BANDPASS,
    NOTCH,
    PEAK,
    LOWSHELF,
    HIGHSHELF,
    ALLPASS
};

// Processing precision
constexpr double EPSILON = 1e-10;
constexpr double DENORMAL_THRESHOLD = 1e-15;

// SIMD alignment
constexpr size_t SIMD_ALIGNMENT = 16;

} // namespace AudioEqualizer

#else
#include <stdint.h>
#include <stddef.h>
#endif