/**
 * Constantes pour l'égaliseur audio
 */

import { EqualizerBand, EqualizerPreset } from '../types';

// Bandes de fréquence standard (10 bandes)
export const DEFAULT_FREQUENCY_BANDS: EqualizerBand[] = [
  { index: 0, frequency: 32, gain: 0, label: '32 Hz' },
  { index: 1, frequency: 64, gain: 0, label: '64 Hz' },
  { index: 2, frequency: 125, gain: 0, label: '125 Hz' },
  { index: 3, frequency: 250, gain: 0, label: '250 Hz' },
  { index: 4, frequency: 500, gain: 0, label: '500 Hz' },
  { index: 5, frequency: 1000, gain: 0, label: '1 kHz' },
  { index: 6, frequency: 2000, gain: 0, label: '2 kHz' },
  { index: 7, frequency: 4000, gain: 0, label: '4 kHz' },
  { index: 8, frequency: 8000, gain: 0, label: '8 kHz' },
  { index: 9, frequency: 16000, gain: 0, label: '16 kHz' },
];

// Préréglages populaires
export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  {
    id: 'custom',
    name: 'Personnalisé',
    icon: '🎛️',
    description: 'Réglages personnalisés',
    bands: {
      'band-32': 0,
      'band-64': 0,
      'band-125': 0,
      'band-250': 0,
      'band-500': 0,
      'band-1k': 0,
      'band-2k': 0,
      'band-4k': 0,
      'band-8k': 0,
      'band-16k': 0,
    },
  },
  {
    id: 'flat',
    name: 'Flat',
    icon: '⚪',
    description: 'Son neutre sans modification',
    bands: {
      'band-32': 0,
      'band-64': 0,
      'band-125': 0,
      'band-250': 0,
      'band-500': 0,
      'band-1k': 0,
      'band-2k': 0,
      'band-4k': 0,
      'band-8k': 0,
      'band-16k': 0,
    },
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    icon: '🔊',
    description: 'Amplifie les basses fréquences',
    bands: {
      'band-32': 8,
      'band-64': 7,
      'band-125': 5,
      'band-250': 3,
      'band-500': 1,
      'band-1k': 0,
      'band-2k': 0,
      'band-4k': 0,
      'band-8k': 0,
      'band-16k': 0,
    },
  },
  {
    id: 'vocal',
    name: 'Vocal',
    icon: '🎤',
    description: 'Optimisé pour les voix',
    bands: {
      'band-32': -2,
      'band-64': -1,
      'band-125': 0,
      'band-250': 2,
      'band-500': 4,
      'band-1k': 5,
      'band-2k': 4,
      'band-4k': 3,
      'band-8k': 2,
      'band-16k': 0,
    },
  },
  {
    id: 'rock',
    name: 'Rock',
    icon: '🎸',
    description: 'Son puissant pour le rock',
    bands: {
      'band-32': 5,
      'band-64': 4,
      'band-125': 3,
      'band-250': 1,
      'band-500': -1,
      'band-1k': -1,
      'band-2k': 1,
      'band-4k': 3,
      'band-8k': 4,
      'band-16k': 5,
    },
  },
  {
    id: 'electronic',
    name: 'Electronic',
    icon: '🎹',
    description: 'Optimisé pour la musique électronique',
    bands: {
      'band-32': 6,
      'band-64': 5,
      'band-125': 3,
      'band-250': 0,
      'band-500': -2,
      'band-1k': 2,
      'band-2k': 1,
      'band-4k': 1,
      'band-8k': 3,
      'band-16k': 4,
    },
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    icon: '🎻',
    description: 'Son naturel et chaleureux',
    bands: {
      'band-32': 2,
      'band-64': 2,
      'band-125': 1,
      'band-250': 0,
      'band-500': 1,
      'band-1k': 2,
      'band-2k': 3,
      'band-4k': 3,
      'band-8k': 2,
      'band-16k': 1,
    },
  },
];

// Configuration de l'analyseur audio
export const DEFAULT_ANALYZER_CONFIG = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
};

// Configuration des animations
export const DEFAULT_ANIMATION_CONFIG = {
  duration: 300,
  easing: 'ease-in-out' as const,
  springConfig: {
    stiffness: 100,
    damping: 15,
    mass: 1,
  },
};

// Couleurs du thème
export const THEME_COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  gradient: {
    start: '#007AFF',
    end: '#5856D6',
  },
};