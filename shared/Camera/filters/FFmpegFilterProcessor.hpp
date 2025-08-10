#pragma once

#include "../common/FilterTypes.hpp"
#include <string>
#include <vector>

// Forward declarations pour FFmpeg
extern "C" {
    struct AVCodecContext;
    struct AVFilterContext;
    struct AVFilterGraph;
    struct AVFrame;
    struct AVBufferRef;
}

namespace Camera {

/**
 * Processeur de filtres utilisant FFmpeg
 * Supporte les filtres vidéo FFmpeg pour le traitement en temps réel
 */
class FFmpegFilterProcessor : public IFilterProcessor {
public:
    FFmpegFilterProcessor();
    ~FFmpegFilterProcessor() override;
    
    // IFilterProcessor interface
    bool initialize() override;
    void shutdown() override;
    
    bool applyFilter(const FilterState& filter, const void* inputData, 
                   size_t inputSize, void* outputData, size_t outputSize) override;
    
    bool supportsFormat(const std::string& format) const override;
    bool supportsFilter(FilterType type) const override;
    
    std::string getName() const override;
    std::vector<FilterInfo> getSupportedFilters() const override;
    
    // Configuration spécifique FFmpeg
    bool setVideoFormat(int width, int height, const std::string& pixelFormat);
    bool setFrameRate(int fps);
    
    // Application optimisée avec gestion de stride (évite les copies pack/unpack)
    // pixFormat: chaîne FFmpeg (ex: "bgra", "yuv420p")
    bool applyFilterWithStride(const FilterState& filter,
                               const uint8_t* inputData,
                               int inputStride,
                               int width,
                               int height,
                               const char* pixFormat,
                               uint8_t* outputData,
                               int outputStride);
    
private:
    // État FFmpeg
    bool initialized_{false};
    std::string lastError_;
    
    // Configuration vidéo
    int width_{0};
    int height_{0};
    std::string pixelFormat_;
    int frameRate_{30};
    
    // Contexte FFmpeg
    AVFilterGraph* filterGraph_{nullptr};
    AVFilterContext* sourceContext_{nullptr};
    AVFilterContext* sinkContext_{nullptr};
    AVFrame* inputFrame_{nullptr};
    AVFrame* outputFrame_{nullptr};
    
    // Méthodes privées
    bool createFilterGraph();
    void destroyFilterGraph();
    bool addFilterToGraph(const FilterState& filter);
    bool configureFilter(const FilterState& filter, AVFilterContext* filterCtx);
    std::string getFFmpegFilterString(const FilterState& filter) const;
    void setLastError(const std::string& error);
    
    // Utilitaires
    bool isFFmpegAvailable() const;
    std::string getSupportedPixelFormats() const;

    // Cache/optimisation
    bool ensureGraph(const FilterState& filter);
    int lastWidth_{0};
    int lastHeight_{0};
    int lastFrameRate_{0};
    std::string lastPixelFormat_;
    std::string lastFilterDesc_;
};

} // namespace Camera
