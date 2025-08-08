#pragma once

#ifdef __cplusplus
#if __has_include(<NaayaJSI.h>)
#include <NaayaJSI.h>
#include <jsi/jsi.h>
#include <ReactCommon/TurboModule.h>
#include <ReactCommon/TurboModuleUtils.h>
#include <memory>
#include <string>
#include <vector>
#include <mutex>
#include <optional>

// Assure la disponibilité de la déclaration de Camera::FilterManager
#include "Camera/filters/FilterManager.hpp"
#endif
#endif

// Note: l'inclusion ci-dessus rend la forward-declaration non nécessaire

namespace facebook::react {
#if __has_include(<NaayaJSI.h>) && defined(__cplusplus)

class JSI_EXPORT NativeCameraFiltersModule : public NativeCameraFiltersModuleCxxSpec<NativeCameraFiltersModule> {
public:
  explicit NativeCameraFiltersModule(std::shared_ptr<CallInvoker> jsInvoker);
  ~NativeCameraFiltersModule() override;

  static constexpr auto kModuleName = "NativeCameraFiltersModule";

  // JSI methods
  jsi::Array getAvailableFilters(jsi::Runtime& rt);
  bool setFilter(jsi::Runtime& rt, jsi::String name, double intensity);
  std::optional<jsi::Object> getFilter(jsi::Runtime& rt);
  bool clearFilter(jsi::Runtime& rt);

  // Internal cross-platform state
  struct FilterState { std::string name; double intensity; };

private:
  std::mutex mutex_;
  bool hasFilter_{false};
  FilterState state_{};
  std::unique_ptr<Camera::FilterManager> filterManager_;
};

#endif
} // namespace facebook::react


// API C minimale pour exposer l'état de filtre au code ObjC/AVFoundation
#ifdef __cplusplus
extern "C" {
#endif

// Retourne vrai si un filtre est actif côté runtime
bool NaayaFilters_HasFilter();
// Retourne le nom courant du filtre (ex: "sepia", "noir", "monochrome", "color_controls").
// Pointeur valide jusqu'à la prochaine mutation d'état.
const char* NaayaFilters_GetCurrentName();
// Retourne l'intensité actuelle du filtre (0.0 - 1.0)
double NaayaFilters_GetCurrentIntensity();

#ifdef __cplusplus
}
#endif

#ifndef __cplusplus
#include <stdbool.h>
#endif

