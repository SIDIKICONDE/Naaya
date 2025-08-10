/**
 * Slider de fréquence moderne avec animations fluides
 * Design futuriste avec gradients et effets visuels
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    Vibration,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
    Extrapolate,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring
} from 'react-native-reanimated';
import { EQUALISER_LIMITS } from '../constants';
import { EqualiserBand, EqualiserTheme } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_HEIGHT = 280;
const SLIDER_WIDTH = 60;
const KNOB_SIZE = 24;

interface ModernFrequencySliderProps {
  band: EqualiserBand;
  onChange: (value: number) => void;
  theme: EqualiserTheme;
  index: number;
  totalBands: number;
  isSoloed?: boolean;
  onSolo?: () => void;
  animated?: boolean;
}

export const ModernFrequencySlider = memo<ModernFrequencySliderProps>(({
  band,
  onChange,
  theme,
  index,
  totalBands,
  isSoloed = false,
  onSolo,
  animated = true,
}) => {
  // Valeurs animées
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const isActive = useSharedValue(false);
  const currentValue = useSharedValue(band.gain);
  const targetValue = useSharedValue(band.gain);

  // Animation d'entrée échelonnée
  useEffect(() => {
    if (animated) {
      opacity.value = withDelay(
        index * 50,
        withSpring(1, { damping: 15, stiffness: 100 })
      );
      scale.value = withDelay(
        index * 50,
        withSequence(
          withSpring(1.1, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 15, stiffness: 150 })
        )
      );
    } else {
      opacity.value = 1;
      scale.value = 1;
    }
  }, [animated, index]);

  // Mise à jour de la valeur quand le band change
  useEffect(() => {
    targetValue.value = band.gain;
    currentValue.value = withSpring(band.gain, {
      damping: 20,
      stiffness: 100,
    });
  }, [band.gain]);

  // Fonction de vibration
  const triggerHaptic = useCallback(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Vibration.vibrate(10);
    }
  }, []);

  // Conversion position <-> valeur
  const positionToValue = useCallback((position: number): number => {
    const ratio = 1 - (position + SLIDER_HEIGHT / 2) / SLIDER_HEIGHT;
    return interpolate(
      ratio,
      [0, 1],
      [EQUALISER_LIMITS.minGain, EQUALISER_LIMITS.maxGain],
      Extrapolate.CLAMP
    );
  }, []);

  const valueToPosition = useCallback((value: number): number => {
    const ratio = (value - EQUALISER_LIMITS.minGain) / 
                  (EQUALISER_LIMITS.maxGain - EQUALISER_LIMITS.minGain);
    return -(ratio * SLIDER_HEIGHT - SLIDER_HEIGHT / 2);
  }, []);

  // Gestionnaire de geste vertical
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isActive.value = true;
      scale.value = withSpring(1.1);
      glowIntensity.value = withSpring(1);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      'worklet';
      const newPosition = Math.max(
        -SLIDER_HEIGHT / 2,
        Math.min(SLIDER_HEIGHT / 2, event.translationY)
      );
      translateY.value = newPosition;
      
      const newValue = positionToValue(newPosition);
      targetValue.value = newValue;
      currentValue.value = newValue;
      
      // Vibration à chaque changement de dB entier
      const roundedValue = Math.round(newValue);
      const previousRounded = Math.round(band.gain);
      if (roundedValue !== previousRounded) {
        runOnJS(triggerHaptic)();
      }
      
      runOnJS(onChange)(newValue);
    })
    .onEnd(() => {
      'worklet';
      isActive.value = false;
      scale.value = withSpring(1);
      glowIntensity.value = withSpring(0);
      
      // Snap to zero if close
      if (Math.abs(targetValue.value) < 0.5) {
        targetValue.value = 0;
        currentValue.value = withSpring(0);
        translateY.value = withSpring(valueToPosition(0));
        runOnJS(onChange)(0);
        runOnJS(triggerHaptic)();
      }
    });

  // Double tap pour reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      'worklet';
      targetValue.value = 0;
      currentValue.value = withSpring(0);
      translateY.value = withSpring(valueToPosition(0));
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
      runOnJS(onChange)(0);
      runOnJS(triggerHaptic)();
    });

  // Long press pour solo
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      if (onSolo) {
        runOnJS(onSolo)();
        runOnJS(triggerHaptic)();
      }
    });

  // Composition des gestes
  const composedGesture = Gesture.Race(
    panGesture,
    doubleTapGesture,
    longPressGesture
  );

  // Position initiale du slider
  useEffect(() => {
    translateY.value = valueToPosition(band.gain);
  }, []);

  // Styles animés
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: interpolate(
        opacity.value,
        [0, 1],
        [20, 0],
        Extrapolate.CLAMP
      )},
    ],
  }));

  const sliderTrackAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      currentValue.value,
      [EQUALISER_LIMITS.minGain, 0, EQUALISER_LIMITS.maxGain],
      [theme.danger, theme.primary, theme.success]
    );
    
    return {
      backgroundColor: isActive.value ? color : theme.border,
    };
  });

  const knobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: interpolate(
        glowIntensity.value,
        [0, 1],
        [1, 1.2],
        Extrapolate.CLAMP
      )},
    ],
    shadowOpacity: interpolate(
      glowIntensity.value,
      [0, 1],
      [0.2, 0.8],
      Extrapolate.CLAMP
    ),
    shadowRadius: interpolate(
      glowIntensity.value,
      [0, 1],
      [5, 20],
      Extrapolate.CLAMP
    ),
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => {
    const height = Math.abs(translateY.value);
    const bottom = translateY.value > 0 ? '50%' : undefined;
    const top = translateY.value <= 0 ? '50%' : undefined;
    
    return {
      height,
      bottom,
      top,
      opacity: interpolate(
        Math.abs(currentValue.value),
        [0, EQUALISER_LIMITS.maxGain],
        [0.3, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  const valueTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      glowIntensity.value,
      [0, 1],
      [0.7, 1],
      Extrapolate.CLAMP
    ),
    transform: [
      { scale: interpolate(
        glowIntensity.value,
        [0, 1],
        [1, 1.1],
        Extrapolate.CLAMP
      )},
    ],
  }));

  // Valeur dérivée pour l'affichage
  const displayValue = useDerivedValue(() => {
    return `${currentValue.value >= 0 ? '+' : ''}${currentValue.value.toFixed(1)}`;
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Label de fréquence */}
      <View style={styles.labelContainer}>
        <Text style={[styles.frequencyLabel, { color: theme.text }]}>
          {band.label}
        </Text>
        {isSoloed && (
          <View style={[styles.soloIndicator, { backgroundColor: theme.warning }]} />
        )}
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        {/* Track de fond */}
        <Animated.View style={[styles.sliderTrack, sliderTrackAnimatedStyle]} />
        
        {/* Remplissage du slider */}
        <Animated.View style={[styles.sliderFill, fillAnimatedStyle]}>
          <LinearGradient
            colors={currentValue.value >= 0 
              ? [theme.primary, theme.success]
              : [theme.danger, theme.warning]
            }
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>

        {/* Ligne centrale (0 dB) */}
        <View style={[styles.centerLine, { backgroundColor: theme.textSecondary }]} />

        {/* Graduations */}
        {[-12, -6, 0, 6, 12].map((value) => (
          <View
            key={value}
            style={[
              styles.tick,
              { 
                bottom: ((value - EQUALISER_LIMITS.minGain) / 
                         (EQUALISER_LIMITS.maxGain - EQUALISER_LIMITS.minGain)) * 
                         SLIDER_HEIGHT,
                backgroundColor: theme.grid,
              }
            ]}
          />
        ))}

        {/* Knob interactif */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.knob, knobAnimatedStyle]}>
            <LinearGradient
              colors={theme.gradients.primary}
              style={styles.knobGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.knobInner, { backgroundColor: theme.surface }]} />
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Valeur actuelle */}
      <Animated.View style={[styles.valueContainer, valueTextAnimatedStyle]}>
        <Animated.Text style={[styles.valueText, { color: theme.text }]}>
          {displayValue}
        </Animated.Text>
        <Text style={[styles.unitText, { color: theme.textSecondary }]}>
          dB
        </Text>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    minWidth: SLIDER_WIDTH,
  },
  labelContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  frequencyLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  soloIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    width: 4,
    height: SLIDER_HEIGHT,
    borderRadius: 2,
    opacity: 0.3,
  },
  sliderFill: {
    position: 'absolute',
    width: 6,
    borderRadius: 3,
  },
  centerLine: {
    position: 'absolute',
    width: SLIDER_WIDTH - 20,
    height: 1,
    opacity: 0.3,
  },
  tick: {
    position: 'absolute',
    width: 10,
    height: 1,
    opacity: 0.2,
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  knobGradient: {
    flex: 1,
    borderRadius: KNOB_SIZE / 2,
    padding: 2,
  },
  knobInner: {
    flex: 1,
    borderRadius: (KNOB_SIZE - 4) / 2,
  },
  valueContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
