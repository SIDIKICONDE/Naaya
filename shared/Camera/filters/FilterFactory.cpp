#include "FilterFactory.hpp"
#include "FFmpegFilterProcessor.hpp"
#include <iostream>

namespace Camera {

// Initialisation de la variable statique
FilterFactory::ProcessorType FilterFactory::defaultProcessor_ = FilterFactory::ProcessorType::FFMPEG;

std::shared_ptr<IFilterProcessor> FilterFactory::createProcessor(ProcessorType type) {
    switch (type) {
        case ProcessorType::FFMPEG:
            return createFFmpegProcessor();
        
        case ProcessorType::CORE_IMAGE:
            return createCoreImageProcessor();
        
        case ProcessorType::OPENGL:
            return createOpenGLProcessor();
        
        case ProcessorType::CUSTOM:
            // Pour l'instant, retourner FFmpeg comme fallback
            std::cout << "[FilterFactory] Processeur CUSTOM non implémenté, fallback vers FFmpeg" << std::endl;
            return createFFmpegProcessor();
        
        default:
            std::cout << "[FilterFactory] Type de processeur inconnu, fallback vers FFmpeg" << std::endl;
            return createFFmpegProcessor();
    }
}

std::shared_ptr<IFilterProcessor> FilterFactory::createFFmpegProcessor() {
    std::cout << "[FilterFactory] Création du processeur FFmpeg" << std::endl;
    return std::make_shared<FFmpegFilterProcessor>();
}

std::shared_ptr<IFilterProcessor> FilterFactory::createCoreImageProcessor() {
    std::cout << "[FilterFactory] Processeur Core Image non implémenté, fallback vers FFmpeg" << std::endl;
    // TODO: Implémenter CoreImageFilterProcessor pour iOS
    return createFFmpegProcessor();
}

std::shared_ptr<IFilterProcessor> FilterFactory::createOpenGLProcessor() {
    std::cout << "[FilterFactory] Processeur OpenGL non implémenté, fallback vers FFmpeg" << std::endl;
    // TODO: Implémenter OpenGLFilterProcessor
    return createFFmpegProcessor();
}

std::vector<std::string> FilterFactory::getAvailableProcessorTypes() {
    std::vector<std::string> types;
    
    // FFmpeg est toujours disponible (avec fallback)
    types.push_back("FFMPEG");
    
    // Core Image disponible sur iOS
    #ifdef __APPLE__
    types.push_back("CORE_IMAGE");
    #endif
    
    // OpenGL disponible partout
    types.push_back("OPENGL");
    
    return types;
}

bool FilterFactory::isProcessorTypeAvailable(ProcessorType type) {
    switch (type) {
        case ProcessorType::FFMPEG:
            return true; // Toujours disponible avec fallback
        
        case ProcessorType::CORE_IMAGE:
            #ifdef __APPLE__
            return true;
            #else
            return false;
            #endif
        
        case ProcessorType::OPENGL:
            return true; // OpenGL disponible partout
        
        case ProcessorType::CUSTOM:
            return false; // Pas encore implémenté
        
        default:
            return false;
    }
}

void FilterFactory::setDefaultProcessor(ProcessorType type) {
    if (isProcessorTypeAvailable(type)) {
        defaultProcessor_ = type;
        std::cout << "[FilterFactory] Processeur par défaut défini: " << static_cast<int>(type) << std::endl;
    } else {
        std::cout << "[FilterFactory] Processeur non disponible: " << static_cast<int>(type) << std::endl;
    }
}

FilterFactory::ProcessorType FilterFactory::getDefaultProcessor() {
    return defaultProcessor_;
}

} // namespace Camera
