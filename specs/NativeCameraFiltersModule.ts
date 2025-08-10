import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface FilterState {
  name: string;
  intensity: number; // 0..1
}

// Paramètres avancés de filtres (aligné avec l'UI AdvancedFilterControls)
export interface AdvancedFilterParams {
  brightness: number;    // -1.0 à 1.0
  contrast: number;      // 0.0 à 2.0
  saturation: number;    // 0.0 à 2.0
  hue: number;           // -180 à 180 (degrés)
  gamma: number;         // 0.1 à 3.0
  warmth: number;        // -1.0 à 1.0
  tint: number;          // -1.0 à 1.0
  exposure: number;      // -2.0 à 2.0 (EV)
  shadows: number;       // -1.0 à 1.0
  highlights: number;    // -1.0 à 1.0
  vignette: number;      // 0.0 à 1.0
  grain: number;         // 0.0 à 1.0
  // Option LUT (UI peut transmettre séparément via setFilter('lut3d:/abs/path', ...))
  // lutPath?: string;
}

export interface Spec extends TurboModule {
  readonly getAvailableFilters: () => string[];
  readonly setFilter: (name: string, intensity: number) => boolean;
  readonly getFilter: () => FilterState | null;
  readonly clearFilter: () => boolean;

  // Nouveau: applique un filtre avec paramètres avancés
  readonly setFilterWithParams: (
    name: string,
    intensity: number,
    params: AdvancedFilterParams
  ) => boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCameraFiltersModule');


