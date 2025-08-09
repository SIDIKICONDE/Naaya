/**
 * Constantes et presets pour les contrôles avancés de filtres
 */

import { DEFAULT_FILTER_PARAMS } from '../constants';
import type { FilterPreset } from './types';

export { DEFAULT_FILTER_PARAMS };

export const SLIDER_WIDTH = 280;

export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'Reset',
    icon: '🔄',
    params: DEFAULT_FILTER_PARAMS,
  },
  {
    name: 'Vivid',
    icon: '🌈',
    params: {
      ...DEFAULT_FILTER_PARAMS,
      contrast: 1.2,
      saturation: 1.3,
      exposure: 0.1,
    },
  },
  {
    name: 'Film',
    icon: '🎞️',
    params: {
      ...DEFAULT_FILTER_PARAMS,
      contrast: 0.9,
      saturation: 0.8,
      warmth: 0.2,
      grain: 0.1,
    },
  },
  {
    name: 'Portrait',
    icon: '👤',
    params: {
      ...DEFAULT_FILTER_PARAMS,
      exposure: 0.1,
      shadows: 0.2,
      highlights: -0.1,
      warmth: 0.1,
    },
  },
  {
    name: 'Dramatic',
    icon: '⚡',
    params: {
      ...DEFAULT_FILTER_PARAMS,
      contrast: 1.4,
      shadows: -0.3,
      highlights: -0.2,
      vignette: 0.3,
    },
  },
];

export const DEFAULT_EXPANDED_SECTIONS = {
  exposure: true,
  color: true,
  effects: false,
};
