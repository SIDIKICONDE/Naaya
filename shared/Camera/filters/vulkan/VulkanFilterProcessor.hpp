#pragma once

#include "../../common/FilterTypes.hpp"
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace Camera {

/**
 * Processeur de filtres basé sur Vulkan (Android moderne)
 * Implémentation initiale sûre avec fallback copie CPU si l'init Vulkan échoue
 */
class VulkanFilterProcessor : public IFilterProcessor {
public:
    VulkanFilterProcessor();
    ~VulkanFilterProcessor() override;

    // IFilterProcessor
    bool initialize() override;
    void shutdown() override;

    bool applyFilter(const FilterState& filter,
                     const void* inputData,
                     size_t inputSize,
                     void* outputData,
                     size_t outputSize) override;

    bool supportsFormat(const std::string& format) const override;
    bool supportsFilter(FilterType type) const override;

    std::string getName() const override;
    std::vector<FilterInfo> getSupportedFilters() const override;

private:
    // État Vulkan minimal
    bool vulkanAvailable_{false};
    bool initialized_{false};

    // Dimensions/format courant (informel, utile pour futurs pipelines)
    int currentWidth_{0};
    int currentHeight_{0};
    std::string currentFormat_{}; // "bgra"/"rgba"/"yuv420p"...

    // Copie CPU optimisée (fallback) pour BGRA
    static void copyBytesSIMD(const uint8_t* src, size_t size, uint8_t* dst);
};

// Fabrique dédiée invoquée par FilterFactory
std::shared_ptr<IFilterProcessor> CreateVulkanFilterProcessor();

} // namespace Camera


