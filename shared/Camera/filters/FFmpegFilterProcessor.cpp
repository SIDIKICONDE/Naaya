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
    #include <libavutil/pixdesc.h>
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
    // Implémentation optimisée: supposer buffer packé et utiliser format courant
    if (width_ <= 0 || height_ <= 0) { setLastError("Format vidéo non défini"); return false; }
    const char* fmt = pixelFormat_.empty() ? "yuv420p" : pixelFormat_.c_str();
    int stride = 0;
    // Estimer stride packé minimal lorsque inputSize est fourni (fallback)
    if (std::strcmp(fmt, "bgra") == 0 || std::strcmp(fmt, "rgba") == 0 || std::strcmp(fmt, "rgb0") == 0) {
        stride = width_ * 4;
    } else if (std::strcmp(fmt, "rgb24") == 0 || std::strcmp(fmt, "bgr24") == 0) {
        stride = width_ * 3;
    }
    if (stride == 0) {
        // Repli: tenter packé via imgutils
        stride = width_ * 4;
    }
    return applyFilterWithStride(filter,
                                 reinterpret_cast<const uint8_t*>(inputData),
                                 stride,
                                 width_, height_, fmt,
                                 reinterpret_cast<uint8_t*>(outputData),
                                 stride);
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
    // Filtre personnalisé LUT 3D (.cube). Usage: setFilter('lut3d:/abs/path.cube', intensity)
    filters.push_back({"lut3d", "LUT 3D (.cube)", FilterType::CUSTOM, "Applique une LUT 3D au format .cube (DaVinci, etc.)", true, {"yuv420p", "rgb24"}});
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
bool FFmpegFilterProcessor::ensureGraph(const FilterState& filter) {
    // Optimisation: cache le graphe et évite la reconstruction inutile
    std::string filterString = getFFmpegFilterString(filter);
    if (filterString.empty()) { setLastError("Filtre FFmpeg non supporté"); return false; }
    
    bool formatChanged = (lastWidth_ != width_) || (lastHeight_ != height_) || 
                        (lastPixelFormat_ != pixelFormat_) || (lastFrameRate_ != frameRate_);
    bool filterChanged = (lastFilterDesc_ != filterString);
    
    // Optimisation: ne reconstruire que si vraiment nécessaire
    if (filterGraph_ && !formatChanged && !filterChanged) {
        return true;
    }
    
    // Utiliser un pool de frames pour éviter les allocations répétées
    static thread_local AVFrame* framePool[4] = {nullptr, nullptr, nullptr, nullptr};
    static thread_local int poolIndex = 0;
    
    // (Re)créer graphe si nécessaire
    if (formatChanged || !filterGraph_) {
        destroyFilterGraph();
        if (!createFilterGraph()) return false;
        if (!addFilterToGraph(filter)) return false;
    }
    
    // Réutiliser les frames du pool
    if (!inputFrame_) {
        if (framePool[0] == nullptr) {
            framePool[0] = av_frame_alloc();
        }
        inputFrame_ = framePool[0];
    }
    if (!outputFrame_) {
        if (framePool[1] == nullptr) {
            framePool[1] = av_frame_alloc();
        }
        outputFrame_ = framePool[1];
    }
    
    if (!inputFrame_ || !outputFrame_) { 
        setLastError("Impossible d'allouer les frames FFmpeg"); 
        return false; 
    }
    
    lastWidth_ = width_;
    lastHeight_ = height_;
    lastPixelFormat_ = pixelFormat_;
    lastFrameRate_ = frameRate_;
    lastFilterDesc_ = filterString;
    return true;
}

bool FFmpegFilterProcessor::applyFilterWithStride(const FilterState& filter,
                               const uint8_t* inputData,
                               int inputStride,
                               int width,
                               int height,
                               const char* pixFormat,
                               uint8_t* outputData,
                               int outputStride) {
    if (!initialized_) { setLastError("Processeur non initialisé"); return false; }
    pixelFormat_ = pixFormat ? std::string(pixFormat) : std::string("bgra");
    width_ = width; height_ = height;
    if (!ensureGraph(filter)) return false;

    AVPixelFormat pix = av_get_pix_fmt(pixelFormat_.c_str());
    if (pix == AV_PIX_FMT_NONE) pix = AV_PIX_FMT_BGRA;

    // Optimisation: éviter av_frame_unref si possible
    // Préparer frame d'entrée en référençant directement les données + stride
    inputFrame_->width = width_;
    inputFrame_->height = height_;
    inputFrame_->format = pix;
    inputFrame_->data[0] = const_cast<uint8_t*>(inputData);
    inputFrame_->linesize[0] = inputStride;
    
    // Pour formats YUV, configurer les plans supplémentaires
    if (pix == AV_PIX_FMT_YUV420P || pix == AV_PIX_FMT_YUV422P || pix == AV_PIX_FMT_YUV444P) {
        int chromaHeight = (pix == AV_PIX_FMT_YUV420P) ? height_ / 2 : height_;
        int chromaWidth = (pix == AV_PIX_FMT_YUV420P || pix == AV_PIX_FMT_YUV422P) ? width_ / 2 : width_;
        inputFrame_->data[1] = inputFrame_->data[0] + (inputStride * height_);
        inputFrame_->data[2] = inputFrame_->data[1] + (chromaWidth * chromaHeight);
        inputFrame_->linesize[1] = inputFrame_->linesize[2] = chromaWidth;
    }

    // Pousser la frame avec flag optimisé
    int ret = av_buffersrc_add_frame_flags(sourceContext_, inputFrame_, AV_BUFFERSRC_FLAG_KEEP_REF | AV_BUFFERSRC_FLAG_PUSH);
    if (ret < 0) { setLastError("buffersrc_add_frame a échoué"); return false; }

    // Tirer la frame
    ret = av_buffersink_get_frame(sinkContext_, outputFrame_);
    if (ret < 0) { setLastError("buffersink_get_frame a échoué"); return false; }

    // Optimisation: copie SIMD pour les formats supportés
    const int outLinesize = outputFrame_->linesize[0];
    const int rowBytes = av_get_bits_per_pixel(av_pix_fmt_desc_get((AVPixelFormat)outputFrame_->format)) * outputFrame_->width / 8;
    
    if (outputStride < rowBytes) {
        av_frame_unref(outputFrame_);
        setLastError("outputStride insuffisant");
        return false;
    }
    
    // Utiliser copie SIMD si disponible
    #ifdef __AVX2__
    if (rowBytes >= 32) {
        for (int y = 0; y < outputFrame_->height; ++y) {
            const uint8_t* srcRow = outputFrame_->data[0] + y * outLinesize;
            uint8_t* dstRow = outputData + y * outputStride;
            
            size_t simdBytes = rowBytes & ~31;
            for (size_t x = 0; x < simdBytes; x += 32) {
                __m256i data = _mm256_loadu_si256(reinterpret_cast<const __m256i*>(srcRow + x));
                _mm256_storeu_si256(reinterpret_cast<__m256i*>(dstRow + x), data);
            }
            
            // Copier les octets restants
            if (simdBytes < rowBytes) {
                std::memcpy(dstRow + simdBytes, srcRow + simdBytes, rowBytes - simdBytes);
            }
        }
    } else
    #endif
    {
        // Fallback vers memcpy standard
        for (int y = 0; y < outputFrame_->height; ++y) {
            const uint8_t* srcRow = outputFrame_->data[0] + y * outLinesize;
            uint8_t* dstRow = outputData + y * outputStride;
            std::memcpy(dstRow, srcRow, (size_t)rowBytes);
        }
    }
    
    // Ne pas faire av_frame_unref sur les frames du pool, juste réinitialiser les pointeurs
    outputFrame_->data[0] = nullptr;
    return true;
}
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
    auto escapeForFFmpeg = [](const std::string& path) -> std::string {
        std::string escaped;
        escaped.reserve(path.size() + 8);
        for (char c : path) {
            if (c == '\'' || c == ':') {
                escaped.push_back('\\');
            }
            escaped.push_back(c);
        }
        return escaped;
    };

    // Construire une chaîne combinée: ajustements (eq/gamma/hue) + effet principal (sepia/noir/... ou lut3d)
    std::vector<std::string> parts;

    // 1) Ajustements globaux à partir de FilterParams
    const bool needsEq = (std::abs(filter.params.brightness) > 1e-6) ||
                         (std::abs(filter.params.contrast - 1.0) > 1e-6) ||
                         (std::abs(filter.params.saturation - 1.0) > 1e-6) ||
                         (std::abs(filter.params.gamma - 1.0) > 1e-6);
    if (needsEq) {
        std::string eq = "eq=brightness=" + std::to_string(filter.params.brightness) +
                         ":contrast=" + std::to_string(filter.params.contrast) +
                         ":saturation=" + std::to_string(filter.params.saturation);
        if (std::abs(filter.params.gamma - 1.0) > 1e-6) {
            eq += ":gamma=" + std::to_string(filter.params.gamma);
        }
        parts.push_back(eq);
    }
    if (std::abs(filter.params.hue) > 1e-6) {
        // Convertir degrés -> radians pour FFmpeg hue=h
        const double radians = filter.params.hue * M_PI / 180.0;
        parts.push_back("hue=h=" + std::to_string(radians));
    }

    // 2) Effet principal selon le type
    switch (filter.type) {
        case FilterType::SEPIA: {
            parts.push_back("colorbalance=rs=" + std::to_string(filter.params.intensity * 0.3) +
                           ":gs=" + std::to_string(filter.params.intensity * 0.1) +
                           ":bs=" + std::to_string(-filter.params.intensity * 0.4));
            break;
        }
        case FilterType::NOIR: {
            parts.push_back("hue=s=0");
            break;
        }
        case FilterType::MONOCHROME: {
            parts.push_back("hue=s=0.5");
            break;
        }
        case FilterType::COLOR_CONTROLS: {
            // Rien d'autre: déjà couvert par eq/hue/gamma ci-dessus
            break;
        }
        case FilterType::VINTAGE: {
            parts.push_back("colorbalance=rs=0.2:gs=0.1:bs=-0.3,hue=s=0.8");
            break;
        }
        case FilterType::COOL: {
            parts.push_back("colorbalance=rs=-0.2:gs=0.1:bs=0.3");
            break;
        }
        case FilterType::WARM: {
            parts.push_back("colorbalance=rs=0.3:gs=0.1:bs=-0.2");
            break;
        }
        case FilterType::CUSTOM: {
            const std::string& name = filter.params.customFilterName;
            const std::string lutPrefix = "lut3d:";
            if (name.rfind(lutPrefix, 0) == 0 && name.size() > lutPrefix.size()) {
                std::string rest = name.substr(lutPrefix.size());
                std::string path = rest;
                std::string interp = "tetrahedral";
                auto qpos = rest.find('?');
                if (qpos != std::string::npos) {
                    path = rest.substr(0, qpos);
                    std::string query = rest.substr(qpos + 1);
                    size_t start = 0;
                    while (start < query.size()) {
                        size_t amp = query.find('&', start);
                        std::string pair = amp == std::string::npos ? query.substr(start) : query.substr(start, amp - start);
                        size_t eq = pair.find('=');
                        if (eq != std::string::npos) {
                            std::string key = pair.substr(0, eq);
                            std::string value = pair.substr(eq + 1);
                            if (key == "interp") {
                                if (value == "nearest" || value == "trilinear" || value == "tetrahedral") {
                                    interp = value;
                                }
                            }
                        }
                        if (amp == std::string::npos) break;
                        start = amp + 1;
                    }
                }
                std::string escapedPath = escapeForFFmpeg(path);
                parts.push_back("lut3d=file='" + escapedPath + "':interp=" + interp);
            }
            break;
        }
        default:
            break;
    }

    if (parts.empty()) {
        return "";
    }
    // Joindre par virgule
    std::string combined = parts[0];
    for (size_t i = 1; i < parts.size(); ++i) {
        combined += "," + parts[i];
    }
    return combined;
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
