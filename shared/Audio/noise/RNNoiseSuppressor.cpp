#include "RNNoiseSuppressor.h"
#include <cstring>
#include <cstdio>
#ifdef NAAYA_RNNOISE
extern "C" {
  #include "rnnoise.h"
}
#endif
#ifdef FFMPEG_AVAILABLE
extern "C" {
  #include <libavfilter/avfilter.h>
  #include <libavfilter/buffersrc.h>
  #include <libavfilter/buffersink.h>
  #include <libavutil/opt.h>
  #include <libavutil/frame.h>
  #include <libavutil/samplefmt.h>
  #include <libavutil/channel_layout.h>
  #include <libavutil/mem.h>
}
#endif

namespace AudioNR {

RNNoiseSuppressor::RNNoiseSuppressor() = default;
RNNoiseSuppressor::~RNNoiseSuppressor() = default;

bool RNNoiseSuppressor::initialize(uint32_t sampleRate, int numChannels) {
    sampleRate_ = sampleRate > 0 ? sampleRate : 48000;
    channels_ = (numChannels == 2 ? 2 : 1);
    available_ = false;
    
#if defined(NAAYA_RNNOISE)
    // Native RNNoise backend
    if (rnnsState_) rnnoise_destroy(rnnsState_);
    rnnsState_ = rnnoise_create(NULL); // Use default model
    if (rnnsState_) { available_ = true; }
#elif defined(FFMPEG_AVAILABLE)
    // On s'appuie sur le filtre FFmpeg arnndn (intègre un modèle RNNoise)
    destroyGraph();
    graphReady_ = buildGraph();
    available_ = graphReady_;
#endif
    return available_;
}

bool RNNoiseSuppressor::isAvailable() const { return available_; }

void RNNoiseSuppressor::setAggressiveness(double aggressiveness) {
    if (aggressiveness < 0.0) aggressiveness = 0.0;
    if (aggressiveness > 3.0) aggressiveness = 3.0;
    aggressiveness_ = aggressiveness;
}

void RNNoiseSuppressor::processMono(const float* input, float* output, size_t numSamples) {
    if (!input || !output || numSamples == 0) return;
    
#if defined(FFMPEG_AVAILABLE)
    if (available_) {
        // Construire trames de 10ms pour arnndn (optionnel: on peut pousser tout d'un coup)
        const int nb_samples = (int)numSamples;
        if (!inputFrame_) inputFrame_ = av_frame_alloc();
        if (!outputFrame_) outputFrame_ = av_frame_alloc();
        if (!inputFrame_ || !outputFrame_) { if (output!=input) std::memcpy(output,input,numSamples*sizeof(float)); return; }
        // Réinitialiser puis configurer l'AVFrame
        av_frame_unref(inputFrame_);
        inputFrame_->nb_samples = nb_samples;
        inputFrame_->format = AV_SAMPLE_FMT_FLT; // interleaved float32
        inputFrame_->sample_rate = (int)sampleRate_;
        // Toujours traiter en mono côté arnndn pour la stabilité
        AVChannelLayout tmpLayout{};
        av_channel_layout_default(&tmpLayout, 1);
        av_channel_layout_copy(&inputFrame_->ch_layout, &tmpLayout);
        if (av_frame_get_buffer(inputFrame_, 0) < 0) { std::memcpy(output,input,numSamples*sizeof(float)); return; }
        std::memcpy(inputFrame_->data[0], input, numSamples * sizeof(float));
        if (av_buffersrc_add_frame_flags(sourceContext_, inputFrame_, AV_BUFFERSRC_FLAG_KEEP_REF) < 0) {
            std::memcpy(output, input, numSamples * sizeof(float));
            return;
        }
        if (av_buffersink_get_frame(sinkContext_, outputFrame_) < 0) {
            std::memcpy(output, input, numSamples * sizeof(float));
            return;
        }
        // Copier en sortie
        std::memcpy(output, outputFrame_->data[0], (size_t)outputFrame_->nb_samples * sizeof(float));
        av_frame_unref(outputFrame_);
        return;
    }
#endif
#ifdef NAAYA_RNNOISE
    if (available_ && rnnsState_) {
        // Traiter à 48kHz par trames de 480
        size_t writeIdx = 0;
        // S'il y a des restes en attente, on les complète et on sort une trame
        if (!pendingMono_.empty()) {
            size_t need = 480 - pendingMono_.size();
            size_t chunk = std::min(need, numSamples);
            pendingMono_.insert(pendingMono_.end(), input, input + chunk);
            if (pendingMono_.size() == 480) {
                float frame[480];
                for (int i = 0; i < 480; ++i) frame[i] = pendingMono_[i];
                rnnoise_process_frame(rnnsState_, frame, frame);
                std::memcpy(output, frame, 480 * sizeof(float));
                writeIdx += 480;
                pendingMono_.clear();
            }
        }
        // Traiter toutes les trames complètes suivantes
        while (writeIdx + 480 <= numSamples) {
            float frame[480];
            std::memcpy(frame, input + writeIdx, 480 * sizeof(float));
            rnnoise_process_frame(rnnsState_, frame, frame);
            std::memcpy(output + writeIdx, frame, 480 * sizeof(float));
            writeIdx += 480;
        }
        // Stocker le reste en attente
        size_t rest = numSamples - writeIdx;
        if (rest > 0) {
            pendingMono_.insert(pendingMono_.end(), input + writeIdx, input + numSamples);
            // Copier tel quel pour éviter trous (latence d'une trame)
            std::memcpy(output + writeIdx, input + writeIdx, rest * sizeof(float));
        }
        return;
    }
#endif
    // Fallback sans lib: copie
    if (output != input) std::memcpy(output, input, numSamples * sizeof(float));
}

void RNNoiseSuppressor::processStereo(const float* inL, const float* inR,
                                      float* outL, float* outR,
                                      size_t numSamples) {
    if (!inL || !inR || !outL || !outR || numSamples == 0) return;
#ifdef FFMPEG_AVAILABLE
    if (available_) {
        // Downmix -> mono -> arnndn -> upmix (simple et efficace)
        std::vector<float> mono(numSamples);
        for (size_t i = 0; i < numSamples; ++i) mono[i] = 0.5f * (inL[i] + inR[i]);
        std::vector<float> den(numSamples);
        processMono(mono.data(), den.data(), numSamples);
        for (size_t i = 0; i < numSamples; ++i) { outL[i] = den[i]; outR[i] = den[i]; }
        return;
    }
#endif
#ifdef NAAYA_RNNOISE
    if (available_ && rnnsState_) {
        std::vector<float> mono(numSamples);
        for (size_t i = 0; i < numSamples; ++i) mono[i] = 0.5f * (inL[i] + inR[i]);
        std::vector<float> den(numSamples);
        processMono(mono.data(), den.data(), numSamples);
        for (size_t i = 0; i < numSamples; ++i) { outL[i] = den[i]; outR[i] = den[i]; }
        return;
    }
#endif
    if (outL != inL) std::memcpy(outL, inL, numSamples * sizeof(float));
    if (outR != inR) std::memcpy(outR, inR, numSamples * sizeof(float));
}

#ifdef FFMPEG_AVAILABLE
bool RNNoiseSuppressor::buildGraph() {
    filterGraph_ = avfilter_graph_alloc();
    if (!filterGraph_) return false;
    const AVFilter* abuffer = avfilter_get_by_name("abuffer");
    const AVFilter* asink = avfilter_get_by_name("abuffersink");
    if (!abuffer || !asink) return false;
    // Définir args d'entrée
    char args[256];
    snprintf(args, sizeof(args), "time_base=1/%u:sample_rate=%u:sample_fmt=%s:ch_layout=%s",
             (unsigned)sampleRate_, (unsigned)sampleRate_, "flt", "mono");
    if (avfilter_graph_create_filter(&sourceContext_, abuffer, "in", args, NULL, filterGraph_) < 0) return false;
    if (avfilter_graph_create_filter(&sinkContext_, asink, "out", NULL, NULL, filterGraph_) < 0) return false;
    // Construire description arnndn (agressivité approx via modèle par défaut, on peut exposer strength si dispo)
    // arnndn options possibles: model=, mix=, rnnoise=1 (selon version). On reste par défaut.
    const char* desc = "arnndn, aformat=sample_fmts=flt";
    AVFilterInOut* inputs = avfilter_inout_alloc();
    AVFilterInOut* outputs = avfilter_inout_alloc();
    if (!inputs || !outputs) { if (inputs) avfilter_inout_free(&inputs); if (outputs) avfilter_inout_free(&outputs); return false; }
    outputs->name = av_strdup("in");
    outputs->filter_ctx = sourceContext_;
    outputs->pad_idx = 0;
    outputs->next = nullptr;
    inputs->name = av_strdup("out");
    inputs->filter_ctx = sinkContext_;
    inputs->pad_idx = 0;
    inputs->next = nullptr;
    int ret = avfilter_graph_parse_ptr(filterGraph_, desc, &inputs, &outputs, NULL);
    avfilter_inout_free(&outputs);
    avfilter_inout_free(&inputs);
    if (ret < 0) return false;
    if (avfilter_graph_config(filterGraph_, NULL) < 0) return false;
    return true;
}

void RNNoiseSuppressor::destroyGraph() {
    if (filterGraph_) { avfilter_graph_free(&filterGraph_); filterGraph_ = nullptr; }
    sourceContext_ = nullptr; sinkContext_ = nullptr;
    if (inputFrame_) { av_frame_free(&inputFrame_); inputFrame_ = nullptr; }
    if (outputFrame_) { av_frame_free(&outputFrame_); outputFrame_ = nullptr; }
    graphReady_ = false;
}
#endif

} // namespace AudioNR


