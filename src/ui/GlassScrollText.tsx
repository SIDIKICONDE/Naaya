import React, { memo, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle, TextStyle, Platform, LayoutChangeEvent } from 'react-native';

export interface GlassScrollTextProps {
  text: string;
  fontSize?: number;
  lineHeightMultiplier?: number;
  tintColor?: string; // couleur dominante du verre
  blurIntensity?: number; // 0..100 (iOS) — fallback Android via opacité/dégradés
  cornerRadius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  height?: number; // hauteur du panneau
  width?: number | 'auto';
  offsetY?: number;
  onContentLayout?: (height: number) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  textColor?: string;
  textOpacity?: number; // 0..1
  twoColumnsEnabled?: boolean;
  columnGap?: number;
  textAlign?: 'left' | 'center' | 'justify';
  splitStrategy?: 'balanced' | 'byParagraph';
}

/**
 * Conteneur "glass liquid iOS" avec scroll textuel ultra réaliste.
 * - iOS: utilise l'effet blur natif via overlay et transparence
 * - Android: fallback avec dégradé et opacité
 */
export const GlassScrollText: React.FC<GlassScrollTextProps> = memo(({
  text,
  fontSize = 22,
  lineHeightMultiplier = 1.4,
  tintColor = '#ffffff',
  blurIntensity = 35,
  cornerRadius = 20,
  paddingHorizontal = 20,
  paddingVertical = 16,
  height,
  width = 'auto',
  offsetY,
  onContentLayout,
  style,
  textStyle,
  textColor = '#FFFFFF',
  textOpacity = 1.0,
  twoColumnsEnabled = false,
  columnGap = 24,
  textAlign = 'left',
  splitStrategy = 'balanced',
}) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const [colLeftText, colRightText] = useMemo((): [string, string] => {
    if (!twoColumnsEnabled) return [text, ''];
    const safe = text || '';
    if (splitStrategy === 'byParagraph') {
      const parts = safe.split(/\n+/);
      const half = Math.ceil(parts.length / 2);
      return [parts.slice(0, half).join('\n'), parts.slice(half).join('\n')];
    }
    const total = safe.length;
    const target = Math.floor(total / 2);
    const windowSize = 200;
    let bestIdx = target;
    const isBoundary = (ch: string) => /[\s.,;:!?\-\n]/.test(ch);
    for (let offset = 0; offset <= windowSize; offset += 1) {
      const leftIdx = target - offset;
      const rightIdx = target + offset;
      const leftCh = leftIdx > 0 ? safe.charAt(leftIdx) : '';
      const rightCh = rightIdx < total ? safe.charAt(rightIdx) : '';
      if (leftIdx > 0 && isBoundary(leftCh)) { bestIdx = leftIdx; break; }
      if (rightIdx < total && isBoundary(rightCh)) { bestIdx = rightIdx; break; }
    }
    return [safe.slice(0, bestIdx).trimEnd(), safe.slice(bestIdx).trimStart()];
  }, [text, twoColumnsEnabled, splitStrategy]);

  const handleTwoColsLayout = (e: LayoutChangeEvent) => {
    onContentLayout?.(e.nativeEvent.layout.height);
  };

  const containerStyle = useMemo(() => [
    styles.container,
    { borderRadius: cornerRadius, width },
    typeof height === 'number' ? { height } : { flex: 1 },
    style,
  ], [cornerRadius, height, width, style]);

  useEffect(() => {
    if (typeof offsetY === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ x: 0, y: offsetY, animated: false });
    }
  }, [offsetY]);

  return (
    <View style={containerStyle}>
      {/* Fond semi-transparent + flou + reflets */}
      <View style={[
        styles.glassBase,
        { borderRadius: cornerRadius },
        Platform.OS === 'ios' ? styles.glassBaseIos : styles.glassBaseAndroid,
      ]} />
      <View style={[styles.tintOverlay, { borderRadius: cornerRadius, backgroundColor: `${tintColor}10` }]} />
      <View style={[styles.highlight, { borderTopLeftRadius: cornerRadius, borderTopRightRadius: cornerRadius }]} />
      <View style={[styles.shadow, { borderRadius: cornerRadius }]} />

      {/* Fallback "Blur" visuel (sans dépendance) */}
      {Platform.OS === 'ios' && (
        <View style={[styles.iosBlurOverlay, { opacity: Math.min(1, Math.max(0, blurIntensity / 100)) }]} />
      )}

      {/* Contenu scrollable */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal, paddingVertical }}
        showsVerticalScrollIndicator={false}
      >
        {twoColumnsEnabled ? (
          <View style={[styles.twoColRow, { gap: columnGap }]} onLayout={handleTwoColsLayout}> 
            <View style={styles.columnFlex}>
              <Text
                style={[styles.text, { fontSize, lineHeight: fontSize * lineHeightMultiplier, color: textColor, opacity: textOpacity, textAlign }, textStyle]}
              >
                {colLeftText}
              </Text>
            </View>
            <View style={styles.columnFlex}>
              <Text
                style={[styles.text, { fontSize, lineHeight: fontSize * lineHeightMultiplier, color: textColor, opacity: textOpacity, textAlign }, textStyle]}
              >
                {colRightText}
              </Text>
            </View>
          </View>
        ) : (
          <Text
            style={[styles.text, { fontSize, lineHeight: fontSize * lineHeightMultiplier, color: textColor, opacity: textOpacity, textAlign }, textStyle]}
            onLayout={(e) => onContentLayout?.(e.nativeEvent.layout.height)}
          >
            {text}
          </Text>
        )}
      </ScrollView>
    </View>
  );
});

GlassScrollText.displayName = 'GlassScrollText';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glassBase: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassBaseIos: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassBaseAndroid: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.20)',
    opacity: 0.6,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.2)',
    opacity: 0.6,
  },
  iosBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scroll: {
    flex: 1,
  },
  text: {
    color: '#ffffff',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  columnFlex: {
    flex: 1,
  },
});

export default GlassScrollText;


