#include "NativeCameraFiltersModule.h"
#include <mutex>
#include <string>

// État global filtres accessible depuis ObjC/ObjC++ (toujours défini pour le lint)
static std::mutex g_naaya_filters_mutex;
static bool g_naaya_filters_hasFilter = false;
static std::string g_naaya_filters_name;
static double g_naaya_filters_intensity = 1.0;
static NaayaAdvancedFilterParams g_naaya_filters_advanced_params = {
  0.0, // brightness
  1.0, // contrast
  1.0, // saturation
  0.0, // hue
  1.0, // gamma
  0.0, // warmth
  0.0, // tint
  0.0, // exposure
  0.0, // shadows
  0.0, // highlights
  0.0, // vignette
  0.0  // grain
};
#ifdef __cplusplus
#if __has_include(<NaayaJSI.h>)
#include "Camera/filters/FilterManager.hpp"
#include "Camera/filters/FilterFactory.hpp"
#include "Camera/filters/FFmpegFilterProcessor.hpp"
#include <iostream>

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
  // Conserver la query dans state_.name pour FFmpeg, mais normaliser pour la logique iOS de type
  state_.intensity = intensity;
  hasFilter_ = state_.name != "none";
  std::cout << "[Filters] setFilter name=" << state_.name << " intensity=" << state_.intensity << std::endl;

  // Propager à l'API C globale (accès ObjC)
  {
    std::lock_guard<std::mutex> g(g_naaya_filters_mutex);
    g_naaya_filters_hasFilter = hasFilter_;
    g_naaya_filters_name = state_.name;
    g_naaya_filters_intensity = state_.intensity;
    // Conserver les paramètres avancés actuels inchangés ici
  }
  // Mémoriser un éventuel LUT path pour iOS
  if (state_.name.rfind("lut3d:", 0) == 0) {
    lastLUTPath_ = state_.name.substr(6);
  } else {
    lastLUTPath_.clear();
  }
  return true;
}

bool NativeCameraFiltersModule::setFilterWithParams(jsi::Runtime& rt, jsi::String name, double intensity, jsi::Object params) {
  std::lock_guard<std::mutex> lock(mutex_);
  state_.name = name.utf8(rt);
  state_.intensity = intensity;
  hasFilter_ = state_.name != "none";

  // Convertir params JSI -> Camera::FilterParams et NaayaAdvancedFilterParams
  auto getNumber = [&](const char* key, double fallback) -> double {
    if (!params.hasProperty(rt, key)) return fallback;
    auto v = params.getProperty(rt, key);
    if (v.isNumber()) return v.getNumber();
    return fallback;
  };

  advancedParams_.intensity = intensity;
  advancedParams_.brightness = getNumber("brightness", 0.0);
  advancedParams_.contrast = getNumber("contrast", 1.0);
  advancedParams_.saturation = getNumber("saturation", 1.0);
  advancedParams_.hue = getNumber("hue", 0.0);
  advancedParams_.gamma = getNumber("gamma", 1.0);
  // Champs additionnels non présents dans FilterParams de base
  // warmth/tint/exposure/shadows/highlights/vignette/grain conservés en global C

  std::lock_guard<std::mutex> g(g_naaya_filters_mutex);
  g_naaya_filters_hasFilter = hasFilter_;
  g_naaya_filters_name = state_.name;
  g_naaya_filters_intensity = state_.intensity;
  g_naaya_filters_advanced_params.brightness = getNumber("brightness", 0.0);
  g_naaya_filters_advanced_params.contrast = getNumber("contrast", 1.0);
  g_naaya_filters_advanced_params.saturation = getNumber("saturation", 1.0);
  g_naaya_filters_advanced_params.hue = getNumber("hue", 0.0);
  g_naaya_filters_advanced_params.gamma = getNumber("gamma", 1.0);
  g_naaya_filters_advanced_params.warmth = getNumber("warmth", 0.0);
  g_naaya_filters_advanced_params.tint = getNumber("tint", 0.0);
  g_naaya_filters_advanced_params.exposure = getNumber("exposure", 0.0);
  g_naaya_filters_advanced_params.shadows = getNumber("shadows", 0.0);
  g_naaya_filters_advanced_params.highlights = getNumber("highlights", 0.0);
  g_naaya_filters_advanced_params.vignette = getNumber("vignette", 0.0);
  g_naaya_filters_advanced_params.grain = getNumber("grain", 0.0);

  // Mémoriser LUT si demandé
  if (state_.name.rfind("lut3d:", 0) == 0) {
    // Retirer la query éventuelle pour le chemin LUT côté iOS
    std::string rest = state_.name.substr(6);
    auto qpos2 = rest.find('?');
    if (qpos2 != std::string::npos) rest = rest.substr(0, qpos2);
    lastLUTPath_ = rest;
  } else {
    lastLUTPath_.clear();
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
extern "C" bool NaayaFilters_GetAdvancedParams(NaayaAdvancedFilterParams* outParams);

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

extern "C" bool NaayaFilters_GetAdvancedParams(NaayaAdvancedFilterParams* outParams) {
  if (!outParams) return false;
  std::lock_guard<std::mutex> lock(g_naaya_filters_mutex);
  *outParams = g_naaya_filters_advanced_params;
  return true;
}

// === API de traitement FFmpeg pour iOS ===
// Traite un buffer BGRA via FFmpeg si disponible
extern "C" bool NaayaFilters_ProcessBGRA(const uint8_t* inData,
                                         int inStride,
                                         int width,
                                         int height,
                                         double fps,
                                         uint8_t* outData,
                                         int outStride);

extern "C" bool NaayaFilters_ProcessBGRA(const uint8_t* inData,
                                         int inStride,
                                         int width,
                                         int height,
                                         double fps,
                                         uint8_t* outData,
                                         int outStride) {
#ifndef FFMPEG_AVAILABLE
  // FFmpeg non disponible sur cette plateforme
  (void)inData; (void)inStride; (void)width; (void)height;
  (void)fps; (void)outData; (void)outStride;
  return false;
#else
  // Implémentation FFmpeg
  if (!inData || !outData || width <= 0 || height <= 0) {
    return false;
  }
  
  if (!NaayaFilters_HasFilter()) {
    return false;
  }
  
  static std::mutex sMutex;
  static std::unique_ptr<Camera::FFmpegFilterProcessor> sProcessor;
  static int sLastW = 0, sLastH = 0;
  
  std::lock_guard<std::mutex> lock(sMutex);
  
  if (!sProcessor) {
    sProcessor = std::make_unique<Camera::FFmpegFilterProcessor>();
    if (!sProcessor->initialize()) {
      sProcessor.reset();
      return false;
    }
  }
  
  // Configurer le format si changé
  if (width != sLastW || height != sLastH) {
    sProcessor->setVideoFormat(width, height, "bgra");
    sLastW = width;
    sLastH = height;
  }
  // Propager fps au processeur
  if (fps > 0) {
    sProcessor->setFrameRate((int)fps);
  }
  
  // Construire l'état du filtre
  const char* name = NaayaFilters_GetCurrentName();
  std::string filterName = name ? name : "";
  // Normaliser: retirer une éventuelle query (ex: ?interp=)
  auto qpos = filterName.find('?');
  if (qpos != std::string::npos) {
    filterName = filterName.substr(0, qpos);
  }
  
  Camera::FilterState state;
  state.isActive = true;
  state.params.intensity = NaayaFilters_GetCurrentIntensity();
  
  // Récupérer les paramètres avancés
  NaayaAdvancedFilterParams adv{};
  if (NaayaFilters_GetAdvancedParams(&adv)) {
    state.params.brightness = adv.brightness;
    state.params.contrast = adv.contrast;
    state.params.saturation = adv.saturation;
    state.params.hue = adv.hue;
    state.params.gamma = adv.gamma;
  }
  
  // Mapper le nom vers le type
  if (filterName == "sepia") {
    state.type = Camera::FilterType::SEPIA;
  } else if (filterName == "noir") {
    state.type = Camera::FilterType::NOIR;
  } else if (filterName == "monochrome") {
    state.type = Camera::FilterType::MONOCHROME;
  } else if (filterName == "color_controls") {
    state.type = Camera::FilterType::COLOR_CONTROLS;
  } else if (filterName == "vintage") {
    state.type = Camera::FilterType::VINTAGE;
  } else if (filterName == "cool") {
    state.type = Camera::FilterType::COOL;
  } else if (filterName == "warm") {
    state.type = Camera::FilterType::WARM;
  } else if (filterName.find("lut3d:") == 0) {
    state.type = Camera::FilterType::CUSTOM;
    state.params.customFilterName = filterName;
  } else {
    return false;
  }
  
  // Application sans copies intermédiaires (strides)
  bool ok = sProcessor->applyFilterWithStride(state,
                                              inData,
                                              inStride,
                                              width,
                                              height,
                                              "bgra",
                                              outData,
                                              outStride);
  return ok;
#endif
}
