/**
 * Constantes partagées pour les filtres
 */

import type { AdvancedFilterParams } from '../../../../specs/NativeCameraFiltersModule';
import type { CompactFilterInfo, FilterInfo } from './types';

export const AVAILABLE_FILTERS: FilterInfo[] = [
  { name: 'none', displayName: 'Aucun', description: 'Aucun filtre', icon: '🔘', hasIntensity: false, defaultIntensity: 0, color: '#666666' },
  // Mettre "Couleur" en premier plan pour exposer rapidement les options avancées
  { name: 'color_controls', displayName: 'Couleur', description: 'Réglages avancés couleur', icon: '🎚️', hasIntensity: true, defaultIntensity: 0.5, color: '#007AFF' },
  { name: 'sepia', displayName: 'Sépia', description: 'Effet vintage sépia', icon: '🟤', hasIntensity: true, defaultIntensity: 0.8, color: '#8B4513' },
  { name: 'noir', displayName: 'N&B', description: 'Noir et blanc', icon: '⚫', hasIntensity: true, defaultIntensity: 1.0, color: '#404040' },
  { name: 'monochrome', displayName: 'Mono', description: 'Monochrome avec teinte', icon: '🔵', hasIntensity: true, defaultIntensity: 0.7, color: '#4169E1' },
  { name: 'vintage', displayName: 'Vintage', description: 'Effet années 70', icon: '📼', hasIntensity: true, defaultIntensity: 0.6, color: '#CD853F' },
  { name: 'cool', displayName: 'Cool', description: 'Effet froid bleuté', icon: '❄️', hasIntensity: true, defaultIntensity: 0.5, color: '#4682B4' },
  { name: 'warm', displayName: 'Warm', description: 'Effet chaud orangé', icon: '🔥', hasIntensity: true, defaultIntensity: 0.5, color: '#FF6347' },
];

export const COMPACT_FILTERS: CompactFilterInfo[] = [
  { name: 'none', displayName: 'Off', icon: '🔘', color: '#666666' },
  { name: 'color_controls', displayName: 'Couleur', icon: '🎚️', color: '#007AFF' },
  { name: 'sepia', displayName: 'Sépia', icon: '🟤', color: '#8B4513' },
  { name: 'noir', displayName: 'N&B', icon: '⚫', color: '#404040' },
  { name: 'vintage', displayName: 'Vintage', icon: '📼', color: '#CD853F' },
  { name: 'cool', displayName: 'Cool', icon: '❄️', color: '#4682B4' },
  { name: 'warm', displayName: 'Warm', icon: '🔥', color: '#FF6347' },
];

export const DEFAULT_FILTER_PARAMS: AdvancedFilterParams = {
  brightness: 0.0,
  contrast: 1.0,
  saturation: 1.0,
  hue: 0.0,
  gamma: 1.0,
  warmth: 0.0,
  tint: 0.0,
  exposure: 0.0,
  shadows: 0.0,
  highlights: 0.0,
  vignette: 0.0,
  grain: 0.0,
};


