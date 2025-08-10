/**
 * Constantes optimisées pour le système de filtres
 * Structure immuable pour éviter les re-rendus inutiles
 */

import type { AdvancedFilterParams } from '../../../../specs/NativeCameraFiltersModule';
import type { FilterPreset } from './types';
import type { FilterInfo } from './types';

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

// Configuration des animations pour les modals
export const ANIMATION_CONFIG = Object.freeze({
  modalAnimation: {
    tension: 65,
    friction: 8,
    useNativeDriver: true,
  },
  // Animation par défaut pour petites transitions (appuis sur boutons)
  filterTransition: {
    tension: 120,
    friction: 14,
    useNativeDriver: true,
  },
} as const);

// Catégories de filtres
export const FILTER_CATEGORIES = Object.freeze({
  basic: { label: 'Basique', icon: '⚡', color: '#3498DB' },
  professional: { label: 'Professionnel', icon: '🎯', color: '#E74C3C' },
  creative: { label: 'Créatif', icon: '✨', color: '#9B59B6' },
} as const);

// Presets de filtres prédéfinis (format tableau, plus simple à consommer)
export const FILTER_PRESETS: readonly FilterPreset[] = Object.freeze([
  {
    id: 'portrait',
    name: 'Portrait',
    filter: 'color_controls',
    intensity: 0.6,
    params: { brightness: 0.1, contrast: 1.1, saturation: 0.9, warmth: 0.2 },
  },
  {
    id: 'landscape',
    name: 'Paysage',
    filter: 'color_controls',
    intensity: 0.7,
    params: { saturation: 1.2, contrast: 1.15, shadows: 0.1, highlights: -0.1 },
  },
  {
    id: 'night',
    name: 'Nuit',
    filter: 'color_controls',
    intensity: 0.65,
    params: { exposure: 0.3, shadows: 0.2, contrast: 1.2, grain: 0.3 },
  },
]);


