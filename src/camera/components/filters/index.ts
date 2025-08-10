/**
 * Export centralisé des composants de filtres optimisés
 */

// Composants principaux
export { FilterControls } from './FilterControls';
export { AdvancedFilterModal } from './AdvancedFilterModal';
export { default as CompactFilterControls } from './CompactFilterControls';

// Types
export type {
  FilterInfo,
  FilterControlsProps,
  FilterPreset,
  FilterName,
  FilterCategory,
  OptimizedFilterState,
  FilterCallback,
  IntensityCallback,
  AdvancedFilterParams,
  FilterState,
} from './types';

// Constantes et configuration
export {
  AVAILABLE_FILTERS,
  DEFAULT_FILTER_PARAMS,
  FILTER_PRESETS,
  FILTER_CATEGORIES,
  ANIMATION_CONFIG,
} from './constants';

// Utilitaires (si nécessaire)
export * from './utils/xmp';

// Export par défaut du composant principal
export { FilterControls as default } from './FilterControls';

