/**
 * Thème moderne et constantes d'animation pour l'égaliseur
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Palette de couleurs moderne avec gradients
export const MODERN_THEME = {
  // Couleurs principales
  colors: {
    // Fond et surfaces
    background: '#0A0A0B',
    backgroundSecondary: '#0F0F11',
    surface: '#1A1A1D',
    surfaceElevated: '#242428',
    surfaceHighlight: '#2A2A2F',
    
    // Couleurs d'accent avec gradients
    primary: {
      base: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      gradient: ['#6366F1', '#8B5CF6'],
    },
    secondary: {
      base: '#EC4899',
      light: '#F472B6',
      dark: '#DB2777',
      gradient: ['#EC4899', '#F43F5E'],
    },
    accent: {
      base: '#10B981',
      light: '#34D399',
      dark: '#059669',
      gradient: ['#10B981', '#14B8A6'],
    },
    
    // États et feedback
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    
    // Texte
    text: {
      primary: '#FFFFFF',
      secondary: '#A1A1AA',
      tertiary: '#71717A',
      disabled: '#52525B',
      inverse: '#09090B',
    },
    
    // Bordures et séparateurs
    border: {
      default: 'rgba(255, 255, 255, 0.08)',
      light: 'rgba(255, 255, 255, 0.04)',
      strong: 'rgba(255, 255, 255, 0.12)',
      gradient: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)'],
    },
    
    // Overlays et ombres
    overlay: {
      light: 'rgba(0, 0, 0, 0.3)',
      medium: 'rgba(0, 0, 0, 0.5)',
      heavy: 'rgba(0, 0, 0, 0.7)',
      blur: 'rgba(0, 0, 0, 0.8)',
    },
    
    // Couleurs pour les fréquences
    frequency: {
      bass: '#EF4444',      // Rouge pour les basses
      lowMid: '#F97316',    // Orange pour les bas-médiums
      mid: '#FCD34D',       // Jaune pour les médiums
      highMid: '#10B981',   // Vert pour les hauts-médiums
      treble: '#3B82F6',    // Bleu pour les aigus
      presence: '#8B5CF6',  // Violet pour la présence
    },
  },
  
  // Effets visuels
  effects: {
    // Ombres modernes
    shadows: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 4,
      },
      large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
      },
      glow: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
      },
    },
    
    // Effets de flou
    blur: {
      light: 5,
      medium: 10,
      heavy: 20,
      extreme: 30,
    },
    
    // Gradients prédéfinis
    gradients: {
      primary: ['#6366F1', '#8B5CF6'],
      secondary: ['#EC4899', '#F43F5E'],
      success: ['#10B981', '#14B8A6'],
      warm: ['#F59E0B', '#EF4444'],
      cool: ['#3B82F6', '#6366F1'],
      dark: ['#1A1A1D', '#0A0A0B'],
      light: ['#FFFFFF', '#F3F4F6'],
      spectrum: ['#EF4444', '#F97316', '#FCD34D', '#10B981', '#3B82F6', '#8B5CF6'],
    },
  },
  
  // Espacements et dimensions
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Rayons de bordure
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Typographie
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
};

// Configuration des animations fluides
export const ANIMATION_CONFIG = {
  // Durées standards
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  
  // Configurations Spring
  spring: {
    gentle: {
      stiffness: 100,
      damping: 15,
      mass: 1,
    },
    bouncy: {
      stiffness: 200,
      damping: 10,
      mass: 0.8,
    },
    stiff: {
      stiffness: 300,
      damping: 20,
      mass: 1,
    },
    wobbly: {
      stiffness: 180,
      damping: 12,
      mass: 1,
    },
  },
  
  // Timing functions
  easing: {
    linear: [0, 0, 1, 1],
    easeIn: [0.4, 0, 1, 1],
    easeOut: [0, 0, 0.2, 1],
    easeInOut: [0.4, 0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
    smooth: [0.25, 0.1, 0.25, 1],
  },
  
  // Configurations pour les gestes
  gesture: {
    swipeThreshold: 50,
    velocityThreshold: 0.3,
    distanceThreshold: 10,
    directionOffsetThreshold: 80,
  },
};

// Dimensions de l'égaliseur
export const EQUALIZER_DIMENSIONS = {
  // Dimensions du slider
  slider: {
    height: 200,
    trackWidth: 6,
    knobSize: 28,
    touchAreaSize: 44,
    containerWidth: 70,
  },
  
  // Dimensions du visualiseur
  visualizer: {
    height: 140,
    barWidth: 4,
    barSpacing: 2,
    maxBars: Math.floor(SCREEN_WIDTH / 6),
  },
  
  // Dimensions des présets
  preset: {
    cardWidth: 100,
    cardHeight: 80,
    iconSize: 32,
  },
  
  // Dimensions générales
  general: {
    headerHeight: 60,
    tabBarHeight: 50,
    controlPanelHeight: 250,
  },
};

// Configuration de l'interaction tactile
export const TOUCH_CONFIG = {
  // Zones tactiles minimales (accessibilité)
  minTouchSize: 44,
  
  // Délais et timeouts
  longPressDelay: 500,
  doubleTapDelay: 300,
  
  // Sensibilité
  sensitivity: {
    low: 0.5,
    medium: 1,
    high: 1.5,
  },
  
  // Retour haptique
  haptic: {
    light: 10,
    medium: 20,
    heavy: 30,
    selection: 10,
    success: 20,
    warning: 25,
    error: 30,
  },
};

// Points de rupture pour le responsive
export const BREAKPOINTS = {
  small: 320,
  medium: 375,
  large: 414,
  xlarge: 768,
};

// Configuration des fréquences avec couleurs
export const FREQUENCY_CONFIG = [
  { index: 0, frequency: 32, label: '32Hz', color: MODERN_THEME.colors.frequency.bass },
  { index: 1, frequency: 64, label: '64Hz', color: MODERN_THEME.colors.frequency.bass },
  { index: 2, frequency: 125, label: '125Hz', color: MODERN_THEME.colors.frequency.lowMid },
  { index: 3, frequency: 250, label: '250Hz', color: MODERN_THEME.colors.frequency.lowMid },
  { index: 4, frequency: 500, label: '500Hz', color: MODERN_THEME.colors.frequency.mid },
  { index: 5, frequency: 1000, label: '1kHz', color: MODERN_THEME.colors.frequency.mid },
  { index: 6, frequency: 2000, label: '2kHz', color: MODERN_THEME.colors.frequency.highMid },
  { index: 7, frequency: 4000, label: '4kHz', color: MODERN_THEME.colors.frequency.highMid },
  { index: 8, frequency: 8000, label: '8kHz', color: MODERN_THEME.colors.frequency.treble },
  { index: 9, frequency: 16000, label: '16kHz', color: MODERN_THEME.colors.frequency.presence },
];

export default MODERN_THEME;