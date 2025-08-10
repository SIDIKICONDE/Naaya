/**
 * Hook pour la gestion avancée des gestes et prévention des conflits
 * Utilise React Native Gesture Handler et Reanimated pour des performances optimales
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import {
  Gesture,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
  PinchGestureHandlerEventPayload,
  RotationGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { GESTURE_CONFIG } from '../constants';
import { TouchGesture } from '../types';

interface UseGestureHandlerOptions {
  enableHaptic?: boolean;
  enableMultiTouch?: boolean;
  conflictResolution?: 'priority' | 'cancel' | 'merge';
  gestureDebounce?: number;
  animationPriority?: 'gesture' | 'animation' | 'balanced';
}

interface GestureState {
  isActive: boolean;
  type: TouchGesture['type'] | null;
  touchCount: number;
  conflictDetected: boolean;
  priority: number;
}

interface AnimationState {
  isAnimating: boolean;
  canInterrupt: boolean;
  priority: number;
  queue: Array<() => void>;
}

export const useGestureHandler = (options: UseGestureHandlerOptions = {}) => {
  const {
    enableHaptic = true,
    enableMultiTouch = true,
    conflictResolution = 'priority',
    gestureDebounce = 50,
    animationPriority = 'balanced',
  } = options;

  // État des gestes
  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    type: null,
    touchCount: 0,
    conflictDetected: false,
    priority: 0,
  });

  // État des animations
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    canInterrupt: true,
    priority: 0,
    queue: [],
  });

  // Valeurs animées partagées
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Références pour le debouncing et la gestion des conflits
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGestureTime = useRef<number>(0);
  const activeGestures = useRef<Set<string>>(new Set());
  const animationQueue = useRef<Array<() => void>>([]);

  // Fonction de vibration conditionnelle
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptic) return;

    if (Platform.OS === 'ios') {
      // iOS utilise une API différente pour le haptic feedback
      // Ici on utilise Vibration comme fallback
      const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
      Vibration.vibrate(duration);
    } else {
      // Android
      const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 40;
      Vibration.vibrate(duration);
    }
  }, [enableHaptic]);

  // Détection et résolution des conflits
  const detectConflict = useCallback((_gesture: string): boolean => {
    const now = Date.now();
    const timeSinceLastGesture = now - lastGestureTime.current;

    // Vérifier si un geste est trop proche du précédent
    if (timeSinceLastGesture < gestureDebounce) {
      return true;
    }

    // Vérifier si une animation non-interruptible est en cours
    if (animationState.isAnimating && !animationState.canInterrupt) {
      return true;
    }

    // Vérifier les conflits avec les gestes actifs
    if (activeGestures.current.size > 0 && !enableMultiTouch) {
      return true;
    }

    return false;
  }, [gestureDebounce, animationState, enableMultiTouch]);

  // Résolution des conflits
  const resolveConflict = useCallback((gesture: string, priority: number): boolean => {
    switch (conflictResolution) {
      case 'priority':
        // Le geste avec la priorité la plus élevée gagne
        if (priority > gestureState.priority) {
          // Annuler les animations en cours si nécessaire
          if (animationPriority === 'gesture') {
            cancelAnimation(translateX);
            cancelAnimation(translateY);
            cancelAnimation(scale);
            cancelAnimation(rotation);
          }
          return true;
        }
        return false;

      case 'cancel':
        // Annuler le nouveau geste si conflit
        return false;

      case 'merge':
        // Fusionner les gestes (multi-touch)
        return enableMultiTouch;

      default:
        return false;
    }
  }, [conflictResolution, gestureState.priority, animationPriority, enableMultiTouch, translateX, translateY, scale, rotation]);

  // Gestionnaire de pan (glissement)
  const panGesture = Gesture.Pan()
    .enabled(true)
    .onStart((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      if (detectConflict('pan')) {
        if (!resolveConflict('pan', 1)) {
          return;
        }
      }
      runOnJS(triggerHaptic)('light');
      runOnJS(setGestureState)({
        isActive: true,
        type: 'drag',
        touchCount: event.numberOfPointers,
        conflictDetected: false,
        priority: 1,
      });
    })
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      translateX.value = withSpring(event.translationX, GESTURE_CONFIG.springConfig);
      translateY.value = withSpring(event.translationY, GESTURE_CONFIG.springConfig);
    })
    .onEnd(() => {
      'worklet';
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(setGestureState)((prev) => ({ ...prev, isActive: false }));
    });

  // Gestionnaire de pincement (zoom)
  const pinchGesture = Gesture.Pinch()
    .enabled(enableMultiTouch)
    .onStart(() => {
      'worklet';
      if (detectConflict('pinch')) {
        if (!resolveConflict('pinch', 2)) {
          return;
        }
      }
      runOnJS(triggerHaptic)('medium');
      runOnJS(setGestureState)({
        isActive: true,
        type: 'pinch',
        touchCount: 2,
        conflictDetected: false,
        priority: 2,
      });
    })
    .onUpdate((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      'worklet';
      scale.value = withSpring(event.scale, GESTURE_CONFIG.springConfig);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1);
      runOnJS(setGestureState)((prev) => ({ ...prev, isActive: false }));
    });

  // Gestionnaire de rotation
  const rotationGesture = Gesture.Rotation()
    .enabled(enableMultiTouch)
    .onStart(() => {
      'worklet';
      if (detectConflict('rotation')) {
        if (!resolveConflict('rotation', 2)) {
          return;
        }
      }
      runOnJS(triggerHaptic)('medium');
      runOnJS(setGestureState)({
        isActive: true,
        type: 'rotate',
        touchCount: 2,
        conflictDetected: false,
        priority: 2,
      });
    })
    .onUpdate((event: GestureUpdateEvent<RotationGestureHandlerEventPayload>) => {
      'worklet';
      rotation.value = withSpring(event.rotation, GESTURE_CONFIG.springConfig);
    })
    .onEnd(() => {
      'worklet';
      rotation.value = withSpring(0);
      runOnJS(setGestureState)((prev) => ({ ...prev, isActive: false }));
    });

  // Gestionnaire de tap
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      'worklet';
      runOnJS(triggerHaptic)('light');
      opacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    });

  // Gestionnaire de double tap
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      'worklet';
      runOnJS(triggerHaptic)('heavy');
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
    });

  // Gestionnaire de pression longue
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      runOnJS(triggerHaptic)('heavy');
      runOnJS(setGestureState)({
        isActive: true,
        type: 'longPress',
        touchCount: 1,
        conflictDetected: false,
        priority: 3,
      });
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1);
      runOnJS(setGestureState)((prev) => ({ ...prev, isActive: false }));
    });

  // Composition des gestes avec gestion des priorités
  const composedGesture = Gesture.Race(
    Gesture.Simultaneous(
      enableMultiTouch ? pinchGesture : Gesture.Manual(),
      enableMultiTouch ? rotationGesture : Gesture.Manual(),
      panGesture
    ),
    doubleTapGesture,
    tapGesture,
    longPressGesture
  );

  // Style animé
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}rad` },
      ] as any,
      opacity: opacity.value,
    };
  });

  // Fonction pour démarrer une animation avec gestion des conflits
  const startAnimation = useCallback((
    animation: () => void,
    animationOptions: { 
      interruptible?: boolean; 
      priority?: number;
      queued?: boolean;
    } = {}
  ) => {
    const { interruptible = true, priority = 0, queued = false } = animationOptions;

    // Vérifier les conflits avec les gestes actifs
    if (gestureState.isActive && animationPriority === 'gesture') {
      if (queued) {
        animationQueue.current.push(animation);
      }
      return false;
    }

    // Vérifier les conflits avec d'autres animations
    if (animationState.isAnimating && !animationState.canInterrupt) {
      if (priority <= animationState.priority) {
        if (queued) {
          animationQueue.current.push(animation);
        }
        return false;
      }
    }

    // Démarrer l'animation
    setAnimationState({
      isAnimating: true,
      canInterrupt: interruptible,
      priority,
      queue: animationQueue.current,
    });

    animation();
    return true;
  }, [gestureState.isActive, animationState, animationPriority]);

  // Fonction pour arrêter toutes les animations
  const stopAllAnimations = useCallback(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotation);
    cancelAnimation(opacity);
    
    setAnimationState({
      isAnimating: false,
      canInterrupt: true,
      priority: 0,
      queue: [],
    });
    
    animationQueue.current = [];
  }, [translateX, translateY, scale, rotation, opacity]);

  // Fonction pour réinitialiser les valeurs
  const resetValues = useCallback((animated = true) => {
    if (animated) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      rotation.value = withSpring(0);
      opacity.value = withSpring(1);
    } else {
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      rotation.value = 0;
      opacity.value = 1;
    }
  }, [translateX, translateY, scale, rotation, opacity]);

  // Traiter la queue d'animations quand les gestes sont terminés
  useEffect(() => {
    if (!gestureState.isActive && animationQueue.current.length > 0) {
      const nextAnimation = animationQueue.current.shift();
      if (nextAnimation) {
        nextAnimation();
      }
    }
  }, [gestureState.isActive]);

  // Nettoyage
  useEffect(() => {
    const timeoutId = gestureTimeoutRef.current;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stopAllAnimations();
    };
  }, [stopAllAnimations]);

  return {
    // Gestes
    gesture: composedGesture,
    gestureState,
    
    // Valeurs animées
    animatedValues: {
      translateX,
      translateY,
      scale,
      rotation,
      opacity,
    },
    
    // Style animé
    animatedStyle,
    
    // Fonctions utilitaires
    startAnimation,
    stopAllAnimations,
    resetValues,
    triggerHaptic,
    
    // État
    isGestureActive: gestureState.isActive,
    isAnimating: animationState.isAnimating,
    hasConflict: gestureState.conflictDetected,
  };
};
