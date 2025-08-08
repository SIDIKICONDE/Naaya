#pragma once

#include "../common/FilterTypes.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <mutex>

namespace Camera {

/**
 * Gestionnaire principal des filtres
 * Architecture modulaire permettant d'ajouter différents processeurs
 */
class FilterManager {
public:
    FilterManager();
    ~FilterManager();
    
    // Initialisation
    bool initialize();
    void shutdown();
    
    // Gestion des processeurs
    bool registerProcessor(std::shared_ptr<IFilterProcessor> processor);
    bool unregisterProcessor(const std::string& name);
    std::vector<std::string> getAvailableProcessors() const;
    
    // Gestion des filtres
    bool addFilter(const FilterState& filter);
    bool removeFilter(FilterType type);
    bool clearFilters();
    FilterState getFilter(FilterType type) const;
    std::vector<FilterState> getActiveFilters() const;
    
    // Traitement
    bool processFrame(const void* inputData, size_t inputSize,
                     void* outputData, size_t outputSize);
    
    // Configuration
    bool setInputFormat(const std::string& format, int width, int height);
    bool setOutputFormat(const std::string& format, int width, int height);
    
    // Informations
    bool isInitialized() const;
    std::string getLastError() const;
    std::vector<FilterInfo> getAvailableFilters() const;
    
    // Factory pour créer des filtres prédéfinis
    static FilterState createSepiaFilter(double intensity = 1.0);
    static FilterState createNoirFilter(double intensity = 1.0);
    static FilterState createMonochromeFilter(double intensity = 1.0);
    static FilterState createColorControlsFilter(double brightness = 0.0, 
                                               double contrast = 1.0, 
                                               double saturation = 1.0);
    static FilterState createVintageFilter(double intensity = 1.0);
    static FilterState createCoolFilter(double intensity = 1.0);
    static FilterState createWarmFilter(double intensity = 1.0);
    static FilterState createCustomFilter(const std::string& name, 
                                        const std::vector<double>& params);

private:
    // État interne
    mutable std::mutex mutex_;
    bool initialized_{false};
    std::string lastError_;
    
    // Processeurs enregistrés
    std::vector<std::shared_ptr<IFilterProcessor>> processors_;
    std::unordered_map<std::string, std::shared_ptr<IFilterProcessor>> processorMap_;
    
    // Filtres actifs
    std::vector<FilterState> activeFilters_;
    
    // Configuration
    std::string inputFormat_;
    std::string outputFormat_;
    int inputWidth_{0};
    int inputHeight_{0};
    int outputWidth_{0};
    int outputHeight_{0};
    
    // Méthodes privées
    bool findBestProcessor(const FilterState& filter, std::shared_ptr<IFilterProcessor>& processor);
    void setLastError(const std::string& error);
    bool validateFilter(const FilterState& filter) const;
};

} // namespace Camera
