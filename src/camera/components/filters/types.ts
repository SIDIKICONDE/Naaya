/**
 * Types optimisés pour le système de filtres
 * Utilise des types stricts pour améliorer les performances TypeScript
 */

import type { StyleProp, ViewStyle } from 'react-native';
import type { AdvancedFilterParams, FilterState } from '../../../../specs/NativeCameraFiltersModule';

// Type union strict pour les noms de filtres
export type FilterName = 
  | 'none'
  | 'color_controls'
  | 'import'
  | 'sepia'
  | 'noir'
  | 'monochrome'
  | 'vintage'
  | 'cool'
  | 'warm';

// Type pour les catégories de filtres
export type FilterCategory = 'basic' | 'creative' | 'professional' | 'custom';

// Interface optimisée pour les informations de filtre
export interface FilterInfo {
  readonly name: FilterName;
  readonly displayName: string;
  readonly description: string;
  readonly icon: string;
  readonly category: FilterCategory;
  readonly hasIntensity: boolean;
  readonly defaultIntensity: number;
  readonly color: string;
  readonly previewGradient?: readonly [string, string]; // Pour un aperçu visuel
  readonly technicalInfo?: string; // Info technique pour l'utilisateur
}

// Interface pour l'état local optimisé
export interface OptimizedFilterState {
  selectedFilter: FilterName;
  intensity: number;
  advancedParams?: AdvancedFilterParams;
  isDirty: boolean; // Pour tracker les changements non sauvegardés
}

// Type pour les presets de filtres
export interface FilterPreset {
  readonly id: string;
  readonly name: string;
  readonly filter: FilterName;
  readonly intensity: number;
  readonly params?: AdvancedFilterParams;
  readonly thumbnail?: string;
}

// Props optimisées pour les composants
export interface FilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  onClose?: () => void;
  disabled?: boolean;
  compact?: boolean;
  /**
   * Style optionnel appliqué au conteneur racine (utilisé par ThreeDotsMenu)
   */
  style?: StyleProp<ViewStyle>;
}

// Type pour les callbacks mémorisés
export type FilterCallback = (filter: FilterInfo) => void;
export type IntensityCallback = (value: number) => void;

export type { AdvancedFilterParams, FilterState };


