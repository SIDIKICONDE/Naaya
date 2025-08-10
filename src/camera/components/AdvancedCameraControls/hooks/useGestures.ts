/**
 * Hook pour la gestion des gestes tactiles avancés
 * Support des gestes multi-touch avec debouncing et seuils
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import type { GestureConfig, GestureType } from '../types';

interface GestureState {
  isTracking: boolean;
  startTime: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  scale: number;
  lastTapTime: number;
  tapCount: number;
}

interface GestureCallbacks {
  onTap?: (point: { x: number; y: number }) => void;
  onDoubleTap?: (point: { x: number; y: number }) => void;
  onLongPress?: (point: { x: number; y: number }) => void;
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number, distance: number) => void;
  onPinch?: (scale: number, velocity: number) => void;
  onGesture?: (type: GestureType, data: any) => void;
}

export const useGestures = (
  callbacks: GestureCallbacks,
  config: GestureConfig = {
    enableSwipeToSwitch: true,
    enablePinchToZoom: true,
    enableDoubleTapPhoto: true,
    enableLongPressSettings: true,
    swipeSensitivity: 0.5,
    pinchSensitivity: 0.1,
  }
) => {
  const gestureState = useRef<GestureState>({
    isTracking: false,
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    scale: 1,
    lastTapTime: 0,
    tapCount: 0,
  });

  const [isGestureActive, setIsGestureActive] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constantes de geste
  const LONG_PRESS_DURATION = 500;
  const DOUBLE_TAP_INTERVAL = 300;
  const SWIPE_THRESHOLD = 50;
  const SWIPE_VELOCITY_THRESHOLD = 0.3;
  const PINCH_THRESHOLD = 0.1;

  // Utilitaires
  const getDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }, []);

  const getDirection = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  }, []);

  // Gestion du début de geste
  const handleGestureStart = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY, timestamp } = event.nativeEvent;
    
    clearTimers();
    setIsGestureActive(true);
    
    gestureState.current = {
      ...gestureState.current,
      isTracking: true,
      startTime: timestamp,
      startPosition: { x: locationX, y: locationY },
      currentPosition: { x: locationX, y: locationY },
      velocity: { x: 0, y: 0 },
    };

    // Démarrer le timer pour long press
    if (config.enableLongPressSettings) {
      longPressTimer.current = setTimeout(() => {
        if (gestureState.current.isTracking) {
          callbacks.onLongPress?.({ x: locationX, y: locationY });
          callbacks.onGesture?.('long-press', { point: { x: locationX, y: locationY } });
        }
      }, LONG_PRESS_DURATION);
    }
  }, [callbacks, config.enableLongPressSettings, clearTimers]);

  // Gestion du mouvement
  const handleGestureMove = useCallback((event: GestureResponderEvent) => {
    if (!gestureState.current.isTracking) return;

    const { locationX, locationY, timestamp } = event.nativeEvent;
    const timeDelta = timestamp - gestureState.current.startTime;
    
    if (timeDelta > 0) {
      const deltaX = locationX - gestureState.current.startPosition.x;
      const deltaY = locationY - gestureState.current.startPosition.y;
      
      gestureState.current.velocity = {
        x: deltaX / timeDelta,
        y: deltaY / timeDelta,
      };
      
      gestureState.current.currentPosition = { x: locationX, y: locationY };
      
      // Annuler long press si mouvement significatif
      const distance = getDistance(gestureState.current.startPosition, gestureState.current.currentPosition);
      if (distance > 10) {
        clearTimers();
      }
    }
  }, [getDistance, clearTimers]);

  // Gestion de la fin de geste
  const handleGestureEnd = useCallback((event: GestureResponderEvent) => {
    if (!gestureState.current.isTracking) return;

    const { locationX, locationY, timestamp } = event.nativeEvent;
    const timeDelta = timestamp - gestureState.current.startTime;
    const distance = getDistance(gestureState.current.startPosition, { x: locationX, y: locationY });
    
    clearTimers();
    setIsGestureActive(false);
    gestureState.current.isTracking = false;

    // Détection du type de geste
    if (timeDelta < LONG_PRESS_DURATION) {
      if (distance < SWIPE_THRESHOLD) {
        // Tap ou double tap
        const now = Date.now();
        const timeSinceLastTap = now - gestureState.current.lastTapTime;
        
        if (config.enableDoubleTapPhoto && timeSinceLastTap < DOUBLE_TAP_INTERVAL && gestureState.current.tapCount === 1) {
          // Double tap
          gestureState.current.tapCount = 0;
          callbacks.onDoubleTap?.({ x: locationX, y: locationY });
          callbacks.onGesture?.('double-tap', { point: { x: locationX, y: locationY } });
        } else {
          // Premier tap, attendre pour voir s'il y en a un second
          gestureState.current.tapCount = 1;
          gestureState.current.lastTapTime = now;
          
          tapTimer.current = setTimeout(() => {
            if (gestureState.current.tapCount === 1) {
              callbacks.onTap?.({ x: locationX, y: locationY });
              callbacks.onGesture?.('tap', { point: { x: locationX, y: locationY } });
            }
            gestureState.current.tapCount = 0;
          }, DOUBLE_TAP_INTERVAL);
        }
      } else if (config.enableSwipeToSwitch) {
        // Swipe
        const velocity = Math.sqrt(
          Math.pow(gestureState.current.velocity.x, 2) + 
          Math.pow(gestureState.current.velocity.y, 2)
        );
        
        if (velocity > SWIPE_VELOCITY_THRESHOLD) {
          const direction = getDirection(gestureState.current.startPosition, { x: locationX, y: locationY });
          callbacks.onSwipe?.(direction, velocity, distance);
          callbacks.onGesture?.('swipe', { direction, velocity, distance });
        }
      }
    }
  }, [callbacks, config.enableDoubleTapPhoto, config.enableSwipeToSwitch, getDistance, getDirection, clearTimers]);

  // Gestion du pinch/zoom (simplifié pour React Native natif)
  const handlePinch = useCallback((scale: number, velocity: number = 0) => {
    if (!config.enablePinchToZoom) return;

    const scaleDelta = Math.abs(scale - gestureState.current.scale);
    
    if (scaleDelta > PINCH_THRESHOLD * config.pinchSensitivity) {
      gestureState.current.scale = scale;
      callbacks.onPinch?.(scale, velocity);
      callbacks.onGesture?.('pinch', { scale, velocity });
    }
  }, [callbacks, config.enablePinchToZoom, config.pinchSensitivity]);

  // Handlers pour React Native
  const gestureHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: handleGestureStart,
    onResponderMove: handleGestureMove,
    onResponderRelease: handleGestureEnd,
    onResponderTerminate: handleGestureEnd,
  };

  // Nettoyage
  const cleanup = useCallback(() => {
    clearTimers();
    setIsGestureActive(false);
    gestureState.current.isTracking = false;
  }, [clearTimers]);

  // Nettoyage automatique au démontage du composant
  useEffect(() => {
    // Retourner la fonction de nettoyage pour éviter les fuites mémoire
    return () => {
      clearTimers();
      gestureState.current.isTracking = false;
    };
  }, []); // Exécuter seulement au démontage

  return {
    gestureHandlers,
    handlePinch,
    isGestureActive,
    cleanup,
    // Helpers pour débugger
    gestureState: gestureState.current,
  };
};
