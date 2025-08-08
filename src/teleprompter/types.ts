export interface TeleprompterState {
  isPlaying: boolean;
  speedPxPerSec: number;
  fontSize: number;
  lineHeightMultiplier: number;
  content: string;
  horizontalPadding: number;
  verticalPadding: number;
}

export interface TeleprompterControlsProps {
  onPlayToggle: () => void;
  onSpeedChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
  onToggleDirection: () => void;
  onToggleMirror: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onToggleGlass: () => void;
  onBlurIntensityChange: (value: number) => void;
  onTintSelect: (hex: string) => void;
  onTintFreeChange: (hex: string) => void;
  onToggleGuideLine: () => void;
  onCornerRadiusChange: (value: number) => void;
  onHapticToggle: () => void;
  onHapticDurationChange: (value: number) => void;
  onTextColorSelect: (hex: string) => void;
  onTextColorFreeChange: (hex: string) => void;
  onTextOpacityChange: (value: number) => void;
  onHorizontalPaddingChange: (value: number) => void;
  onVerticalPaddingChange: (value: number) => void;
  onTwoColumnsToggle: () => void;
  onColumnGapChange: (value: number) => void;
  onTextAlignChange: (value: 'left' | 'center' | 'justify') => void;
  onSplitStrategyChange: (value: 'balanced' | 'byParagraph') => void;
  onApplyPreset: (name: 'studio' | 'clair' | 'contraste' | 'studio2cols') => void;
  onExportConfig: () => void;
  onImportConfigRequest: () => void;
  isPlaying: boolean;
  speedPxPerSec: number;
  fontSize: number;
  lineHeightMultiplier: number;
  isReversed: boolean;
  isMirrored: boolean;
  glassEnabled: boolean;
  blurIntensity: number;
  tintColor: string;
  showGuideLine: boolean;
  cornerRadius: number;
  hapticEnabled: boolean;
  hapticDurationMs: number;
  textColor: string;
  textOpacity: number; // 0..1
  horizontalPadding: number;
  verticalPadding: number;
  twoColumnsEnabled?: boolean;
  columnGap?: number;
  textAlign?: 'left' | 'center' | 'justify';
  splitStrategy?: 'balanced' | 'byParagraph';
}

export interface TeleprompterViewProps {
  text: string;
  offsetY: number;
  fontSize: number;
  lineHeightMultiplier: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  isMirrored?: boolean;
  showGuideLine?: boolean;
  glassEnabled?: boolean;
  blurIntensity?: number; // 0..100
  tintColor?: string;
  cornerRadius?: number;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  textStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  textColor?: string;
  textOpacity?: number;
  twoColumnsEnabled?: boolean;
  columnGap?: number;
  textAlign?: 'left' | 'center' | 'justify';
  splitStrategy?: 'balanced' | 'byParagraph';
  onContainerLayout?: (height: number) => void;
  onContentLayout?: (height: number) => void;
}

export interface TeleprompterPlayerProps {
  text: string;
  initialIsPlaying?: boolean;
  initialSpeedPxPerSec?: number;
  initialFontSize?: number;
  initialLineHeightMultiplier?: number;
  initialIsReversed?: boolean;
  initialIsMirrored?: boolean;
  initialGlassEnabled?: boolean;
  initialBlurIntensity?: number;
  initialTintColor?: string;
  initialShowGuideLine?: boolean;
  initialCornerRadius?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  onEndReached?: () => void;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  textStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  showControls?: boolean;
}


