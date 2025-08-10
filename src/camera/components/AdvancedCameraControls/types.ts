/**
 * Types pour le système de contrôles caméra avancé
 * Système nouvelle génération avec gestes, adaptation et contexte
 */

export type RecordingState = 'idle' | 'recording' | 'processing' | 'paused';
export type FlashMode = 'off' | 'on' | 'auto' | 'torch';
export type CameraPosition = 'front' | 'back';
export type CameraMode = 'video';
export type InterfaceMode = 'minimal' | 'standard' | 'pro';
export type LayoutOrientation = 'portrait' | 'landscape';
export type GestureType = 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch';

// Configuration du thème
export interface ThemeConfig {
  isDark: boolean;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  iconColor: string;
  activeColor: string;
  disabledColor: string;
}

// Configuration des gestes
export interface GestureConfig {
  enableSwipeToSwitch: boolean;
  enablePinchToZoom: boolean;
  enableDoubleTapPhoto: boolean;
  enableLongPressSettings: boolean;
  swipeSensitivity: number;
  pinchSensitivity: number;
}

// État contextuel de la caméra
export interface CameraContext {
  mode: CameraMode;
  recordingState: RecordingState;
  flashMode: FlashMode;
  cameraPosition: CameraPosition;
  zoomLevel: number;
  exposure: number;
  whiteBalance: string;
  filters: string[];
  advancedOptions: {
    hdr: boolean;
    nightMode: boolean;
    portraitMode: boolean;
    timer: number;
    grid: boolean;
  };
}

// Métadonnées d'enregistrement
export interface RecordingMetadata {
  duration: number;
  fileSize: number;
  resolution: string;
  frameRate: number;
  quality: string;
}

// Props pour le composant principal
export interface AdvancedCameraControlsProps {
  // États de base
  disabled?: boolean;
  recordingState: RecordingState;
  cameraMode: CameraMode;
  flashMode: FlashMode;
  cameraPosition: CameraPosition;
  context: CameraContext;
  
  // Métadonnées
  recordingMetadata?: RecordingMetadata;
  
  // Configuration
  theme?: Partial<ThemeConfig>;
  gestureConfig?: Partial<GestureConfig>;
  
  // Actions principales
  onModeChange: (mode: CameraMode) => void;
  onRecordPress: () => void;
  onPhotoPress: () => void;
  onPausePress?: () => void;
  
  // Actions secondaires
  onFlashPress: () => void;
  // Nouveau: branchement direct du mode flash depuis le menu trois points
  onFlashModeChange?: (mode: FlashMode) => void;
  onSwitchCamera: () => void;
  onZoomChange: (zoom: number) => void;
  onExposureChange: (exposure: number) => void;
  onFocusChange: (point: { x: number; y: number }) => void;
  
  // Actions avancées
  onFilterPress: () => void;
  onSettingsPress: () => void;
  onTimerPress?: () => void;
  onGridPress?: () => void;
  onTimerChange?: (seconds: number) => void;
  onGridToggle?: () => void;
  onSettingsOpen?: () => void;
  
  // Actions des filtres
  currentFilter?: any; // FilterState | null
  onFilterChange?: (name: string, intensity: number) => Promise<boolean>;
  onClearFilter?: () => Promise<boolean>;
  
  // Gestes
  onGesture?: (type: GestureType, data: any) => void;
  
  // Style
  style?: any;
}

// Props pour les boutons adaptatifs
export interface AdaptiveButtonProps {
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'auto';
  variant?: 'default' | 'active' | 'accent' | 'danger';
  shape?: 'circle' | 'rounded' | 'square';
  hapticFeedback?: boolean;
  tooltip?: string;
  badge?: string | number;
  style?: any;
}

// Props pour les panneaux coulissants
export interface SlidePanelProps {
  visible: boolean;
  side: 'left' | 'right' | 'top' | 'bottom';
  size?: number | 'small' | 'medium' | 'large';
  backdrop?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: any;
}

// Props pour la zone de gestes
export interface GestureAreaProps {
  onTap?: (point: { x: number; y: number }) => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
  onLongPress?: (point: { x: number; y: number }) => void;
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void;
  onPinch?: (scale: number, velocity: number) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: any;
}

// Props pour le timer contextuel
export interface ContextualTimerProps {
  recordingMetadata: RecordingMetadata;
  mode: CameraMode;
  visible: boolean;
  position?: 'top' | 'bottom' | 'floating';
  showDetails?: boolean;
  style?: any;
}

// Props pour les layouts
export interface LayoutProps {
  context: CameraContext;
  recordingState: RecordingState;
  recordingMetadata?: RecordingMetadata;
  theme: ThemeConfig;
  onAction: (action: string, data?: any) => void;
  style?: any;
}

// Configuration d'un contrôle personnalisé
export interface CustomControlConfig {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  priority: number;
  visible: boolean;
  action: string;
  data?: any;
}

// État interne du système
export interface ControlsState {
  activePanel: string | null;
  gesturesEnabled: boolean;
  hapticEnabled: boolean;
  autoHideEnabled: boolean;
  lastInteraction: number;
  customControls: CustomControlConfig[];
}
