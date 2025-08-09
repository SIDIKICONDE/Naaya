import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type GridMode = 'none' | 'thirds' | 'golden' | 'diagonals';

export type AspectMask = 'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16';

export interface GridOverlayProps {
  color?: string;
  thickness?: number;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
  mode?: GridMode;
  showCenter?: boolean;
  centerStyle?: 'dot' | 'crosshair';
  aspectMask?: AspectMask;
  maskOpacity?: number;
}

/**
 * GridOverlay
 * Affiche une grille (règle des tiers) en overlay, sans capter les interactions.
 */
export const GridOverlay: React.FC<GridOverlayProps> = ({
  color = 'rgba(255,255,255,0.35)',
  thickness = 1,
  style,
  visible = true,
  mode = 'thirds',
  showCenter = false,
  centerStyle = 'crosshair',
  aspectMask = 'none',
  maskOpacity = 0.35,
}) => {
  const [container, setContainer] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== container.width || height !== container.height) {
      setContainer({ width, height });
    }
  };

  const diagonalLength = useMemo(() => {
    return Math.sqrt(container.width * container.width + container.height * container.height);
  }, [container.width, container.height]);

  const goldenPositions = useMemo(() => {
    const leftA = container.width * 0.382;
    const leftB = container.width * 0.618;
    const topA = container.height * 0.382;
    const topB = container.height * 0.618;
    return { leftA, leftB, topA, topB };
  }, [container.width, container.height]);

  const maskRects = useMemo(() => {
    if (aspectMask === 'none' || container.width === 0 || container.height === 0) return null;

    const parseRatio = (preset: AspectMask): number => {
      switch (preset) {
        case '1:1':
          return 1;
        case '4:3':
          return 4 / 3;
        case '16:9':
          return 16 / 9;
        case '2.39:1':
          return 2.39;
        case '9:16':
          return 9 / 16;
        default:
          return container.width / container.height;
      }
    };

    const target = parseRatio(aspectMask);
    
    // Debug log pour diagnostiquer le problème avec 2.39:1
    if (aspectMask === '2.39:1') {
      console.log('[GridOverlay] 2.39:1 debug:', {
        target,
        containerWidth: container.width,
        containerHeight: container.height,
        containerRatio: container.width / container.height
      });
    }
    
    // Fit (contain) rectangle into container
    let innerWidth = container.width;
    let innerHeight = innerWidth / target;
    if (innerHeight > container.height) {
      innerHeight = container.height;
      innerWidth = innerHeight * target;
    }

    const left = (container.width - innerWidth) / 2;
    const top = (container.height - innerHeight) / 2;

    // S'assurer que les dimensions sont au moins de 1 pixel pour être visibles
    const safeWidth = Math.max(1, innerWidth);
    const safeHeight = Math.max(1, innerHeight);

    if (aspectMask === '2.39:1') {
      console.log('[GridOverlay] 2.39:1 result:', {
        left, top, width: safeWidth, height: safeHeight,
        maskTop: top, maskBottom: container.height - (top + safeHeight)
      });
    }

    return { left, top, width: safeWidth, height: safeHeight };
  }, [aspectMask, container.width, container.height]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, styles.container, style]}> 
      {/* Masque d'aspect optionnel */}
      {maskRects && (
        <>
          {/* Zones masquées autour du rectangle intérieur */}
          {maskRects.top > 0 && (
            <View style={[styles.mask, styles.maskTopBase, { opacity: maskOpacity, height: maskRects.top }]} />
          )}
          {(container.height - (maskRects.top + maskRects.height)) > 0 && (
            <View style={[styles.mask, styles.maskBottomBase, { opacity: maskOpacity, top: maskRects.top + maskRects.height }]} />
          )}
          {maskRects.left > 0 && (
            <View style={[styles.mask, styles.maskLeftBase, { opacity: maskOpacity, top: maskRects.top, width: maskRects.left, height: maskRects.height }]} />
          )}
          {(container.width - (maskRects.left + maskRects.width)) > 0 && (
            <View style={[styles.mask, styles.maskRightBase, { opacity: maskOpacity, top: maskRects.top, left: maskRects.left + maskRects.width, height: maskRects.height }]} />
          )}
        </>
      )}

      {/* Grilles */}
      {mode === 'thirds' && (
        <>
          {/* Lignes verticales (2) via colonnes avec bordure gauche sur col2 et col3 */}
          <View style={styles.columnsContainer}>
            <View style={styles.flexCell} />
            <View style={[styles.flexCell, { borderLeftWidth: thickness, borderLeftColor: color }]} />
            <View style={[styles.flexCell, { borderLeftWidth: thickness, borderLeftColor: color }]} />
          </View>

          {/* Lignes horizontales (2) via lignes avec bordure haute sur row2 et row3 */}
          <View style={styles.rowsContainer}>
            <View style={styles.flexCell} />
            <View style={[styles.flexCell, { borderTopWidth: thickness, borderTopColor: color }]} />
            <View style={[styles.flexCell, { borderTopWidth: thickness, borderTopColor: color }]} />
          </View>
        </>
      )}

      {mode === 'golden' && (
        <>
          {/* Verticales */}
          <View style={[styles.vLine, { left: goldenPositions.leftA - thickness / 2, width: thickness, backgroundColor: color }]} />
          <View style={[styles.vLine, { left: goldenPositions.leftB - thickness / 2, width: thickness, backgroundColor: color }]} />
          {/* Horizontales */}
          <View style={[styles.hLine, { top: goldenPositions.topA - thickness / 2, height: thickness, backgroundColor: color }]} />
          <View style={[styles.hLine, { top: goldenPositions.topB - thickness / 2, height: thickness, backgroundColor: color }]} />
        </>
      )}

      {mode === 'diagonals' && container.width > 0 && container.height > 0 && (
        <>
          {/* Diagonale \ */}
          <View
            style={[
              styles.diagonal,
              styles.abs,
              {
                width: diagonalLength,
                height: thickness,
                backgroundColor: color,
                top: container.height / 2 - thickness / 2,
                left: container.width / 2 - diagonalLength / 2,
                transform: [{ rotate: '-45deg' }],
              },
            ]}
          />
          {/* Diagonale / */}
          <View
            style={[
              styles.diagonal,
              styles.abs,
              {
                width: diagonalLength,
                height: thickness,
                backgroundColor: color,
                top: container.height / 2 - thickness / 2,
                left: container.width / 2 - diagonalLength / 2,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        </>
      )}

      {/* Centre */}
      {showCenter && (
        centerStyle === 'dot' ? (
          <View
            style={[
              styles.abs,
              styles.centerDotBase,
              {
                width: thickness * 3,
                height: thickness * 3,
                borderRadius: (thickness * 3) / 2,
                backgroundColor: color,
                top: container.height / 2 - (thickness * 3) / 2,
                left: container.width / 2 - (thickness * 3) / 2,
              },
            ]}
          />
        ) : (
          <>
            <View
              style={[
                styles.abs,
                styles.centerCrossVerticalBase,
                {
                  width: thickness,
                  backgroundColor: color,
                  top: container.height / 2 - 9,
                  left: container.width / 2 - thickness / 2,
                },
              ]}
            />
            <View
              style={[
                styles.abs,
                styles.centerCrossHorizontalBase,
                {
                  height: thickness,
                  backgroundColor: color,
                  top: container.height / 2 - thickness / 2,
                  left: container.width / 2 - 9,
                },
              ]}
            />
          </>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'black',
  },
  maskTopBase: {
    top: 0,
    left: 0,
    right: 0,
  },
  maskBottomBase: {
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskLeftBase: {
    left: 0,
  },
  maskRightBase: {
    right: 0,
  },
  columnsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  rowsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  diagonal: {
    position: 'absolute',
  },
  abs: {
    position: 'absolute',
  },
  centerDotBase: {
    position: 'absolute',
  },
  centerCrossVerticalBase: {
    position: 'absolute',
    height: 18,
  },
  centerCrossHorizontalBase: {
    position: 'absolute',
    width: 18,
  },
  flexCell: {
    flex: 1,
  },
});

export default GridOverlay;


