/**
 * Constantes pour l'égaliseur professionnel
 */

import { EqualiserBand, EqualiserPreset, EqualiserTheme } from '../../EQUALISER/types';

// (Supprimé) Configuration 31 bandes — le produit est désormais limité à 10 bandes

// Configuration simplifiée (10 bandes)
export const SIMPLE_FREQUENCY_BANDS: Omit<EqualiserBand, 'gain'>[] = [
  { id: 'band-32', index: 0, frequency: 32, q: 0.7, type: 'lowshelf', label: '32Hz' },
  { id: 'band-64', index: 1, frequency: 64, q: 0.7, type: 'peaking', label: '64Hz' },
  { id: 'band-125', index: 2, frequency: 125, q: 0.7, type: 'peaking', label: '125Hz' },
  { id: 'band-250', index: 3, frequency: 250, q: 0.7, type: 'peaking', label: '250Hz' },
  { id: 'band-500', index: 4, frequency: 500, q: 0.7, type: 'peaking', label: '500Hz' },
  { id: 'band-1k', index: 5, frequency: 1000, q: 0.7, type: 'peaking', label: '1kHz' },
  { id: 'band-2k', index: 6, frequency: 2000, q: 0.7, type: 'peaking', label: '2kHz' },
  { id: 'band-4k', index: 7, frequency: 4000, q: 0.7, type: 'peaking', label: '4kHz' },
  { id: 'band-8k', index: 8, frequency: 8000, q: 0.7, type: 'peaking', label: '8kHz' },
  { id: 'band-16k', index: 9, frequency: 16000, q: 0.7, type: 'highshelf', label: '16kHz' },
];

// Préréglages professionnels étendus
export const PROFESSIONAL_PRESETS: EqualiserPreset[] = [
  // Genres musicaux
  {
    id: 'pop',
    name: 'Pop',
    icon: '🎵',
    description: 'Courbe en V douce adaptée à la pop',
    category: 'genre',
    bands: {
      'band-32': 3, 'band-64': 2.5, 'band-125': 1,
      'band-250': 0, 'band-500': 0, 'band-1k': 1,
      'band-2k': 2, 'band-4k': 3, 'band-8k': 4, 'band-16k': 4,
    },
  },
  {
    id: 'vocal-boost',
    name: 'Vocal Boost',
    icon: '🎙️',
    description: 'Accentuation des médiums pour la voix',
    category: 'voice',
    bands: {
      'band-32': -2, 'band-64': -2, 'band-125': -1,
      'band-250': 0, 'band-500': 1, 'band-1k': 3,
      'band-2k': 4, 'band-4k': 3, 'band-8k': 1, 'band-16k': 0,
    },
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    icon: '🔊',
    description: 'Renforcement des basses fréquences',
    category: 'custom',
    bands: {
      'band-32': 6, 'band-64': 5, 'band-125': 3,
      'band-250': 1, 'band-500': 0, 'band-1k': 0,
      'band-2k': 0, 'band-4k': 0, 'band-8k': 0, 'band-16k': 0,
    },
  },
  {
    id: 'treble-boost',
    name: 'Treble Boost',
    icon: '🔔',
    description: 'Renforcement des aigus',
    category: 'custom',
    bands: {
      'band-32': 0, 'band-64': 0, 'band-125': 0,
      'band-250': 0, 'band-500': 0, 'band-1k': 0,
      'band-2k': 1, 'band-4k': 4, 'band-8k': 6, 'band-16k': 6,
    },
  },
  {
    id: 'loudness',
    name: 'Loudness',
    icon: '📢',
    description: 'Courbe en V marquée pour écoute à bas volume',
    category: 'custom',
    bands: {
      'band-32': 6, 'band-64': 6, 'band-125': 4,
      'band-250': 1, 'band-500': -2, 'band-1k': -3,
      'band-2k': -2, 'band-4k': 4, 'band-8k': 5, 'band-16k': 5,
    },
  },
  {
    id: 'flat',
    name: 'Flat',
    icon: '➖',
    description: 'Réponse linéaire sans coloration',
    category: 'music',
    bands: {},
  },
  {
    id: 'rock',
    name: 'Rock',
    icon: '🎸',
    description: 'Punch et présence pour le rock',
    category: 'genre',
    bands: {
      'band-32': 5, 'band-64': 4.5, 'band-125': 3,
      'band-250': -1, 'band-500': -2, 'band-1k': -1,
      'band-2k': 2, 'band-4k': 3.5, 'band-8k': 4, 'band-16k': 4.5,
    },
  },
  {
    id: 'jazz',
    name: 'Jazz',
    icon: '🎷',
    description: 'Chaleur et détails pour le jazz',
    category: 'genre',
    bands: {
      'band-32': 3, 'band-64': 2, 'band-125': 0,
      'band-250': -2, 'band-500': -1, 'band-1k': 1,
      'band-2k': 3, 'band-4k': 3, 'band-8k': 2, 'band-16k': 1,
    },
  },
  {
    id: 'electronic',
    name: 'Electronic',
    icon: '🎹',
    description: 'Basses profondes et aigus cristallins',
    category: 'genre',
    bands: {
      'band-32': 7, 'band-64': 6, 'band-125': 4,
      'band-250': 0, 'band-500': -2, 'band-1k': 0,
      'band-2k': 2, 'band-4k': 4, 'band-8k': 5, 'band-16k': 6,
    },
  },
  {
    id: 'classical',
    name: 'Classical',
    icon: '🎻',
    description: 'Équilibre naturel pour musique classique',
    category: 'genre',
    bands: {
      'band-32': 0, 'band-64': 0, 'band-125': 0,
      'band-250': -1, 'band-500': -1, 'band-1k': 0,
      'band-2k': 1, 'band-4k': 2, 'band-8k': 3, 'band-16k': 2,
    },
  },
  // Voix et instruments
  {
    id: 'vocal-male',
    name: 'Voix Masculine',
    icon: '🎤',
    description: 'Optimisé pour voix masculine',
    category: 'voice',
    bands: {
      'band-32': -3, 'band-64': -2, 'band-125': 2,
      'band-250': 3, 'band-500': 1, 'band-1k': 0,
      'band-2k': 2, 'band-4k': 3, 'band-8k': 2, 'band-16k': 0,
    },
  },
  {
    id: 'vocal-female',
    name: 'Voix Féminine',
    icon: '👩‍🎤',
    description: 'Optimisé pour voix féminine',
    category: 'voice',
    bands: {
      'band-32': -4, 'band-64': -3, 'band-125': -1,
      'band-250': 1, 'band-500': 2, 'band-1k': 3,
      'band-2k': 4, 'band-4k': 3, 'band-8k': 2, 'band-16k': 1,
    },
  },
  {
    id: 'podcast',
    name: 'Podcast',
    icon: '🎙️',
    description: 'Clarté vocale pour podcasts',
    category: 'voice',
    bands: {
      'band-32': -6, 'band-64': -4, 'band-125': 0,
      'band-250': 2, 'band-500': 3, 'band-1k': 2,
      'band-2k': 3, 'band-4k': 4, 'band-8k': 2, 'band-16k': -2,
    },
  },
  {
    id: 'acoustic-guitar',
    name: 'Guitare Acoustique',
    icon: '🎸',
    description: 'Brillance et corps pour guitare acoustique',
    category: 'instrument',
    bands: {
      'band-32': -4, 'band-64': -2, 'band-125': 1,
      'band-250': 2, 'band-500': 1, 'band-1k': 0,
      'band-2k': 2, 'band-4k': 3, 'band-8k': 4, 'band-16k': 3,
    },
  },
  {
    id: 'piano',
    name: 'Piano',
    icon: '🎹',
    description: 'Équilibre pour piano acoustique/électrique',
    category: 'instrument',
    bands: {
      'band-32': 0, 'band-64': 1, 'band-125': 1,
      'band-250': 0, 'band-500': -1, 'band-1k': 1,
      'band-2k': 2, 'band-4k': 3, 'band-8k': 2, 'band-16k': 1,
    },
  },
  // Environnements
  {
    id: 'small-room',
    name: 'Petite Pièce',
    icon: '🏠',
    description: 'Compensation pour petites pièces',
    category: 'custom',
    bands: {
      'band-32': -4, 'band-64': -3, 'band-125': -2,
      'band-250': -1, 'band-500': 0, 'band-1k': 1,
      'band-2k': 1, 'band-4k': 2, 'band-8k': 2, 'band-16k': 1,
    },
  },
  {
    id: 'headphones',
    name: 'Casque',
    icon: '🎧',
    description: 'Optimisé pour écoute au casque',
    category: 'custom',
    bands: {
      'band-32': 2, 'band-64': 1, 'band-125': 0,
      'band-250': -1, 'band-500': -1, 'band-1k': 0,
      'band-2k': 1, 'band-4k': 2, 'band-8k': 3, 'band-16k': 2,
    },
  },
];

// Thèmes de couleur
export const EQUALISER_THEMES: Record<'dark' | 'light', EqualiserTheme> = {
  dark: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    danger: '#FF453A',
    warning: '#FF9F0A',
    success: '#30D158',
    grid: '#2C2C2E',
    spectrum: {
      gradient: ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55'],
      peakColor: '#FFD60A',
    },
  },
  light: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#6C6C70',
    border: '#C6C6C8',
    danger: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    grid: '#E5E5EA',
    spectrum: {
      gradient: ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55'],
      peakColor: '#FF9500',
    },
  },
};

// Limites et configurations
export const EQUALISER_LIMITS = {
  MIN_GAIN: -24,
  MAX_GAIN: 24,
  MIN_Q: 0.1,
  MAX_Q: 10,
  MIN_FREQUENCY: 20,
  MAX_FREQUENCY: 20000,
  MAX_BANDS: 31,
  MIN_BANDS: 3,
  FFT_SIZE: 2048,
  SMOOTHING_TIME_CONSTANT: 0.8,
} as const;

// Messages d'aide
export const HELP_MESSAGES = {
  gain: "Ajustez le gain de chaque bande de fréquence. Double-tap pour réinitialiser à 0dB.",
  preset: "Sélectionnez un préréglage ou créez le vôtre.",
  bypass: "Compare le signal traité avec l'original.",
  spectrum: "Visualisation en temps réel du spectre audio.",
  q: "Facteur Q : largeur de la bande. Plus élevé = plus étroit.",
  automation: "Créez des automations pour des changements dynamiques.",
} as const;
