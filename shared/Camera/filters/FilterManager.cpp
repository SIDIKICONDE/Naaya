#include "FilterManager.hpp"
#include <iostream>
#include <algorithm>
#include <cstring>

namespace Camera {

FilterManager::FilterManager() {
    std::cout << "[FilterManager] Construction" << std::endl;
}

FilterManager::~FilterManager() {
    shutdown();
    std::cout << "[FilterManager] Destruction" << std::endl;
}

bool FilterManager::initialize() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (initialized_) {
        return true;
    }
    
    std::cout << "[FilterManager] Initialisation..." << std::endl;
    
    // Réinitialiser l'état
    lastError_.clear();
    activeFilters_.clear();
    
    initialized_ = true;
    std::cout << "[FilterManager] Initialisation terminée" << std::endl;
    return true;
}

void FilterManager::shutdown() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!initialized_) {
        return;
    }
    
    std::cout << "[FilterManager] Arrêt..." << std::endl;
    
    // Arrêter tous les processeurs
    for (auto& processor : processors_) {
        if (processor) {
            processor->shutdown();
        }
    }
    
    processors_.clear();
    processorMap_.clear();
    activeFilters_.clear();
    
    initialized_ = false;
    std::cout << "[FilterManager] Arrêt terminé" << std::endl;
}

bool FilterManager::registerProcessor(std::shared_ptr<IFilterProcessor> processor) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!processor) {
        setLastError("Processeur invalide");
        return false;
    }
    
    std::string name = processor->getName();
    if (processorMap_.find(name) != processorMap_.end()) {
        setLastError("Processeur déjà enregistré: " + name);
        return false;
    }
    
    // Initialiser le processeur
    if (!processor->initialize()) {
        setLastError("Échec d'initialisation du processeur: " + name);
        return false;
    }
    
    processors_.push_back(processor);
    processorMap_[name] = processor;
    
    std::cout << "[FilterManager] Processeur enregistré: " << name << std::endl;
    return true;
}

bool FilterManager::unregisterProcessor(const std::string& name) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = processorMap_.find(name);
    if (it == processorMap_.end()) {
        setLastError("Processeur non trouvé: " + name);
        return false;
    }
    
    // Arrêter le processeur
    it->second->shutdown();
    
    // Retirer des listes
    processors_.erase(
        std::remove_if(processors_.begin(), processors_.end(),
                      [&](const std::shared_ptr<IFilterProcessor>& p) {
                          return p->getName() == name;
                      }),
        processors_.end()
    );
    processorMap_.erase(it);
    
    std::cout << "[FilterManager] Processeur désenregistré: " << name << std::endl;
    return true;
}

std::vector<std::string> FilterManager::getAvailableProcessors() const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> names;
    names.reserve(processors_.size());
    
    for (const auto& processor : processors_) {
        names.push_back(processor->getName());
    }
    
    return names;
}

bool FilterManager::addFilter(const FilterState& filter) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!validateFilter(filter)) {
        return false;
    }
    
    // Vérifier si un processeur supporte ce filtre
    std::shared_ptr<IFilterProcessor> processor;
    if (!findBestProcessor(filter, processor)) {
        setLastError("Aucun processeur ne supporte ce filtre");
        return false;
    }
    
    // Retirer l'ancien filtre du même type s'il existe
    removeFilter(filter.type);
    
    // Ajouter le nouveau filtre
    activeFilters_.push_back(filter);
    
    std::cout << "[FilterManager] Filtre ajouté: " << static_cast<int>(filter.type) 
              << " (intensité: " << filter.params.intensity << ")" << std::endl;
    return true;
}

bool FilterManager::removeFilter(FilterType type) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = std::find_if(activeFilters_.begin(), activeFilters_.end(),
                          [type](const FilterState& filter) {
                              return filter.type == type;
                          });
    
    if (it != activeFilters_.end()) {
        activeFilters_.erase(it);
        std::cout << "[FilterManager] Filtre retiré: " << static_cast<int>(type) << std::endl;
        return true;
    }
    
    return false;
}

bool FilterManager::clearFilters() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    activeFilters_.clear();
    std::cout << "[FilterManager] Tous les filtres supprimés" << std::endl;
    return true;
}

FilterState FilterManager::getFilter(FilterType type) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = std::find_if(activeFilters_.begin(), activeFilters_.end(),
                          [type](const FilterState& filter) {
                              return filter.type == type;
                          });
    
    if (it != activeFilters_.end()) {
        return *it;
    }
    
    return FilterState();
}

std::vector<FilterState> FilterManager::getActiveFilters() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeFilters_;
}

bool FilterManager::processFrame(const void* inputData, size_t inputSize,
                               void* outputData, size_t outputSize) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!initialized_) {
        setLastError("FilterManager non initialisé");
        return false;
    }
    
    if (activeFilters_.empty()) {
        // Pas de filtres actifs, copier directement
        if (inputSize <= outputSize) {
            std::memcpy(outputData, inputData, inputSize);
            return true;
        } else {
            setLastError("Taille de sortie insuffisante");
            return false;
        }
    }
    
    // Traiter chaque filtre en séquence
    void* currentInput = const_cast<void*>(inputData);
    size_t currentInputSize = inputSize;
    
    // Buffer temporaire pour le traitement en chaîne
    std::vector<uint8_t> tempBuffer;
    
    for (const auto& filter : activeFilters_) {
        std::shared_ptr<IFilterProcessor> processor;
        if (!findBestProcessor(filter, processor)) {
            setLastError("Aucun processeur pour le filtre: " + std::to_string(static_cast<int>(filter.type)));
            return false;
        }
        
        // Déterminer la taille de sortie nécessaire
        size_t requiredOutputSize = currentInputSize; // Simplification
        if (tempBuffer.size() < requiredOutputSize) {
            tempBuffer.resize(requiredOutputSize);
        }
        
        // Appliquer le filtre
        if (!processor->applyFilter(filter, currentInput, currentInputSize, 
                                  tempBuffer.data(), tempBuffer.size())) {
            setLastError("Échec d'application du filtre");
            return false;
        }
        
        // Mettre à jour pour le prochain filtre
        currentInput = tempBuffer.data();
        currentInputSize = requiredOutputSize;
    }
    
    // Copier le résultat final
    if (currentInputSize <= outputSize) {
        std::memcpy(outputData, currentInput, currentInputSize);
        return true;
    } else {
        setLastError("Taille de sortie finale insuffisante");
        return false;
    }
}

bool FilterManager::setInputFormat(const std::string& format, int width, int height) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    inputFormat_ = format;
    inputWidth_ = width;
    inputHeight_ = height;
    
    std::cout << "[FilterManager] Format d'entrée défini: " << format 
              << " (" << width << "x" << height << ")" << std::endl;
    return true;
}

bool FilterManager::setOutputFormat(const std::string& format, int width, int height) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    outputFormat_ = format;
    outputWidth_ = width;
    outputHeight_ = height;
    
    std::cout << "[FilterManager] Format de sortie défini: " << format 
              << " (" << width << "x" << height << ")" << std::endl;
    return true;
}

bool FilterManager::isInitialized() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return initialized_;
}

std::string FilterManager::getLastError() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return lastError_;
}

std::vector<FilterInfo> FilterManager::getAvailableFilters() const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<FilterInfo> allFilters;
    
    for (const auto& processor : processors_) {
        auto filters = processor->getSupportedFilters();
        allFilters.insert(allFilters.end(), filters.begin(), filters.end());
    }
    
    return allFilters;
}

// Méthodes Factory pour créer des filtres prédéfinis
FilterState FilterManager::createSepiaFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::SEPIA, params);
}

FilterState FilterManager::createNoirFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::NOIR, params);
}

FilterState FilterManager::createMonochromeFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::MONOCHROME, params);
}

FilterState FilterManager::createColorControlsFilter(double brightness, double contrast, double saturation) {
    FilterParams params;
    params.brightness = std::max(-1.0, std::min(1.0, brightness));
    params.contrast = std::max(0.0, std::min(2.0, contrast));
    params.saturation = std::max(0.0, std::min(2.0, saturation));
    return FilterState(FilterType::COLOR_CONTROLS, params);
}

FilterState FilterManager::createVintageFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::VINTAGE, params);
}

FilterState FilterManager::createCoolFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::COOL, params);
}

FilterState FilterManager::createWarmFilter(double intensity) {
    FilterParams params;
    params.intensity = std::max(0.0, std::min(1.0, intensity));
    return FilterState(FilterType::WARM, params);
}

FilterState FilterManager::createCustomFilter(const std::string& name, const std::vector<double>& params) {
    FilterParams filterParams;
    filterParams.customFilterName = name;
    filterParams.customParams = params;
    return FilterState(FilterType::CUSTOM, filterParams);
}

// Méthodes privées
bool FilterManager::findBestProcessor(const FilterState& filter, std::shared_ptr<IFilterProcessor>& processor) {
    for (const auto& proc : processors_) {
        if (proc->supportsFilter(filter.type)) {
            processor = proc;
            return true;
        }
    }
    return false;
}

void FilterManager::setLastError(const std::string& error) {
    lastError_ = error;
    std::cout << "[FilterManager] Erreur: " << error << std::endl;
}

bool FilterManager::validateFilter(const FilterState& filter) const {
    if (!filter.isActive) {
        return false;
    }
    
    if (filter.params.intensity < 0.0 || filter.params.intensity > 1.0) {
        return false;
    }
    
    return true;
}

} // namespace Camera
