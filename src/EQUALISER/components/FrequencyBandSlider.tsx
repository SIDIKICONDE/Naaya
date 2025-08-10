/**
 * Composant slider vertical pour une bande de fréquence
 * Design professionnel avec animations fluides
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { EQUALISER_LIMITS } from '../constants';
import { EqualiserBand, EqualiserTheme } from '../types';

interface FrequencyBandSliderProps {
  band: EqualiserBand;
  magnitude: number;
  onGainChange: (bandId: string, gain: number) => void;
  onSolo?: () => void;
  isSoloed?: boolean;
  disabled?: boolean;
  theme: EqualiserTheme;
}

const SLIDER_HEIGHT = 200;
const TRACK_WIDTH = 6;
const KNOB_SIZE = 28;
const TOUCH_AREA = 44;

export const FrequencyBandSlider: React.FC<FrequencyBandSliderProps> = ({
  band,
  magnitude,
  onGainChange,
  onSolo,
  isSoloed = false,
  disabled = false,
  theme,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedGlow = useRef(new Animated.Value(0)).current;
  const animatedMagnitude = useRef(new Animated.Value(0)).current;
  const doubleTapRef = useRef<number | null>(null);
  const initialGainRef = useRef(band.gain);

  // Position normalisée du knob (0 = bas, 1 = haut)
  const normalizedPosition = (band.gain - EQUALISER_LIMITS.MIN_GAIN) / 
    (EQUALISER_LIMITS.MAX_GAIN - EQUALISER_LIMITS.MIN_GAIN);
  const knobTop = (1 - normalizedPosition) * (SLIDER_HEIGHT - KNOB_SIZE);

  // Animation du spectre
  React.useEffect(() => {
    Animated.timing(animatedMagnitude, {
      toValue: magnitude,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [magnitude, animatedMagnitude]);

  // Couleur selon le gain
  const getGainColor = useCallback((gain: number) => {
    if (Math.abs(gain) < 0.5) return theme.textSecondary;
    if (gain > 12) return theme.danger;
    if (gain > 6) return theme.warning;
    if (gain > 0) return theme.primary;
    return theme.secondary;
  }, [theme]);

  // Double tap pour reset
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (doubleTapRef.current && now - doubleTapRef.current < 300) {
      // Double tap détecté
      onGainChange(band.id, 0);
      Vibration.vibrate(10);
      
      // Animation de reset
      Animated.sequence([
        Animated.timing(animatedScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(animatedScale, {
          toValue: 1,
          stiffness: 300,
          damping: 15,
          useNativeDriver: true,
        }),
      ]).start();
    }
    doubleTapRef.current = now;
  }, [band.id, onGainChange, animatedScale]);

  // PanResponder pour le drag
  const panResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      
      onPanResponderGrant: () => {
        setIsDragging(true);
        initialGainRef.current = band.gain;
        
        // Animations
        Animated.parallel([
          Animated.spring(animatedScale, {
            toValue: 1.1,
            stiffness: 300,
            damping: 15,
            useNativeDriver: true,
          }),
          Animated.timing(animatedGlow, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start();
        
        if (Platform.OS === 'ios') {
          Vibration.vibrate(10);
        }
      },
      
      onPanResponderMove: (_, gestureState) => {
        const initialNormalizedPosition = 
          (initialGainRef.current - EQUALISER_LIMITS.MIN_GAIN) / 
          (EQUALISER_LIMITS.MAX_GAIN - EQUALISER_LIMITS.MIN_GAIN);
        const initialKnobTop = (1 - initialNormalizedPosition) * (SLIDER_HEIGHT - KNOB_SIZE);
        
        const newTop = Math.max(0, Math.min(
          SLIDER_HEIGHT - KNOB_SIZE, 
          initialKnobTop + gestureState.dy
        ));
        const newNormalizedPosition = 1 - (newTop / (SLIDER_HEIGHT - KNOB_SIZE));
        const newGain = newNormalizedPosition * 
          (EQUALISER_LIMITS.MAX_GAIN - EQUALISER_LIMITS.MIN_GAIN) + 
          EQUALISER_LIMITS.MIN_GAIN;
        
        // Snap à 0 si proche
        const snappedGain = Math.abs(newGain) < 0.5 ? 0 : Math.round(newGain * 10) / 10;
        onGainChange(band.id, snappedGain);
      },
      
      onPanResponderRelease: () => {
        setIsDragging(false);
        
        Animated.parallel([
          Animated.spring(animatedScale, {
            toValue: 1,
            stiffness: 300,
            damping: 15,
            useNativeDriver: true,
          }),
          Animated.timing(animatedGlow, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      },
    }),
    [disabled, band.gain, band.id, onGainChange, animatedScale, animatedGlow]
  );

  const trackFillHeight = normalizedPosition * SLIDER_HEIGHT;
  const spectrumHeight = magnitude * SLIDER_HEIGHT * 0.8;
  const gainColor = getGainColor(band.gain);

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.containerDisabled]}
      onPress={handleDoubleTap}
      activeOpacity={1}
    >
      {/* Label de fréquence */}
      <Text style={[styles.frequencyLabel, { color: theme.textSecondary }]}>
        {band.label}
      </Text>

      {/* Zone du slider */}
      <View style={styles.sliderContainer}>
        {/* Track de fond */}
        <View style={[styles.track, { backgroundColor: theme.border }]} />

        {/* Visualisation du spectre */}
        <Animated.View
          style={[
            styles.spectrumBar,
            {
              backgroundColor: band.color || theme.primary,
              height: animatedMagnitude.interpolate({
                inputRange: [0, 1],
                outputRange: [2, spectrumHeight],
              }),
              opacity: animatedMagnitude.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.5],
              }),
            },
          ]}
        />

        {/* Fill du track */}
        <View
          style={[
            styles.trackFill,
            {
              height: Math.max(2, trackFillHeight),
              backgroundColor: isSoloed ? theme.warning : gainColor,
            },
          ]}
        />

        {/* Ligne de référence 0 dB */}
        <View
          style={[
            styles.zeroLine,
            {
              backgroundColor: theme.text,
              top: (1 - (-EQUALISER_LIMITS.MIN_GAIN) / 
                (EQUALISER_LIMITS.MAX_GAIN - EQUALISER_LIMITS.MIN_GAIN)) * SLIDER_HEIGHT,
            },
          ]}
        />

        {/* Knob */}
        <Animated.View
          style={[
            styles.knobContainer,
            {
              top: knobTop - (TOUCH_AREA - KNOB_SIZE) / 2,
              transform: [{ scale: animatedScale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.knobGlow,
              {
                backgroundColor: gainColor,
                opacity: animatedGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          />

          {/* Knob visuel */}
          <View
            style={[
              styles.knob,
              {
                backgroundColor: isDragging ? gainColor : theme.surface,
                borderColor: isSoloed ? theme.warning : gainColor,
              },
              isSoloed ? styles.knobSoloed : styles.knobNormal,
            ]}
          >
            <Text style={[
              styles.knobText,
              isDragging ? styles.knobTextDragging : { color: theme.text }
            ]}>
              {band.gain === 0 ? '0' : band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Valeur du gain */}
      <Text style={[
        styles.gainValue,
        { color: band.gain === 0 ? theme.textSecondary : gainColor }
      ]}>
        {band.gain.toFixed(1)} dB
      </Text>

      {/* Bouton Solo */}
      {onSolo && (
        <TouchableOpacity
          style={[
            styles.soloButton,
            {
              backgroundColor: isSoloed ? theme.warning : theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={onSolo}
          disabled={disabled}
        >
          <Text style={[
            styles.soloButtonText,
            isSoloed ? styles.soloButtonTextActive : { color: theme.textSecondary }
          ]}>
            S
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 70,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  frequencyLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  sliderContainer: {
    width: TOUCH_AREA,
    height: SLIDER_HEIGHT,
    alignItems: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: (TOUCH_AREA - TRACK_WIDTH) / 2,
    top: 0,
    width: TRACK_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: TRACK_WIDTH / 2,
  },
  trackFill: {
    position: 'absolute',
    left: (TOUCH_AREA - TRACK_WIDTH) / 2,
    bottom: 0,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
    minHeight: 2,
  },
  zeroLine: {
    position: 'absolute',
    left: (TOUCH_AREA - TRACK_WIDTH) / 2 - 8,
    width: TRACK_WIDTH + 16,
    height: 1,
    opacity: 0.3,
  },
  spectrumBar: {
    position: 'absolute',
    left: (TOUCH_AREA - 20) / 2,
    bottom: 0,
    width: 20,
    borderRadius: 2,
    minHeight: 2,
  },
  knobContainer: {
    position: 'absolute',
    width: TOUCH_AREA,
    height: TOUCH_AREA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobGlow: {
    position: 'absolute',
    width: KNOB_SIZE + 16,
    height: KNOB_SIZE + 16,
    borderRadius: (KNOB_SIZE + 16) / 2,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  knobText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  knobTextDragging: {
    color: '#FFFFFF',
  },
  gainValue: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  soloButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  soloButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  soloButtonTextActive: {
    color: '#FFFFFF',
  },
  knobNormal: {
    borderWidth: 2,
  },
  knobSoloed: {
    borderWidth: 3,
  },
});
