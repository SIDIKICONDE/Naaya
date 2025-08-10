#include "FilterManager.hpp"
#include <iostream>
#include <algorithm>
#include <cstring>
#include <thread>
#include <future>
#if defined(__AVX2__)
#include <immintrin.h>
#elif defined(__SSE2__)
#include <emmintrin.h>
#endif

namespace Camera {

// ThreadPool implementation
ThreadPool::ThreadPool(size_t numThreads) {
    for (size_t i = 0; i < numThreads; ++i) {
        workers_.emplace_back([this] {
            while (true) {
                std::function<void()> task;
                {
                    std::unique_lock<std::mutex> lock(queueMutex_);
                    condition_.wait(lock, [this] { return stop_ || !tasks_.empty(); });
                    if (stop_ && tasks_.empty()) {
                        return;
                    }
                    task = std::move(tasks_.front());
                    tasks_.pop();
                }
                task();
            }
        });
    }
}

ThreadPool::~ThreadPool() {
    {
        std::unique_lock<std::mutex> lock(queueMutex_);
        stop_ = true;
    }
    condition_.notify_all();
    for (std::thread& worker : workers_) {
        worker.join();
    }
}

FilterManager::FilterManager() {
    std::cout << "[FilterManager] Construction" << std::endl;
    // Initialiser le thread pool avec le nombre optimal de threads
    size_t numThreads = std::min(std::thread::hardware_concurrency(), 8u);
    threadPool_ = std::make_unique<ThreadPool>(numThreads);
    parallelBuffers_.resize(numThreads);
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
        // Pas de filtres actifs, copier directement avec SIMD si possible
        if (inputSize <= outputSize) {
            // Utiliser memcpy optimisé ou copie SIMD
            #if defined(__AVX2__)
            const size_t simdSize = inputSize & ~31;  // Align to 32 bytes for AVX2
            const uint8_t* src = static_cast<const uint8_t*>(inputData);
            uint8_t* dst = static_cast<uint8_t*>(outputData);
            
            for (size_t i = 0; i < simdSize; i += 32) {
                __m256i data = _mm256_loadu_si256(reinterpret_cast<const __m256i*>(src + i));
                _mm256_storeu_si256(reinterpret_cast<__m256i*>(dst + i), data);
            }
            
            // Copy remaining bytes
            std::memcpy(dst + simdSize, src + simdSize, inputSize - simdSize);
            #elif defined(__SSE2__)
            const size_t simdSize = inputSize & ~15;  // Align to 16 bytes for SSE2
            const uint8_t* src = static_cast<const uint8_t*>(inputData);
            uint8_t* dst = static_cast<uint8_t*>(outputData);

            for (size_t i = 0; i < simdSize; i += 16) {
                __m128i data = _mm_loadu_si128(reinterpret_cast<const __m128i*>(src + i));
                _mm_storeu_si128(reinterpret_cast<__m128i*>(dst + i), data);
            }
            std::memcpy(dst + simdSize, src + simdSize, inputSize - simdSize);
            #else
            std::memcpy(outputData, inputData, inputSize);
            #endif
            return true;
        } else {
            setLastError("Taille de sortie insuffisante");
            return false;
        }
    }
    
    // Optimisation: réutiliser les buffers temporaires
    static thread_local std::vector<uint8_t> tempBuffer1;
    static thread_local std::vector<uint8_t> tempBuffer2;
    
    // Préallouer les buffers si nécessaire
    if (tempBuffer1.size() < inputSize) {
        tempBuffer1.resize(inputSize * 2);  // Prévoir de la marge
    }
    if (tempBuffer2.size() < inputSize) {
        tempBuffer2.resize(inputSize * 2);
    }
    
    // Utiliser double buffering pour éviter les copies
    void* currentInput = const_cast<void*>(inputData);
    void* currentOutput = tempBuffer1.data();
    size_t currentSize = inputSize;
    bool useBuffer1 = true;
    
    // Traiter chaque filtre avec double buffering
    for (size_t i = 0; i < activeFilters_.size(); ++i) {
        const auto& filter = activeFilters_[i];
        std::shared_ptr<IFilterProcessor> processor;
        
        if (!findBestProcessor(filter, processor)) {
            setLastError("Aucun processeur pour le filtre: " + std::to_string(static_cast<int>(filter.type)));
            return false;
        }
        
        // Dernier filtre: écrire directement dans outputData
        if (i == activeFilters_.size() - 1) {
            currentOutput = outputData;
        } else {
            // Alterner entre les buffers
            currentOutput = useBuffer1 ? tempBuffer2.data() : tempBuffer1.data();
        }
        
        // Appliquer le filtre
        if (!processor->applyFilter(filter, currentInput, currentSize, 
                                  currentOutput, outputSize)) {
            setLastError("Échec d'application du filtre");
            return false;
        }
        
        // Préparer pour le prochain filtre
        currentInput = currentOutput;
        currentSize = outputSize;  // Supposer que la taille reste constante
        useBuffer1 = !useBuffer1;
    }
    
    return true;
}

bool FilterManager::processFrameParallel(const void* inputData, size_t inputSize,
                                        void* outputData, size_t outputSize) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!initialized_) {
        setLastError("FilterManager non initialisé");
        return false;
    }
    
    if (activeFilters_.empty()) {
        // Pas de filtres actifs, utiliser processFrame standard
        return processFrame(inputData, inputSize, outputData, outputSize);
    }
    
    // Pour le traitement parallèle d'images, diviser l'image en bandes horizontales
    if (inputHeight_ <= 0 || inputWidth_ <= 0) {
        // Pas d'informations sur les dimensions, utiliser le traitement séquentiel
        return processFrame(inputData, inputSize, outputData, outputSize);
    }
    
    // Calculer la taille d'une ligne
    size_t bytesPerPixel = inputSize / (inputHeight_ * inputWidth_);
    size_t bytesPerRow = inputWidth_ * bytesPerPixel;
    
    // Diviser en bandes pour traitement parallèle
    size_t numThreads = std::min(static_cast<size_t>(inputHeight_), threadPoolSize_);
    size_t rowsPerThread = inputHeight_ / numThreads;
    size_t remainingRows = inputHeight_ % numThreads;
    
    std::vector<std::future<bool>> futures;
    futures.reserve(numThreads);
    
    const uint8_t* inputBytes = static_cast<const uint8_t*>(inputData);
    uint8_t* outputBytes = static_cast<uint8_t*>(outputData);
    
    size_t currentRow = 0;
    for (size_t i = 0; i < numThreads; ++i) {
        size_t rowsToProcess = rowsPerThread;
        if (i < remainingRows) {
            rowsToProcess++;
        }
        
        if (rowsToProcess == 0) continue;
        
        size_t offset = currentRow * bytesPerRow;
        size_t chunkSize = rowsToProcess * bytesPerRow;
        
        // Enqueue task for this chunk
        futures.push_back(threadPool_->enqueue([this, i, inputBytes, outputBytes, offset, chunkSize]() {
            // Assurer que le buffer local est assez grand
            if (parallelBuffers_[i].size() < chunkSize * 2) {
                parallelBuffers_[i].resize(chunkSize * 2);
            }
            
            const void* chunkInput = inputBytes + offset;
            void* chunkOutput = outputBytes + offset;
            
            // Traiter chaque filtre pour cette bande
            void* currentInput = const_cast<void*>(chunkInput);
            void* currentOutput = parallelBuffers_[i].data();
            bool useFirstBuffer = true;
            
            for (size_t j = 0; j < activeFilters_.size(); ++j) {
                const auto& filter = activeFilters_[j];
                std::shared_ptr<IFilterProcessor> processor;
                
                if (!findBestProcessor(filter, processor)) {
                    return false;
                }
                
                // Dernier filtre: écrire directement dans la sortie
                if (j == activeFilters_.size() - 1) {
                    currentOutput = chunkOutput;
                } else {
                    // Alterner entre les buffers
                    size_t bufferOffset = useFirstBuffer ? chunkSize : 0;
                    currentOutput = parallelBuffers_[i].data() + bufferOffset;
                }
                
                if (!processor->applyFilter(filter, currentInput, chunkSize, 
                                          currentOutput, chunkSize)) {
                    return false;
                }
                
                currentInput = currentOutput;
                useFirstBuffer = !useFirstBuffer;
            }
            
            return true;
        }));
        
        currentRow += rowsToProcess;
    }
    
    // Attendre que tous les threads terminent
    bool success = true;
    for (auto& future : futures) {
        if (!future.get()) {
            success = false;
        }
    }
    
    return success;
}

void FilterManager::setParallelProcessing(bool enabled) {
    std::lock_guard<std::mutex> lock(mutex_);
    parallelProcessingEnabled_ = enabled;
    std::cout << "[FilterManager] Traitement parallèle: " << (enabled ? "activé" : "désactivé") << std::endl;
}

bool FilterManager::isParallelProcessingEnabled() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return parallelProcessingEnabled_;
}

void FilterManager::setThreadPoolSize(size_t numThreads) {
    std::lock_guard<std::mutex> lock(mutex_);
    threadPoolSize_ = std::max(size_t(1), std::min(numThreads, size_t(16)));
    
    // Recréer le thread pool avec la nouvelle taille
    threadPool_ = std::make_unique<ThreadPool>(threadPoolSize_);
    parallelBuffers_.resize(threadPoolSize_);
    
    std::cout << "[FilterManager] Taille du pool de threads: " << threadPoolSize_ << std::endl;
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
