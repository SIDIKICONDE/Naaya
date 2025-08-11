/**
 * Export centralisé des composants de filtres optimisés
 */

// Composants principaux
export { AdvancedAdjustmentsModal } from './AdvancedAdjustmentsModal';
export { AdvancedFilterModal } from './AdvancedFilterModal';
export { default as CompactFilterControls } from './CompactFilterControls';
export { FilterControls } from './FilterControls';
export { default as NumberLineControl } from './slider';

// Types
export type {
  AdvancedFilterParams, FilterCallback, FilterCategory, FilterControlsProps, FilterInfo, FilterName, FilterPreset, FilterState, IntensityCallback, OptimizedFilterState
} from './types';

// Constantes et configuration
export {
  ANIMATION_CONFIG, AVAILABLE_FILTERS,
  DEFAULT_FILTER_PARAMS, FILTER_CATEGORIES, FILTER_PRESETS
} from './constants';

// Utilitaires (si nécessaire)
export * from './utils/xmp';

// Export par défaut du composant principal
export { FilterControls as default } from './FilterControls';


