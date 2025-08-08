import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MutableRefObject } from 'react';
import { END_REACH_EPSILON, DEFAULT_SPEED_PX_PER_SEC, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT_MULTIPLIER, DEFAULT_IS_REVERSED, DEFAULT_IS_MIRRORED, TELEPROMPTER_SETTINGS_STORAGE_KEY, DEFAULT_GLASS_ENABLED, DEFAULT_BLUR_INTENSITY, DEFAULT_TINT_COLOR, DEFAULT_SHOW_GUIDE_LINE, DEFAULT_CORNER_RADIUS, DEFAULT_HAPTIC_ENABLED, DEFAULT_HAPTIC_DURATION_MS, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_OPACITY, DEFAULT_HORIZONTAL_PADDING, DEFAULT_VERTICAL_PADDING, DEFAULT_TWO_COLUMNS_ENABLED, DEFAULT_COLUMN_GAP, DEFAULT_TEXT_ALIGN, DEFAULT_SPLIT_STRATEGY } from './constants';

export interface UseTeleprompterOptions {
  initialText?: string;
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
}

export interface UseTeleprompterReturn {
  isPlaying: boolean;
  speedPxPerSec: number;
  fontSize: number;
  lineHeightMultiplier: number;
  content: string;
  offsetY: number;
  isReversed: boolean;
  isMirrored: boolean;
  glassEnabled: boolean;
  blurIntensity: number;
  tintColor: string;
  hapticEnabled: boolean;
  hapticDurationMs: number;
  showGuideLine: boolean;
  cornerRadius: number;
  textColor: string;
  textOpacity: number;
  horizontalPadding: number;
  verticalPadding: number;
  twoColumnsEnabled: boolean;
  columnGap: number;
  textAlign: 'left' | 'center' | 'justify';
  splitStrategy: 'balanced' | 'byParagraph';
  setContent: (text: string) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  setSpeed: (value: number) => void;
  setFontSize: (value: number) => void;
  setLineHeight: (value: number) => void;
  toggleDirection: () => void;
  toggleMirror: () => void;
  toggleGlass: () => void;
  setBlurIntensity: (value: number) => void;
  setTintColor: (hex: string) => void;
  setShowGuideLine: (value: boolean) => void;
  setCornerRadius: (value: number) => void;
  setHapticEnabled: (value: boolean) => void;
  setHapticDurationMs: (value: number) => void;
  setTextColor: (hex: string) => void;
  setTextOpacity: (value: number) => void;
  setHorizontalPadding: (value: number) => void;
  setVerticalPadding: (value: number) => void;
  setTwoColumnsEnabled: (value: boolean) => void;
  setColumnGap: (value: number) => void;
  setTextAlign: (value: 'left' | 'center' | 'justify') => void;
  setSplitStrategy: (value: 'balanced' | 'byParagraph') => void;
  applyPreset: (name: 'studio' | 'clair' | 'contraste' | 'studio2cols') => void;
  exportConfig: () => string;
  importConfig: (json: string) => void;
  reset: () => void;
  setOffsetY: (value: number) => void;
  containerHeightRef: MutableRefObject<number>;
  contentHeightRef: MutableRefObject<number>;
}

export function useTeleprompter(options: UseTeleprompterOptions = {}): UseTeleprompterReturn {
  const {
    initialText = '',
    initialIsPlaying = false,
    initialSpeedPxPerSec = DEFAULT_SPEED_PX_PER_SEC,
    initialFontSize = DEFAULT_FONT_SIZE,
    initialLineHeightMultiplier = DEFAULT_LINE_HEIGHT_MULTIPLIER,
    initialIsReversed = DEFAULT_IS_REVERSED,
    initialIsMirrored = DEFAULT_IS_MIRRORED,
    initialGlassEnabled = DEFAULT_GLASS_ENABLED,
    initialBlurIntensity = DEFAULT_BLUR_INTENSITY,
    initialTintColor = DEFAULT_TINT_COLOR,
    initialShowGuideLine = DEFAULT_SHOW_GUIDE_LINE,
    initialCornerRadius = DEFAULT_CORNER_RADIUS,
    onEndReached,
  } = options;

  const [isPlaying, setIsPlaying] = useState<boolean>(initialIsPlaying);
  const [speedPxPerSec, setSpeedPxPerSec] = useState<number>(initialSpeedPxPerSec);
  const [fontSize, setFontSize] = useState<number>(initialFontSize);
  const [lineHeightMultiplier, setLineHeightMultiplier] = useState<number>(initialLineHeightMultiplier);
  const [content, setContent] = useState<string>(initialText);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isReversed, setIsReversed] = useState<boolean>(initialIsReversed);
  const [isMirrored, setIsMirrored] = useState<boolean>(initialIsMirrored);
  const [glassEnabled, setGlassEnabled] = useState<boolean>(initialGlassEnabled);
  const [blurIntensity, setBlurIntensity] = useState<number>(initialBlurIntensity);
  const [tintColor, setTintColor] = useState<string>(initialTintColor);
  const [showGuideLine, setShowGuideLine] = useState<boolean>(initialShowGuideLine);
  const [cornerRadius, setCornerRadius] = useState<number>(initialCornerRadius);
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(DEFAULT_HAPTIC_ENABLED);
  const [hapticDurationMs, setHapticDurationMs] = useState<number>(DEFAULT_HAPTIC_DURATION_MS);
  const [textColor, setTextColor] = useState<string>(DEFAULT_TEXT_COLOR);
  const [textOpacity, setTextOpacity] = useState<number>(DEFAULT_TEXT_OPACITY);
  const [horizontalPaddingState, setHorizontalPadding] = useState<number>(options.horizontalPadding ?? DEFAULT_HORIZONTAL_PADDING);
  const [verticalPaddingState, setVerticalPadding] = useState<number>(options.verticalPadding ?? DEFAULT_VERTICAL_PADDING);
  const [twoColumnsEnabled, setTwoColumnsEnabled] = useState<boolean>(DEFAULT_TWO_COLUMNS_ENABLED);
  const [columnGap, setColumnGap] = useState<number>(DEFAULT_COLUMN_GAP);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>(DEFAULT_TEXT_ALIGN);
  const [splitStrategy, setSplitStrategy] = useState<'balanced' | 'byParagraph'>(DEFAULT_SPLIT_STRATEGY);

  const lastTimestampRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerHeightRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);

  const step = useCallback((timestamp: number) => {
    if (!isPlaying) {
      lastTimestampRef.current = timestamp;
      return;
    }
    if (lastTimestampRef.current == null) {
      lastTimestampRef.current = timestamp;
    }
    const deltaMs = timestamp - (lastTimestampRef.current ?? timestamp);
    lastTimestampRef.current = timestamp;

    setOffsetY((previousOffset) => {
      const increment = (speedPxPerSec * deltaMs) / 1000;
      const max = Math.max(0, contentHeightRef.current - containerHeightRef.current);
      const next = isReversed
        ? Math.max(0, previousOffset - increment)
        : Math.min(previousOffset + increment, max);
      return next;
    });
  }, [isPlaying, speedPxPerSec, isReversed]);

  const loop = useCallback((timestamp: number) => {
    step(timestamp);
    rafRef.current = requestAnimationFrame(loop);
  }, [step]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    // reset timing when (re)starting
    lastTimestampRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, loop]);

  // Charger les réglages persistés
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TELEPROMPTER_SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<{
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
            textOpacity: number;
            horizontalPadding: number;
            verticalPadding: number;
            twoColumnsEnabled: boolean;
            columnGap: number;
            textAlign: 'left' | 'center' | 'justify';
            splitStrategy: 'balanced' | 'byParagraph';
          }>; 
          if (typeof parsed.speedPxPerSec === 'number') setSpeedPxPerSec(parsed.speedPxPerSec);
          if (typeof parsed.fontSize === 'number') setFontSize(parsed.fontSize);
          if (typeof parsed.lineHeightMultiplier === 'number') setLineHeightMultiplier(parsed.lineHeightMultiplier);
          if (typeof parsed.isReversed === 'boolean') setIsReversed(parsed.isReversed);
          if (typeof parsed.isMirrored === 'boolean') setIsMirrored(parsed.isMirrored);
          if (typeof parsed.glassEnabled === 'boolean') setGlassEnabled(parsed.glassEnabled);
          if (typeof parsed.blurIntensity === 'number') setBlurIntensity(parsed.blurIntensity);
          if (typeof parsed.tintColor === 'string') setTintColor(parsed.tintColor);
          if (typeof parsed.showGuideLine === 'boolean') setShowGuideLine(parsed.showGuideLine);
          if (typeof parsed.cornerRadius === 'number') setCornerRadius(parsed.cornerRadius);
          if (typeof parsed.hapticEnabled === 'boolean') setHapticEnabled(parsed.hapticEnabled);
          if (typeof parsed.hapticDurationMs === 'number') setHapticDurationMs(parsed.hapticDurationMs);
          if (typeof parsed.textColor === 'string') setTextColor(parsed.textColor);
          if (typeof parsed.textOpacity === 'number') setTextOpacity(parsed.textOpacity);
          if (typeof parsed.horizontalPadding === 'number') setHorizontalPadding(parsed.horizontalPadding);
          if (typeof parsed.verticalPadding === 'number') setVerticalPadding(parsed.verticalPadding);
          if (typeof parsed.twoColumnsEnabled === 'boolean') setTwoColumnsEnabled(parsed.twoColumnsEnabled);
          if (typeof parsed.columnGap === 'number') setColumnGap(parsed.columnGap);
          if (parsed.textAlign === 'left' || parsed.textAlign === 'center' || parsed.textAlign === 'justify') setTextAlign(parsed.textAlign);
          if (parsed.splitStrategy === 'balanced' || parsed.splitStrategy === 'byParagraph') setSplitStrategy(parsed.splitStrategy);
        }
      } catch (e) {
        // ignorer les erreurs de lecture
      }
    })();
  }, []);

  // Persister les réglages lorsque changent
  useEffect(() => {
    (async () => {
      try {
        const data = JSON.stringify({
          speedPxPerSec,
          fontSize,
          lineHeightMultiplier,
          isReversed,
          isMirrored,
          glassEnabled,
          blurIntensity,
          tintColor,
          showGuideLine,
          cornerRadius,
          hapticEnabled,
          hapticDurationMs,
          textColor,
          textOpacity,
          horizontalPadding: horizontalPaddingState,
          verticalPadding: verticalPaddingState,
          twoColumnsEnabled,
          columnGap,
          textAlign,
          splitStrategy,
        });
        await AsyncStorage.setItem(TELEPROMPTER_SETTINGS_STORAGE_KEY, data);
      } catch (e) {
        // ignorer les erreurs d'écriture
      }
    })();
  }, [speedPxPerSec, fontSize, lineHeightMultiplier, isReversed, isMirrored, glassEnabled, blurIntensity, tintColor, showGuideLine, cornerRadius, hapticEnabled, hapticDurationMs, textColor, textOpacity, horizontalPaddingState, verticalPaddingState, twoColumnsEnabled, columnGap, textAlign, splitStrategy]);

  useEffect(() => {
    if (!isPlaying) return;
    const max = Math.max(0, contentHeightRef.current - containerHeightRef.current);
    const distanceToEnd = max - offsetY;
    if (distanceToEnd <= END_REACH_EPSILON) {
      setIsPlaying(false);
      onEndReached?.();
    }
  }, [offsetY, isPlaying, onEndReached]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const play = useCallback(() => setIsPlaying(true), []);
  const setSpeed = useCallback((v: number) => setSpeedPxPerSec(Math.max(0, v)), []);
  const setLineHeight = useCallback((v: number) => setLineHeightMultiplier(Math.max(1, v)), []);
  const toggleDirection = useCallback(() => setIsReversed((prev) => !prev), []);
  const toggleMirror = useCallback(() => setIsMirrored((prev) => !prev), []);
  const toggleGlass = useCallback(() => setGlassEnabled((prev) => !prev), []);

  const reset = useCallback(() => {
    setOffsetY(0);
    setIsPlaying(false);
    lastTimestampRef.current = null;
  }, []);

  const applyPreset = useCallback((name: 'studio' | 'clair' | 'contraste' | 'studio2cols') => {
    switch (name) {
      case 'studio':
        setSpeedPxPerSec(90);
        setFontSize(24);
        setLineHeightMultiplier(1.5);
        setIsReversed(false);
        setIsMirrored(false);
        setGlassEnabled(true);
        setBlurIntensity(40);
        setTintColor('#FFFFFF');
        setShowGuideLine(true);
        setCornerRadius(24);
        setHapticEnabled(true);
        setHapticDurationMs(12);
        setTextColor('#FFFFFF');
        setTextOpacity(0.95);
        setHorizontalPadding(28);
        setVerticalPadding(20);
        setTwoColumnsEnabled(false);
        setColumnGap(24);
        setTextAlign('justify');
        setSplitStrategy('balanced');
        break;
      case 'clair':
        setSpeedPxPerSec(80);
        setFontSize(22);
        setLineHeightMultiplier(1.4);
        setGlassEnabled(true);
        setBlurIntensity(30);
        setTintColor('#FFFFFF');
        setTextColor('#FFFFFF');
        setTextOpacity(1.0);
        setHorizontalPadding(20);
        setVerticalPadding(16);
        setTextAlign('left');
        setSplitStrategy('balanced');
        setTwoColumnsEnabled(false);
        break;
      case 'contraste':
        setSpeedPxPerSec(85);
        setFontSize(24);
        setLineHeightMultiplier(1.5);
        setGlassEnabled(false);
        setTextColor('#FFFFFF');
        setTextOpacity(1.0);
        setHorizontalPadding(24);
        setVerticalPadding(18);
        setTextAlign('justify');
        setSplitStrategy('balanced');
        setTwoColumnsEnabled(false);
        break;
      case 'studio2cols':
        setSpeedPxPerSec(90);
        setFontSize(24);
        setLineHeightMultiplier(1.5);
        setTwoColumnsEnabled(true);
        setColumnGap(28);
        setTextAlign('justify');
        setSplitStrategy('byParagraph');
        setGlassEnabled(true);
        setBlurIntensity(40);
        setTextColor('#FFFFFF');
        setTextOpacity(0.95);
        break;
      default:
        break;
    }
  }, []);

  const exportConfig = useCallback((): string => {
    const cfg = {
      speedPxPerSec,
      fontSize,
      lineHeightMultiplier,
      isReversed,
      isMirrored,
      glassEnabled,
      blurIntensity,
      tintColor,
      showGuideLine,
      cornerRadius,
      hapticEnabled,
      hapticDurationMs,
      textColor,
      textOpacity,
      horizontalPadding: horizontalPaddingState,
      verticalPadding: verticalPaddingState,
      twoColumnsEnabled,
      columnGap,
      textAlign,
      splitStrategy,
    } as const;
    return JSON.stringify(cfg, null, 2);
  }, [speedPxPerSec, fontSize, lineHeightMultiplier, isReversed, isMirrored, glassEnabled, blurIntensity, tintColor, showGuideLine, cornerRadius, hapticEnabled, hapticDurationMs, textColor, textOpacity, horizontalPaddingState, verticalPaddingState, twoColumnsEnabled, columnGap, textAlign, splitStrategy]);

  const importConfig = useCallback((json: string) => {
    try {
      const cfg = JSON.parse(json);
      if (typeof cfg.speedPxPerSec === 'number') setSpeedPxPerSec(cfg.speedPxPerSec);
      if (typeof cfg.fontSize === 'number') setFontSize(cfg.fontSize);
      if (typeof cfg.lineHeightMultiplier === 'number') setLineHeightMultiplier(cfg.lineHeightMultiplier);
      if (typeof cfg.isReversed === 'boolean') setIsReversed(cfg.isReversed);
      if (typeof cfg.isMirrored === 'boolean') setIsMirrored(cfg.isMirrored);
      if (typeof cfg.glassEnabled === 'boolean') setGlassEnabled(cfg.glassEnabled);
      if (typeof cfg.blurIntensity === 'number') setBlurIntensity(cfg.blurIntensity);
      if (typeof cfg.tintColor === 'string') setTintColor(cfg.tintColor);
      if (typeof cfg.showGuideLine === 'boolean') setShowGuideLine(cfg.showGuideLine);
      if (typeof cfg.cornerRadius === 'number') setCornerRadius(cfg.cornerRadius);
      if (typeof cfg.hapticEnabled === 'boolean') setHapticEnabled(cfg.hapticEnabled);
      if (typeof cfg.hapticDurationMs === 'number') setHapticDurationMs(cfg.hapticDurationMs);
      if (typeof cfg.textColor === 'string') setTextColor(cfg.textColor);
      if (typeof cfg.textOpacity === 'number') setTextOpacity(cfg.textOpacity);
      if (typeof cfg.horizontalPadding === 'number') setHorizontalPadding(cfg.horizontalPadding);
      if (typeof cfg.verticalPadding === 'number') setVerticalPadding(cfg.verticalPadding);
      if (typeof cfg.twoColumnsEnabled === 'boolean') setTwoColumnsEnabled(cfg.twoColumnsEnabled);
      if (typeof cfg.columnGap === 'number') setColumnGap(cfg.columnGap);
      if (cfg.textAlign === 'left' || cfg.textAlign === 'center' || cfg.textAlign === 'justify') setTextAlign(cfg.textAlign);
      if (cfg.splitStrategy === 'balanced' || cfg.splitStrategy === 'byParagraph') setSplitStrategy(cfg.splitStrategy);
    } catch {
      // ignore invalid JSON
    }
  }, []);

  return {
    isPlaying,
    speedPxPerSec,
    fontSize,
    lineHeightMultiplier,
    content,
    offsetY,
    isReversed,
    isMirrored,
    glassEnabled,
    blurIntensity,
    tintColor,
    textColor,
    textOpacity,
    horizontalPadding: horizontalPaddingState,
    verticalPadding: verticalPaddingState,
    twoColumnsEnabled,
    columnGap,
    textAlign,
    splitStrategy,
    hapticEnabled,
    hapticDurationMs,
    showGuideLine,
    cornerRadius,
    setContent,
    togglePlay,
    pause,
    play,
    setSpeed,
    setFontSize,
    setLineHeight,
    toggleDirection,
    toggleMirror,
    toggleGlass,
    setBlurIntensity,
    setTintColor,
    setShowGuideLine,
    setCornerRadius,
    setHapticEnabled,
    setHapticDurationMs,
    setTextColor,
    setTextOpacity,
    setHorizontalPadding,
    setVerticalPadding,
    setTwoColumnsEnabled,
    setColumnGap,
    setTextAlign,
    setSplitStrategy,
    applyPreset,
    exportConfig,
    importConfig,
    reset,
    setOffsetY,
    containerHeightRef,
    contentHeightRef,
  };
}


