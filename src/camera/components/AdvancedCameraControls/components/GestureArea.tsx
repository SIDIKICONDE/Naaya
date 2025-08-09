/**
 * Zone de gestes tactiles pour l'interface caméra
 * Capture et traite les gestes utilisateur (tap, swipe, pinch)
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useGestures } from '../hooks/useGestures';
import type { GestureAreaProps, GestureConfig } from '../types';

interface GestureAreaInternalProps extends GestureAreaProps {
  gestureConfig?: GestureConfig;
}

export const GestureArea = memo<GestureAreaInternalProps>(({
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipe,
  onPinch,
  disabled = false,
  gestureConfig = {
    enableSwipeToSwitch: true,
    enablePinchToZoom: true,
    enableDoubleTapPhoto: true,
    enableLongPressSettings: true,
    swipeSensitivity: 0.5,
    pinchSensitivity: 0.1,
  },
  children,
  style,
}) => {
  // Callbacks de gestes
  const gestureCallbacks = useMemo(() => ({
    onTap: (point: { x: number; y: number }) => {
      if (!disabled && onTap) {
        onTap(point);
      }
    },

    onDoubleTap: (point: { x: number; y: number }) => {
      if (!disabled && onDoubleTap) {
        onDoubleTap(point);
      }
    },

    onLongPress: (point: { x: number; y: number }) => {
      if (!disabled && onLongPress) {
        onLongPress(point);
      }
    },

    onSwipe: (direction: 'up' | 'down' | 'left' | 'right', velocity: number, _distance: number) => {
      if (!disabled && onSwipe) {
        onSwipe(direction, velocity);
      }
    },

    onPinch: (scale: number, _velocity: number) => {
      if (!disabled && onPinch) {
        onPinch(scale, _velocity);
      }
    },
  }), [disabled, onTap, onDoubleTap, onLongPress, onSwipe, onPinch]);

  const { gestureHandlers, isGestureActive } = useGestures(gestureCallbacks, gestureConfig);

  if (disabled) {
    return (
      <View style={[styles.container, style]} pointerEvents="box-none">
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isGestureActive && styles.gestureActive,
        style,
      ]}
      {...gestureHandlers}
    >
      {children}
    </View>
  );
});

GestureArea.displayName = 'GestureArea';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureActive: {
    // Indicateur visuel optionnel pendant les gestes
  },
});
