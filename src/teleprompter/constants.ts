export const DEFAULT_SPEED_PX_PER_SEC = 80;
export const MIN_SPEED_PX_PER_SEC = 10;
export const MAX_SPEED_PX_PER_SEC = 400;
export const SPEED_STEP_PX_PER_SEC = 5;

export const DEFAULT_FONT_SIZE = 22;
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 48;
export const FONT_SIZE_STEP = 2;

export const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.4;

export const DEFAULT_HORIZONTAL_PADDING = 24;
export const DEFAULT_VERTICAL_PADDING = 16;
export const MIN_HORIZONTAL_PADDING = 0;
export const MAX_HORIZONTAL_PADDING = 64;
export const HORIZONTAL_PADDING_STEP = 1;
export const MIN_VERTICAL_PADDING = 0;
export const MAX_VERTICAL_PADDING = 64;
export const VERTICAL_PADDING_STEP = 1;

export const END_REACH_EPSILON = 1; // marge pour détection de fin (px)
export const DEFAULT_IS_REVERSED = false;
export const DEFAULT_IS_MIRRORED = false;
export const TELEPROMPTER_SETTINGS_STORAGE_KEY = 'teleprompter:settings:v1';

// Effet verre (Glass)
export const DEFAULT_GLASS_ENABLED = true;
export const DEFAULT_BLUR_INTENSITY = 35; // 0..100
export const MIN_BLUR_INTENSITY = 0;
export const MAX_BLUR_INTENSITY = 100;
export const BLUR_INTENSITY_STEP = 1;
export const DEFAULT_TINT_COLOR = '#FFFFFF';
export const TINT_PRESETS = ['#FFFFFF', '#00A3FF', '#FFD166', '#FF6B81', '#7B61FF', '#00D1B2'] as const;

// Texte
export const DEFAULT_TEXT_COLOR = '#FFFFFF';
export const DEFAULT_TEXT_OPACITY = 1.0; // 0..1
export const MIN_TEXT_OPACITY = 0.0;
export const MAX_TEXT_OPACITY = 1.0;
export const TEXT_OPACITY_STEP = 0.05;

// Colonnes & alignement
export const DEFAULT_TWO_COLUMNS_ENABLED = false;
export const DEFAULT_COLUMN_GAP = 24;
export const MIN_COLUMN_GAP = 0;
export const MAX_COLUMN_GAP = 64;
export const COLUMN_GAP_STEP = 1;
export const DEFAULT_TEXT_ALIGN: 'left' | 'center' | 'justify' = 'left';
export const DEFAULT_SPLIT_STRATEGY: 'balanced' | 'byParagraph' = 'balanced';

// Presets
export type TeleprompterPresetName = 'studio' | 'clair' | 'contraste' | 'studio2cols';

export const TELEPROMPTER_PRESETS: Record<TeleprompterPresetName, {
  speedPxPerSec?: number;
  fontSize?: number;
  lineHeightMultiplier?: number;
  isReversed?: boolean;
  isMirrored?: boolean;
  glassEnabled?: boolean;
  blurIntensity?: number;
  tintColor?: string;
  showGuideLine?: boolean;
  cornerRadius?: number;
  hapticEnabled?: boolean;
  hapticDurationMs?: number;
  textColor?: string;
  textOpacity?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  twoColumnsEnabled?: boolean;
  columnGap?: number;
  textAlign?: 'left' | 'center' | 'justify';
  splitStrategy?: 'balanced' | 'byParagraph';
}> = {
  studio: {
    speedPxPerSec: 90,
    fontSize: 24,
    lineHeightMultiplier: 1.5,
    isReversed: false,
    isMirrored: false,
    glassEnabled: true,
    blurIntensity: 40,
    tintColor: '#FFFFFF',
    showGuideLine: true,
    cornerRadius: 24,
    hapticEnabled: true,
    hapticDurationMs: 12,
    textColor: '#FFFFFF',
    textOpacity: 0.95,
    horizontalPadding: 28,
    verticalPadding: 20,
    twoColumnsEnabled: false,
    columnGap: 24,
    textAlign: 'justify',
    splitStrategy: 'balanced',
  },
  clair: {
    speedPxPerSec: 80,
    fontSize: 22,
    lineHeightMultiplier: 1.4,
    glassEnabled: true,
    blurIntensity: 30,
    tintColor: '#FFFFFF',
    textColor: '#FFFFFF',
    textOpacity: 1.0,
    horizontalPadding: 20,
    verticalPadding: 16,
    textAlign: 'left',
    splitStrategy: 'balanced',
  },
  contraste: {
    speedPxPerSec: 85,
    fontSize: 24,
    lineHeightMultiplier: 1.5,
    glassEnabled: false,
    textColor: '#FFFFFF',
    textOpacity: 1.0,
    horizontalPadding: 24,
    verticalPadding: 18,
    textAlign: 'justify',
    splitStrategy: 'balanced',
  },
  studio2cols: {
    speedPxPerSec: 90,
    fontSize: 24,
    lineHeightMultiplier: 1.5,
    twoColumnsEnabled: true,
    columnGap: 28,
    textAlign: 'justify',
    splitStrategy: 'byParagraph',
    glassEnabled: true,
    blurIntensity: 40,
    textColor: '#FFFFFF',
    textOpacity: 0.95,
  },
};

// Ligne guide et rayon
export const DEFAULT_SHOW_GUIDE_LINE = true;
export const DEFAULT_CORNER_RADIUS = 20;
export const MIN_CORNER_RADIUS = 8;
export const MAX_CORNER_RADIUS = 40;
export const CORNER_RADIUS_STEP = 1;

// Haptique
export const DEFAULT_HAPTIC_ENABLED = true;
export const DEFAULT_HAPTIC_DURATION_MS = 12;
export const MIN_HAPTIC_DURATION_MS = 0;
export const MAX_HAPTIC_DURATION_MS = 50;
export const HAPTIC_DURATION_STEP = 1;


