#pragma once

// Détection de l'environnement JSI/TurboModule et NaayaJSI
#ifdef __cplusplus
  #if __has_include(<NaayaJSI.h>) && \
      __has_include(<jsi/jsi.h>) && \
      __has_include(<ReactCommon/TurboModule.h>) && \
      __has_include(<ReactCommon/TurboModuleUtils.h>)
    #define NAAYA_CAMERA_FILTERS_ENABLED 1
  #else
    #define NAAYA_CAMERA_FILTERS_ENABLED 0
  #endif
#endif // __cplusplus

#if defined(__cplusplus) && NAAYA_CAMERA_FILTERS_ENABLED
  #include <NaayaJSI.h>
  #include <jsi/jsi.h>
  #include <ReactCommon/TurboModule.h>
  #include <ReactCommon/TurboModuleUtils.h>
  #include <memory>
  #include <string>
  #include <vector>
  #include <mutex>
  #include <optional>
  #include "Camera/filters/FilterManager.hpp"

  // Définir FFMPEG_AVAILABLE pour iOS maintenant
  #ifdef __APPLE__
    #include <TargetConditionals.h>
    #if TARGET_OS_IOS
      #define FFMPEG_AVAILABLE 1
    #endif
  #endif
  
  #ifdef __ANDROID__
    #define FFMPEG_AVAILABLE 1
  #endif

  #ifndef JSI_EXPORT
    #define JSI_EXPORT
  #endif

  namespace facebook { namespace react {

  class JSI_EXPORT NativeCameraFiltersModule : public NativeCameraFiltersModuleCxxSpec<NativeCameraFiltersModule> {
  public:
    explicit NativeCameraFiltersModule(std::shared_ptr<CallInvoker> jsInvoker);
    ~NativeCameraFiltersModule() override;

    static constexpr auto kModuleName = "NativeCameraFiltersModule";

    // JSI methods
    jsi::Array getAvailableFilters(jsi::Runtime& rt);
    bool setFilter(jsi::Runtime& rt, jsi::String name, double intensity);
    bool setFilterWithParams(jsi::Runtime& rt, jsi::String name, double intensity, jsi::Object params);
    std::optional<jsi::Object> getFilter(jsi::Runtime& rt);
    bool clearFilter(jsi::Runtime& rt);

    // Internal cross-platform state
    struct FilterState { std::string name; double intensity; };

  private:
    std::mutex mutex_;
    bool hasFilter_{false};
    FilterState state_{};
    std::unique_ptr<Camera::FilterManager> filterManager_;
    // Paramètres avancés courants
    Camera::FilterParams advancedParams_{};
    // Dernier chemin LUT demandé (pour iOS/CoreImage)
    std::string lastLUTPath_{};
  };

  } } // namespace facebook::react

#else // !(__cplusplus && NAAYA_CAMERA_FILTERS_ENABLED)
  // Stub minimal pour le lint/build sans JSI (uniquement en C++)
  #ifdef __cplusplus
    namespace facebook { namespace react { class NativeCameraFiltersModule; } }
  #endif
#endif // NAAYA_CAMERA_FILTERS_ENABLED

// API C minimale pour exposer l'état de filtre au code ObjC/AVFoundation
#ifndef __cplusplus
  #include <stdbool.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

bool NaayaFilters_HasFilter();
const char* NaayaFilters_GetCurrentName();
double NaayaFilters_GetCurrentIntensity();

// Structure C des paramètres avancés
typedef struct {
  double brightness;    
  double contrast;      
  double saturation;    
  double hue;           
  double gamma;         
  double warmth;        
  double tint;          
  double exposure;      
  double shadows;       
  double highlights;    
  double vignette;      
  double grain;         
} NaayaAdvancedFilterParams;

// Remplit outParams avec la dernière valeur des paramètres avancés. Retourne true si dispo.
bool NaayaFilters_GetAdvancedParams(NaayaAdvancedFilterParams* outParams);

#ifdef __cplusplus
}
#endif

