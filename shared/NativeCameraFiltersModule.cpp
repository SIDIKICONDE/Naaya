#include "NativeCameraFiltersModule.h"
#include <mutex>
#include <string>
#ifdef __cplusplus
#if __has_include(<NaayaJSI.h>)
#include "Camera/filters/FilterManager.hpp"
#include "Camera/filters/FilterFactory.hpp"
#include <iostream>

// État global filtres accessible depuis ObjC/ObjC++
static std::mutex g_naaya_filters_mutex;
static bool g_naaya_filters_hasFilter = false;
static std::string g_naaya_filters_name;
static double g_naaya_filters_intensity = 1.0;

namespace facebook::react {

NativeCameraFiltersModule::NativeCameraFiltersModule(std::shared_ptr<CallInvoker> jsInvoker)
  : NativeCameraFiltersModuleCxxSpec<NativeCameraFiltersModule>(jsInvoker) {
  // Initialiser le gestionnaire de filtres
  filterManager_ = std::make_unique<Camera::FilterManager>();
  filterManager_->initialize();
  
  // Enregistrer le processeur FFmpeg par défaut
  auto processor = Camera::FilterFactory::createProcessor(Camera::FilterFactory::ProcessorType::FFMPEG);
  filterManager_->registerProcessor(processor);
}

NativeCameraFiltersModule::~NativeCameraFiltersModule() = default;

jsi::Array NativeCameraFiltersModule::getAvailableFilters(jsi::Runtime& rt) {
  if (!filterManager_) {
    jsi::Array arr(rt, 0);
    return arr;
  }
  
  auto filters = filterManager_->getAvailableFilters();
  jsi::Array arr(rt, filters.size());
  
  for (size_t i = 0; i < filters.size(); ++i) {
    arr.setValueAtIndex(rt, i, jsi::String::createFromUtf8(rt, filters[i].name));
  }
  
  return arr;
}

bool NativeCameraFiltersModule::setFilter(jsi::Runtime& rt, jsi::String name, double intensity) {
  (void)rt;
  std::lock_guard<std::mutex> lock(mutex_);
  state_.name = name.utf8(rt);
  state_.intensity = intensity;
  hasFilter_ = state_.name != "none";
  std::cout << "[Filters] setFilter name=" << state_.name << " intensity=" << state_.intensity << std::endl;

  // Propager à l'API C globale (accès ObjC)
  {
    std::lock_guard<std::mutex> g(g_naaya_filters_mutex);
    g_naaya_filters_hasFilter = hasFilter_;
    g_naaya_filters_name = state_.name;
    g_naaya_filters_intensity = state_.intensity;
  }
  return true;
}

std::optional<jsi::Object> NativeCameraFiltersModule::getFilter(jsi::Runtime& rt) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (!hasFilter_) return std::nullopt;
  jsi::Object obj(rt);
  obj.setProperty(rt, "name", jsi::String::createFromUtf8(rt, state_.name));
  obj.setProperty(rt, "intensity", jsi::Value(state_.intensity));
  return obj;
}

bool NativeCameraFiltersModule::clearFilter(jsi::Runtime& rt) {
  (void)rt;
  std::lock_guard<std::mutex> lock(mutex_);
  hasFilter_ = false;
  state_ = {};
  {
    std::lock_guard<std::mutex> g(g_naaya_filters_mutex);
    g_naaya_filters_hasFilter = false;
    g_naaya_filters_name.clear();
    g_naaya_filters_intensity = 1.0;
  }
  return true;
}

} // namespace facebook::react


#endif // __has_include(<NaayaJSI.h>)
#endif // __cplusplus

// Implémentation de l'API C minimale pour l'accès Objective-C (toujours dispo)
extern "C" bool NaayaFilters_HasFilter();
extern "C" const char* NaayaFilters_GetCurrentName();
extern "C" double NaayaFilters_GetCurrentIntensity();

extern "C" bool NaayaFilters_HasFilter() {
  std::lock_guard<std::mutex> lock(g_naaya_filters_mutex);
  return g_naaya_filters_hasFilter;
}

extern "C" const char* NaayaFilters_GetCurrentName() {
  std::lock_guard<std::mutex> lock(g_naaya_filters_mutex);
  return g_naaya_filters_name.c_str();
}

extern "C" double NaayaFilters_GetCurrentIntensity() {
  std::lock_guard<std::mutex> lock(g_naaya_filters_mutex);
  return g_naaya_filters_intensity;
}
