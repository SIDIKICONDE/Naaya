#include "FFmpegFilterProcessor.hpp"
#include <iostream>
#include <cstring>

// Vérification de la disponibilité de FFmpeg
#ifdef FFMPEG_AVAILABLE
extern "C" {
    #include <libavfilter/avfilter.h>
    #include <libavfilter/buffersink.h>
    #include <libavfilter/buffersrc.h>
    #include <libavcodec/avcodec.h>
    #include <libavutil/frame.h>
    #include <libavutil/imgutils.h>
    #include <libavutil/pixfmt.h>
    #include <libavutil/opt.h>
}
#endif

namespace Camera {

FFmpegFilterProcessor::FFmpegFilterProcessor() {
    std::cout << "[FFmpegFilterProcessor] Construction" << std::endl;
}

FFmpegFilterProcessor::~FFmpegFilterProcessor() {
    shutdown();
    std::cout << "[FFmpegFilterProcessor] Destruction" << std::endl;
}

bool FFmpegFilterProcessor::initialize() {
    if (initialized_) {
        return true;
    }
    
    std::cout << "[FFmpegFilterProcessor] Initialisation..." << std::endl;
    
    #ifdef FFMPEG_AVAILABLE
    // Initialisation moderne: aucune inscription explicite nécessaire avec FFmpeg récent
    initialized_ = true;
    std::cout << "[FFmpegFilterProcessor] Initialisation FFmpeg (sans register_all)" << std::endl;
    #else
    // Mode fallback sans FFmpeg
    initialized_ = true;
    std::cout << "[FFmpegFilterProcessor] Mode fallback (sans FFmpeg)" << std::endl;
    #endif
    
    return true;
}

void FFmpegFilterProcessor::shutdown() {
    if (!initialized_) {
        return;
    }
    
    std::cout << "[FFmpegFilterProcessor] Arrêt..." << std::endl;
    
    #ifdef FFMPEG_AVAILABLE
    destroyFilterGraph();
    #endif
    
    initialized_ = false;
    std::cout << "[FFmpegFilterProcessor] Arrêt terminé" << std::endl;
}

bool FFmpegFilterProcessor::applyFilter(const FilterState& filter, const void* inputData, 
                                      size_t inputSize, void* outputData, size_t outputSize) {
    if (!initialized_) {
        setLastError("Processeur non initialisé");
        return false;
    }
    
    #ifdef FFMPEG_AVAILABLE
    // Implémentation FFmpeg
    if (!createFilterGraph()) {
        return false;
    }
    
    if (!addFilterToGraph(filter)) {
        return false;
    }
    
    // Préparer frame d'entrée à partir du buffer brut
    if (!inputFrame_) inputFrame_ = av_frame_alloc();
    if (!outputFrame_) outputFrame_ = av_frame_alloc();
    if (!inputFrame_ || !outputFrame_) {
        setLastError("Impossible d'allouer les frames FFmpeg");
        return false;
    }

    AVPixelFormat pix = av_get_pix_fmt(pixelFormat_.empty() ? "yuv420p" : pixelFormat_.c_str());
    if (pix == AV_PIX_FMT_NONE) pix = AV_PIX_FMT_YUV420P;

    inputFrame_->width = width_;
    inputFrame_->height = height_;
    inputFrame_->format = pix;

    // Renseigner les pointeurs de planes depuis le buffer d'entrée
    int ret = av_image_fill_arrays(inputFrame_->data, inputFrame_->linesize,
                                   reinterpret_cast<const uint8_t*>(inputData),
                                   pix, width_, height_, 1);
    if (ret < 0) {
        setLastError("av_image_fill_arrays a échoué");
        return false;
    }

    // Pousser la frame dans le buffersrc
    ret = av_buffersrc_add_frame_flags(sourceContext_, inputFrame_, AV_BUFFERSRC_FLAG_KEEP_REF);
    if (ret < 0) {
        setLastError("buffersrc_add_frame a échoué");
        return false;
    }

    // Récupérer la frame traitée
    ret = av_buffersink_get_frame(sinkContext_, outputFrame_);
    if (ret < 0) {
        setLastError("buffersink_get_frame a échoué");
        return false;
    }

    // Copier la frame de sortie vers le buffer fourni
    int required = av_image_get_buffer_size((AVPixelFormat)outputFrame_->format,
                                            outputFrame_->width, outputFrame_->height, 1);
    if (required < 0 || static_cast<size_t>(required) > outputSize) {
        setLastError("Taille de sortie insuffisante pour la frame filtrée");
        av_frame_unref(outputFrame_);
        return false;
    }
    int copied = av_image_copy_to_buffer(reinterpret_cast<uint8_t*>(outputData), (int)outputSize,
                                         (const uint8_t* const*)outputFrame_->data,
                                         outputFrame_->linesize,
                                         (AVPixelFormat)outputFrame_->format,
                                         outputFrame_->width, outputFrame_->height, 1);
    av_frame_unref(outputFrame_);
    if (copied < 0) {
        setLastError("Échec de copie de la frame filtrée");
        return false;
    }
    return true;
    #else
    // Mode fallback: copie directe avec log
    std::cout << "[FFmpegFilterProcessor] Mode fallback - filtre: " 
              << static_cast<int>(filter.type) << " (intensité: " << filter.params.intensity << ")" << std::endl;
    
    if (inputSize <= outputSize) {
        std::memcpy(outputData, inputData, inputSize);
        return true;
    } else {
        setLastError("Taille de sortie insuffisante");
        return false;
    }
    #endif
}

bool FFmpegFilterProcessor::supportsFormat(const std::string& format) const {
    #ifdef FFMPEG_AVAILABLE
    // Formats supportés par FFmpeg
    static const std::vector<std::string> supportedFormats = {
        "yuv420p", "yuv422p", "yuv444p", "rgb24", "bgr24", "rgba", "bgra"
    };
    
    return std::find(supportedFormats.begin(), supportedFormats.end(), format) != supportedFormats.end();
    #else
    // Mode fallback: support limité
    return format == "yuv420p" || format == "rgb24";
    #endif
}

bool FFmpegFilterProcessor::supportsFilter(FilterType type) const {
    #ifdef FFMPEG_AVAILABLE
    // Tous les filtres supportés avec FFmpeg
    return type != FilterType::NONE;
    #else
    // Mode fallback: filtres de base seulement
    return type == FilterType::SEPIA || type == FilterType::NOIR || 
           type == FilterType::MONOCHROME || type == FilterType::COLOR_CONTROLS;
    #endif
}

std::string FFmpegFilterProcessor::getName() const {
    return "FFmpegFilterProcessor";
}

std::vector<FilterInfo> FFmpegFilterProcessor::getSupportedFilters() const {
    std::vector<FilterInfo> filters;
    
    #ifdef FFMPEG_AVAILABLE
    // Filtres FFmpeg complets
    filters.push_back({"sepia", "Sépia", FilterType::SEPIA, "Effet sépia vintage", false, {"yuv420p", "rgb24"}});
    filters.push_back({"noir", "Noir & Blanc", FilterType::NOIR, "Conversion noir et blanc", false, {"yuv420p", "rgb24"}});
    filters.push_back({"monochrome", "Monochrome", FilterType::MONOCHROME, "Monochrome avec teinte", false, {"yuv420p", "rgb24"}});
    filters.push_back({"color_controls", "Contrôles Couleur", FilterType::COLOR_CONTROLS, "Luminosité, contraste, saturation", false, {"yuv420p", "rgb24"}});
    filters.push_back({"vintage", "Vintage", FilterType::VINTAGE, "Effet vintage années 70", false, {"yuv420p", "rgb24"}});
    filters.push_back({"cool", "Cool", FilterType::COOL, "Effet froid bleuté", false, {"yuv420p", "rgb24"}});
    filters.push_back({"warm", "Warm", FilterType::WARM, "Effet chaud orangé", false, {"yuv420p", "rgb24"}});
    #else
    // Filtres de base en mode fallback
    filters.push_back({"sepia", "Sépia", FilterType::SEPIA, "Effet sépia (fallback)", false, {"yuv420p", "rgb24"}});
    filters.push_back({"noir", "Noir & Blanc", FilterType::NOIR, "Conversion noir et blanc (fallback)", false, {"yuv420p", "rgb24"}});
    filters.push_back({"monochrome", "Monochrome", FilterType::MONOCHROME, "Monochrome (fallback)", false, {"yuv420p", "rgb24"}});
    filters.push_back({"color_controls", "Contrôles Couleur", FilterType::COLOR_CONTROLS, "Contrôles de base (fallback)", false, {"yuv420p", "rgb24"}});
    #endif
    
    return filters;
}

bool FFmpegFilterProcessor::setVideoFormat(int width, int height, const std::string& pixelFormat) {
    width_ = width;
    height_ = height;
    pixelFormat_ = pixelFormat;
    
    std::cout << "[FFmpegFilterProcessor] Format vidéo: " << width << "x" << height 
              << " (" << pixelFormat << ")" << std::endl;
    return true;
}

bool FFmpegFilterProcessor::setFrameRate(int fps) {
    frameRate_ = fps;
    std::cout << "[FFmpegFilterProcessor] Frame rate: " << fps << " fps" << std::endl;
    return true;
}

// Méthodes privées
#ifdef FFMPEG_AVAILABLE
bool FFmpegFilterProcessor::createFilterGraph() {
    if (filterGraph_) {
        destroyFilterGraph();
    }
    
    filterGraph_ = avfilter_graph_alloc();
    if (!filterGraph_) {
        setLastError("Impossible de créer le graphe de filtres FFmpeg");
        return false;
    }
    
    return true;
}

void FFmpegFilterProcessor::destroyFilterGraph() {
    if (filterGraph_) {
        avfilter_graph_free(&filterGraph_);
        filterGraph_ = nullptr;
    }
    
    if (inputFrame_) {
        av_frame_free(&inputFrame_);
        inputFrame_ = nullptr;
    }
    
    if (outputFrame_) {
        av_frame_free(&outputFrame_);
        outputFrame_ = nullptr;
    }
    
    sourceContext_ = nullptr;
    sinkContext_ = nullptr;
}

bool FFmpegFilterProcessor::addFilterToGraph(const FilterState& filter) {
    if (!filterGraph_) {
        return false;
    }
    
    std::string filterString = getFFmpegFilterString(filter);
    if (filterString.empty()) {
        setLastError("Filtre FFmpeg non supporté");
        return false;
    }

    // Créer buffersrc/buffersink
    const AVFilter* buffersrc = avfilter_get_by_name("buffer");
    const AVFilter* buffersink = avfilter_get_by_name("buffersink");
    if (!buffersrc || !buffersink) {
        setLastError("Impossible d'obtenir buffer/buffersink");
        return false;
    }

    char args[256];
    AVPixelFormat pix = av_get_pix_fmt(pixelFormat_.empty() ? "yuv420p" : pixelFormat_.c_str());
    if (pix == AV_PIX_FMT_NONE) pix = AV_PIX_FMT_YUV420P;
    snprintf(args, sizeof(args),
             "video_size=%dx%d:pix_fmt=%d:time_base=1/%d:frame_rate=%d/1:pixel_aspect=1/1",
             width_, height_, pix, frameRate_, frameRate_);

    int ret = avfilter_graph_create_filter(&sourceContext_, buffersrc, "in", args, NULL, filterGraph_);
    if (ret < 0) { setLastError("create_filter buffer a échoué"); return false; }

    ret = avfilter_graph_create_filter(&sinkContext_, buffersink, "out", NULL, NULL, filterGraph_);
    if (ret < 0) { setLastError("create_filter buffersink a échoué"); return false; }

    // Verrouiller le format de sortie pour éviter conversions implicites
    static const AVPixelFormat pix_fmts[] = { pix, AV_PIX_FMT_NONE };
    ret = av_opt_set_int_list(sinkContext_, "pix_fmts", pix_fmts, AV_PIX_FMT_NONE, AV_OPT_SEARCH_CHILDREN);
    if (ret < 0) { setLastError("Impossible de fixer pix_fmts sur buffersink"); return false; }

    // Construire la description: [in]filterString[out]
    std::string desc = "[in]" + filterString + "[out]";

    AVFilterInOut* outputs = avfilter_inout_alloc();
    AVFilterInOut* inputs = avfilter_inout_alloc();
    if (!outputs || !inputs) {
        if (outputs) avfilter_inout_free(&outputs);
        if (inputs) avfilter_inout_free(&inputs);
        setLastError("Allocation AVFilterInOut a échoué");
        return false;
    }
    outputs->name = av_strdup("in");
    outputs->filter_ctx = sourceContext_;
    outputs->pad_idx = 0;
    outputs->next = nullptr;

    inputs->name = av_strdup("out");
    inputs->filter_ctx = sinkContext_;
    inputs->pad_idx = 0;
    inputs->next = nullptr;

    ret = avfilter_graph_parse_ptr(filterGraph_, desc.c_str(), &inputs, &outputs, NULL);
    if (ret < 0) {
        avfilter_inout_free(&outputs);
        avfilter_inout_free(&inputs);
        setLastError("avfilter_graph_parse_ptr a échoué");
        return false;
    }
    // Libérer les in/out maintenant que le graphe est parsé
    avfilter_inout_free(&outputs);
    avfilter_inout_free(&inputs);
    ret = avfilter_graph_config(filterGraph_, NULL);
    if (ret < 0) {
        setLastError("avfilter_graph_config a échoué");
        return false;
    }

    std::cout << "[FFmpegFilterProcessor] Graphe FFmpeg configuré: " << filterString << std::endl;
    return true;
}

bool FFmpegFilterProcessor::configureFilter(const FilterState& filter, AVFilterContext* filterCtx) {
    // Configuration des paramètres du filtre FFmpeg
    // Note: Implémentation simplifiée
    return true;
}

std::string FFmpegFilterProcessor::getFFmpegFilterString(const FilterState& filter) const {
    switch (filter.type) {
        case FilterType::SEPIA:
            return "colorbalance=rs=" + std::to_string(filter.params.intensity * 0.3) + 
                   ":gs=" + std::to_string(filter.params.intensity * 0.1) + 
                   ":bs=" + std::to_string(-filter.params.intensity * 0.4);
        
        case FilterType::NOIR:
            return "hue=s=0";
        
        case FilterType::MONOCHROME:
            return "hue=s=0.5";
        
        case FilterType::COLOR_CONTROLS:
            return "eq=brightness=" + std::to_string(filter.params.brightness) +
                   ":contrast=" + std::to_string(filter.params.contrast) +
                   ":saturation=" + std::to_string(filter.params.saturation);
        
        case FilterType::VINTAGE:
            return "colorbalance=rs=0.2:gs=0.1:bs=-0.3,hue=s=0.8";
        
        case FilterType::COOL:
            return "colorbalance=rs=-0.2:gs=0.1:bs=0.3";
        
        case FilterType::WARM:
            return "colorbalance=rs=0.3:gs=0.1:bs=-0.2";
        
        default:
            return "";
    }
}
#else
bool FFmpegFilterProcessor::createFilterGraph() {
    // Mode fallback: pas de graphe FFmpeg
    return true;
}

void FFmpegFilterProcessor::destroyFilterGraph() {
    // Mode fallback: rien à détruire
}

bool FFmpegFilterProcessor::addFilterToGraph(const FilterState& filter) {
    // Mode fallback: simulation
    std::cout << "[FFmpegFilterProcessor] Simulation filtre: " << static_cast<int>(filter.type) << std::endl;
    return true;
}

bool FFmpegFilterProcessor::configureFilter(const FilterState& filter, AVFilterContext* filterCtx) {
    // Mode fallback: pas de configuration FFmpeg
    return true;
}

std::string FFmpegFilterProcessor::getFFmpegFilterString(const FilterState& filter) const {
    // Mode fallback: chaîne vide
    return "";
}
#endif

void FFmpegFilterProcessor::setLastError(const std::string& error) {
    lastError_ = error;
    std::cout << "[FFmpegFilterProcessor] Erreur: " << error << std::endl;
}

bool FFmpegFilterProcessor::isFFmpegAvailable() const {
    #ifdef FFMPEG_AVAILABLE
    return true;
    #else
    return false;
    #endif
}

std::string FFmpegFilterProcessor::getSupportedPixelFormats() const {
    #ifdef FFMPEG_AVAILABLE
    return "yuv420p,yuv422p,yuv444p,rgb24,bgr24,rgba,bgra";
    #else
    return "yuv420p,rgb24";
    #endif
}

} // namespace Camera
