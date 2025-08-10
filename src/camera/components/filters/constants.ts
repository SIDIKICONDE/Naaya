/**
 * Constantes optimisées pour le système de filtres
 * Structure immuable pour éviter les re-rendus inutiles
 */

import type { AdvancedFilterParams } from '../../../../specs/NativeCameraFiltersModule';
import type { FilterInfo, FilterPreset } from './types';

// Filtres disponibles avec catégorisation et informations techniques
export const AVAILABLE_FILTERS: readonly FilterInfo[] = Object.freeze([
  {
    name: 'none',
    displayName: 'Original',
    description: 'Image sans modification',
    icon: '✨',
    category: 'basic',
    hasIntensity: false,
    defaultIntensity: 0,
    color: '#808080',
    previewGradient: ['#ffffff', '#f0f0f0'],
    technicalInfo: 'Bypass du pipeline de filtrage'
  },
  {
    name: 'color_controls',
    displayName: 'Pro Color',
    description: 'Contrôle professionnel des couleurs',
    icon: '🎨',
    category: 'professional',
    hasIntensity: true,
    defaultIntensity: 0.5,
    color: '#007AFF',
    previewGradient: ['#007AFF', '#00C9FF'],
    technicalInfo: 'HSL + Courbes + Teinte/Saturation'
  },
  {
    name: 'xmp',
    displayName: 'Lightroom',
    description: 'Import de presets Adobe Lightroom',
    icon: '📸',
    category: 'professional',
    hasIntensity: true,
    defaultIntensity: 1.0,
    color: '#31A8FF',
    previewGradient: ['#31A8FF', '#7CC5FF'],
    technicalInfo: 'Compatible XMP/DNG Process Version 5'
  },
  {
    name: 'lut3d',
    displayName: 'LUT 3D',
    description: 'Tables de correspondance couleur 3D',
    icon: '🎬',
    category: 'professional',
    hasIntensity: true,
    defaultIntensity: 1.0,
    color: '#9B59B6',
    previewGradient: ['#9B59B6', '#C39BD3'],
    technicalInfo: 'Format .cube (17x17x17 à 65x65x65)'
  },
  {
    name: 'sepia',
    displayName: 'Sépia',
    description: 'Effet vintage chaleureux',
    icon: '🏛️',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 0.8,
    color: '#8B6914',
    previewGradient: ['#8B6914', '#D4A76A'],
    technicalInfo: 'Matrice de transformation RGB'
  },
  {
    name: 'noir',
    displayName: 'Noir & Blanc',
    description: 'Conversion monochrome optimisée',
    icon: '🎭',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 1.0,
    color: '#2C3E50',
    previewGradient: ['#000000', '#FFFFFF'],
    technicalInfo: 'Luminance pondérée (ITU-R BT.709)'
  },
  {
    name: 'monochrome',
    displayName: 'Monochrome',
    description: 'Teinte unique personnalisable',
    icon: '💎',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 0.7,
    color: '#3498DB',
    previewGradient: ['#3498DB', '#85C1E9'],
    technicalInfo: 'Désaturation + Colorisation HSL'
  },
  {
    name: 'vintage',
    displayName: 'Rétro 70s',
    description: 'Ambiance cinématographique vintage',
    icon: '📽️',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 0.6,
    color: '#E67E22',
    previewGradient: ['#E67E22', '#F0B27A'],
    technicalInfo: 'Courbes S + Grain + Vignettage'
  },
  {
    name: 'cool',
    displayName: 'Glacial',
    description: 'Tonalités froides et bleutées',
    icon: '❄️',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 0.5,
    color: '#5DADE2',
    previewGradient: ['#5DADE2', '#AED6F1'],
    technicalInfo: 'Balance -6500K + Teinte cyan'
  },
  {
    name: 'warm',
    displayName: 'Chaleureux',
    description: 'Tonalités chaudes et dorées',
    icon: '🌅',
    category: 'creative',
    hasIntensity: true,
    defaultIntensity: 0.5,
    color: '#FF6B35',
    previewGradient: ['#FF6B35', '#FFB088'],
    technicalInfo: 'Balance +6500K + Teinte ambre'
  }
] as const);

// Paramètres par défaut optimisés
export const DEFAULT_FILTER_PARAMS: Readonly<AdvancedFilterParams> = Object.freeze({
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
});

// Presets prédéfinis pour démarrage rapide
export const FILTER_PRESETS: readonly FilterPreset[] = Object.freeze([
  {
    id: 'preset_cinematic',
    name: 'Cinématique',
    filter: 'color_controls',
    intensity: 0.8,
    params: {
      ...DEFAULT_FILTER_PARAMS,
      contrast: 1.2,
      saturation: 0.9,
      shadows: -0.1,
      highlights: 0.1,
      vignette: 0.3,
    }
  },
  {
    id: 'preset_portrait',
    name: 'Portrait',
    filter: 'warm',
    intensity: 0.3,
    params: {
      ...DEFAULT_FILTER_PARAMS,
      brightness: 0.05,
      contrast: 0.95,
      saturation: 1.1,
    }
  },
  {
    id: 'preset_landscape',
    name: 'Paysage',
    filter: 'color_controls',
    intensity: 0.6,
    params: {
      ...DEFAULT_FILTER_PARAMS,
      contrast: 1.1,
      saturation: 1.2,
      exposure: 0.1,
      highlights: -0.2,
    }
  }
] as const);

// Catégories de filtres pour l'UI
export const FILTER_CATEGORIES = Object.freeze({
  basic: { label: 'Basique', icon: '⚡', color: '#808080' },
  creative: { label: 'Créatif', icon: '🎨', color: '#E74C3C' },
  professional: { label: 'Pro', icon: '💼', color: '#3498DB' },
  custom: { label: 'Personnalisé', icon: '⚙️', color: '#9B59B6' }
} as const);

// Configuration des animations
export const ANIMATION_CONFIG = Object.freeze({
  filterTransition: {
    duration: 200,
    useNativeDriver: true,
  },
  sliderResponse: {
    duration: 16, // 60fps
    useNativeDriver: false,
  },
  modalAnimation: {
    duration: 300,
    useNativeDriver: true,
  }
} as const);


