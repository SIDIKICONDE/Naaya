#pragma once

#ifdef __cplusplus
#include <cstddef>
#include <cstdint>
#include <vector>

#ifdef FFMPEG_AVAILABLE
// Global forward declarations to avoid introducing nested types that shadow FFmpeg C structs
struct AVFilterGraph;
struct AVFilterContext;
struct AVFrame;
#endif

#ifdef NAAYA_RNNOISE
// Forward declaration for RNNoise C struct
struct DenoiseState;
#endif

namespace AudioNR {

/**
 * Squelette d'un suppresseur de bruit basé sur RNNoise.
 * - Sans lib tierce (NAAYA_RNNOISE non définie), il est inactif et passe les données.
 * - Lorsqu'intégrée, l'implémentation pourra appeler la lib RNNoise.
 */
class RNNoiseSuppressor {
public:
    RNNoiseSuppressor();
    ~RNNoiseSuppressor();

    // Initialise le moteur. Retourne true si disponible (lib présente), false sinon.
    bool initialize(uint32_t sampleRate, int numChannels);

    // Indique si l'implémentation RNNoise est disponible (lib liée et initialisée)
    bool isAvailable() const;

    // Agressivité 0.0–3.0 (guideline). Interprétation dépend de l'implémentation.
    void setAggressiveness(double aggressiveness);

    // Traitement en float PCM [-1,1]
    void processMono(const float* input, float* output, size_t numSamples);
    void processStereo(const float* inL, const float* inR,
                       float* outL, float* outR,
                       size_t numSamples);

private:
    bool available_{false};
    uint32_t sampleRate_{48000};
    int channels_{1};
    double aggressiveness_{1.0};

#ifdef FFMPEG_AVAILABLE
    // FFmpeg graph for arnndn
    ::AVFilterGraph* filterGraph_{nullptr};
    ::AVFilterContext* sourceContext_{nullptr};
    ::AVFilterContext* sinkContext_{nullptr};
    ::AVFrame* inputFrame_{nullptr};
    ::AVFrame* outputFrame_{nullptr};
    bool graphReady_{false};
    bool buildGraph();
    void destroyGraph();
#endif

#ifdef NAAYA_RNNOISE
    ::DenoiseState* rnnsState_{nullptr};
    // Tampon d'agrégation pour traiter par trames de 480 échantillons (10 ms @ 48k)
    std::vector<float> pendingMono_;
    void destroyRNNoise();
#endif
};

} // namespace AudioNR
#endif // __cplusplus


