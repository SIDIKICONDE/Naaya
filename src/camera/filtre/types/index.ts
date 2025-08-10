/**
 * Types optimisés pour le système de filtres
 * Utilise des types stricts pour éviter les re-rendus inutiles
 */

export interface FilterPreset {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly category: FilterCategory;
  readonly thumbnail?: string;
  readonly params: FilterParams;
  readonly metadata?: FilterMetadata;
}

export enum FilterCategory {
  NONE = 'none',
  COLOR = 'color',
  VINTAGE = 'vintage',
  ARTISTIC = 'artistic',
  CINEMATIC = 'cinematic',
  CUSTOM = 'custom',
  LUT = 'lut',
  XMP = 'xmp'
}

export interface FilterParams {
  // Paramètres de base (immutables pour éviter les mutations)
  readonly brightness: number;      // -1 à 1
  readonly contrast: number;        // 0 à 2
  readonly saturation: number;      // 0 à 2
  readonly hue: number;            // -180 à 180
  readonly temperature: number;     // -1 à 1
  readonly tint: number;           // -1 à 1
  
  // Paramètres avancés
  readonly exposure: number;       // -2 à 2
  readonly highlights: number;     // -1 à 1
  readonly shadows: number;        // -1 à 1
  readonly whites: number;         // -1 à 1
  readonly blacks: number;         // -1 à 1
  
  // Effets
  readonly vignette: number;       // 0 à 1
  readonly grain: number;          // 0 à 1
  readonly sharpen: number;        // 0 à 1
  readonly blur: number;           // 0 à 1
  
  // Courbes de couleur (RGB)
  readonly curves?: ColorCurves;
  
  // LUT ou XMP data
  readonly lutData?: string;
  readonly xmpData?: string;
}

export interface ColorCurves {
  readonly red: readonly CurvePoint[];
  readonly green: readonly CurvePoint[];
  readonly blue: readonly CurvePoint[];
  readonly rgb: readonly CurvePoint[];
}

export interface CurvePoint {
  readonly x: number;
  readonly y: number;
}

export interface FilterMetadata {
  readonly author?: string;
  readonly version?: string;
  readonly tags?: readonly string[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface FilterState {
  readonly activeFilter: string;
  readonly intensity: number;
  readonly params: FilterParams;
  readonly isProcessing: boolean;
  readonly isDirty: boolean;
}

export interface FilterHistoryEntry {
  readonly timestamp: number;
  readonly state: FilterState;
  readonly action: FilterAction;
}

export enum FilterAction {
  APPLY = 'apply',
  ADJUST = 'adjust',
  RESET = 'reset',
  LOAD_PRESET = 'load_preset',
  SAVE_PRESET = 'save_preset'
}

// Types pour les performances
export interface FilterPerformanceMetrics {
  readonly renderTime: number;
  readonly processingTime: number;
  readonly memoryUsage: number;
  readonly frameRate: number;
}

// Types pour les callbacks optimisés
export type FilterChangeCallback = (params: FilterParams) => void;
export type FilterPresetCallback = (preset: FilterPreset) => void;
export type FilterIntensityCallback = (intensity: number) => void;

// Type guards pour la validation
export const isValidFilterParams = (params: any): params is FilterParams => {
  return (
    typeof params === 'object' &&
    typeof params.brightness === 'number' &&
    typeof params.contrast === 'number' &&
    typeof params.saturation === 'number'
  );
};

// Constantes par défaut (immutables)
export const DEFAULT_FILTER_PARAMS: Readonly<FilterParams> = Object.freeze({
  brightness: 0,
  contrast: 1,
  saturation: 1,
  hue: 0,
  temperature: 0,
  tint: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vignette: 0,
  grain: 0,
  sharpen: 0,
  blur: 0,
  curves: undefined,
  lutData: undefined,
  xmpData: undefined
});

export const DEFAULT_FILTER_STATE: Readonly<FilterState> = Object.freeze({
  activeFilter: 'none',
  intensity: 1.0,
  params: DEFAULT_FILTER_PARAMS,
  isProcessing: false,
  isDirty: false
});