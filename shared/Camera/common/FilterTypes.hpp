#pragma once

#include <string>
#include <vector>

namespace Camera {

/**
 * Types de filtres supportés
 */
enum class FilterType {
    NONE,           // Pas de filtre
    SEPIA,          // Effet sépia
    NOIR,           // Noir et blanc
    MONOCHROME,     // Monochrome
    COLOR_CONTROLS, // Contrôles de couleur
    VINTAGE,        // Effet vintage
    COOL,           // Effet cool
    WARM,           // Effet chaud
    CUSTOM          // Filtre personnalisé
};

/**
 * Paramètres d'un filtre
 */
struct FilterParams {
    double intensity{1.0};     // Intensité du filtre (0.0 - 1.0)
    double brightness{0.0};    // Luminosité (-1.0 à 1.0)
    double contrast{1.0};      // Contraste (0.0 à 2.0)
    double saturation{1.0};    // Saturation (0.0 à 2.0)
    double hue{0.0};          // Teinte (-180 à 180)
    double gamma{1.0};        // Gamma (0.1 à 3.0)
    
    // Paramètres spécifiques par filtre
    std::string customFilterName;
    std::vector<double> customParams;
    // Support LUT 3D (.cube) – lorsque customFilterName commence par "lut3d:",
    // customLUTPath contient le chemin absolu vers le fichier .cube
    std::string customLUTPath;
};

/**
 * État d'un filtre actif
 */
struct FilterState {
    FilterType type{FilterType::NONE};
    FilterParams params;
    bool isActive{false};
    
    FilterState() = default;
    FilterState(FilterType t, const FilterParams& p) : type(t), params(p), isActive(true) {}
};

/**
 * Informations sur un filtre disponible
 */
struct FilterInfo {
    std::string name;           // Nom du filtre
    std::string displayName;    // Nom d'affichage
    FilterType type;            // Type du filtre
    std::string description;    // Description
    bool isCustom{false};       // Filtre personnalisé
    std::vector<std::string> supportedFormats; // Formats supportés
};

/**
 * Interface pour un processeur de filtre
 */
class IFilterProcessor {
public:
    virtual ~IFilterProcessor() = default;
    
    // Initialisation
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;
    
    // Application de filtre
    virtual bool applyFilter(const FilterState& filter, const void* inputData, 
                           size_t inputSize, void* outputData, size_t outputSize) = 0;
    
    // Vérification de support
    virtual bool supportsFormat(const std::string& format) const = 0;
    virtual bool supportsFilter(FilterType type) const = 0;
    
    // Informations
    virtual std::string getName() const = 0;
    virtual std::vector<FilterInfo> getSupportedFilters() const = 0;
};

/**
 * Interface pour un pipeline de filtres
 */
class IFilterPipeline {
public:
    virtual ~IFilterPipeline() = default;
    
    // Gestion des filtres
    virtual bool addFilter(const FilterState& filter) = 0;
    virtual bool removeFilter(FilterType type) = 0;
    virtual bool clearFilters() = 0;
    virtual FilterState getFilter(FilterType type) const = 0;
    virtual std::vector<FilterState> getActiveFilters() const = 0;
    
    // Traitement
    virtual bool processFrame(const void* inputData, size_t inputSize,
                            void* outputData, size_t outputSize) = 0;
    
    // Configuration
    virtual bool setInputFormat(const std::string& format, int width, int height) = 0;
    virtual bool setOutputFormat(const std::string& format, int width, int height) = 0;
    
    // État
    virtual bool isInitialized() const = 0;
    virtual std::string getLastError() const = 0;
};

} // namespace Camera
