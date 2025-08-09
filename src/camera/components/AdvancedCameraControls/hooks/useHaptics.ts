/**
 * Hook pour la gestion du feedback haptique
 * Fournit des vibrations contextuelles pour améliorer l'UX
 */

import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticConfig {
  enabled: boolean;
  intensity: number;
}

export const useHaptics = (config: HapticConfig = { enabled: true, intensity: 1 }) => {
  const lastHapticTime = useRef<number>(0);
  const minInterval = 50; // Minimum entre deux vibrations (ms)

  const triggerHaptic = useCallback((pattern: HapticPattern = 'light') => {
    if (!config.enabled) return;
    
    const now = Date.now();
    if (now - lastHapticTime.current < minInterval) return;
    
    lastHapticTime.current = now;

    if (Platform.OS === 'ios') {
      // iOS - Utilise l'API Taptic Engine
      const { HapticFeedback } = require('react-native');
      
      switch (pattern) {
        case 'light':
          HapticFeedback?.impact?.(HapticFeedback.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          HapticFeedback?.impact?.(HapticFeedback.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          HapticFeedback?.impact?.(HapticFeedback.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          HapticFeedback?.notification?.(HapticFeedback.NotificationFeedbackType.Success);
          break;
        case 'warning':
          HapticFeedback?.notification?.(HapticFeedback.NotificationFeedbackType.Warning);
          break;
        case 'error':
          HapticFeedback?.notification?.(HapticFeedback.NotificationFeedbackType.Error);
          break;
        case 'selection':
          HapticFeedback?.selection?.();
          break;
      }
    } else if (Platform.OS === 'android') {
      // Android - Vibration standard
      const { Vibration } = require('react-native');
      
      const patterns = {
        light: [0, 20],
        medium: [0, 40],
        heavy: [0, 80],
        success: [0, 40, 60, 40],
        warning: [0, 60, 40, 60],
        error: [0, 100, 50, 100, 50, 100],
        selection: [0, 10],
      };
      
      const patternArray = patterns[pattern] || patterns.light;
      const scaledPattern = patternArray.map(duration => 
        duration === 0 ? 0 : Math.round(duration * config.intensity)
      );
      
      Vibration?.vibrate?.(scaledPattern);
    }
  }, [config.enabled, config.intensity]);

  // Haptics contextuels pour les actions caméra
  const haptics = {
    // Actions principales
    capture: () => triggerHaptic('medium'),
    startRecord: () => triggerHaptic('heavy'),
    stopRecord: () => triggerHaptic('success'),
    pauseRecord: () => triggerHaptic('medium'),
    
    // Navigation et sélection
    switchMode: () => triggerHaptic('light'),
    selectOption: () => triggerHaptic('selection'),
    openPanel: () => triggerHaptic('light'),
    closePanel: () => triggerHaptic('light'),
    
    // Ajustements
    zoom: () => triggerHaptic('light'),
    focus: () => triggerHaptic('light'),
    exposure: () => triggerHaptic('light'),
    
    // Statuts
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    
    // Gestes
    swipe: () => triggerHaptic('light'),
    pinch: () => triggerHaptic('light'),
    longPress: () => triggerHaptic('medium'),
    doubleTap: () => triggerHaptic('light'),
  };

  return {
    triggerHaptic,
    haptics,
    isEnabled: config.enabled,
  };
};
