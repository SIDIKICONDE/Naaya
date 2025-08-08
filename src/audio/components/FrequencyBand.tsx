/**
 * Composant modulaire pour une bande de fréquence
 * Design moderne avec animations fluides
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { THEME_COLORS } from '../constants';

interface FrequencyBandProps {
  id: string;
  frequency: number;
  gain: number;
  minGain: number;
  maxGain: number;
  label: string;
  magnitude?: number;
  onGainChange: (bandId: string, gain: number) => void;
  disabled?: boolean;
}

const SLIDER_HEIGHT = 200;
const KNOB_SIZE = 32;
const TRACK_WIDTH = 4;

export const FrequencyBand: React.FC<FrequencyBandProps> = ({
  id,
  gain,
  minGain,
  maxGain,
  label,
  magnitude = 0,
  onGainChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const animatedGain = useRef(new Animated.Value(gain)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedMagnitude = useRef(new Animated.Value(0)).current;

  // Animation du spectre
  React.useEffect(() => {
    Animated.timing(animatedMagnitude, {
      toValue: magnitude,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [magnitude, animatedMagnitude]);

  // Animation du gain
  React.useEffect(() => {
    Animated.spring(animatedGain, {
      toValue: gain,
      stiffness: 100,
      damping: 15,
      useNativeDriver: false,
    }).start();
  }, [gain, animatedGain]);

  // Calcul de la position du curseur
  const knobPosition = useMemo(() => {
    const range = maxGain - minGain;
    const normalized = (gain - minGain) / range;
    return (1 - normalized) * SLIDER_HEIGHT;
  }, [gain, minGain, maxGain]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      
      onPanResponderGrant: () => {
        setIsDragging(true);
        
        // Animation de pression
        Animated.spring(animatedScale, {
          toValue: 1.2,
          stiffness: 300,
          damping: 10,
          useNativeDriver: true,
        }).start();
        
        // Vibration haptique
        if (Platform.OS === 'ios') {
          Vibration.vibrate(1);
        }
      },
      
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(0, Math.min(SLIDER_HEIGHT, knobPosition + gestureState.dy));
        const range = maxGain - minGain;
        const normalized = 1 - (newPosition / SLIDER_HEIGHT);
        const newGain = normalized * range + minGain;
        
        onGainChange(id, newGain);
      },
      
      onPanResponderRelease: () => {
        setIsDragging(false);
        
        // Animation de relâchement
        Animated.spring(animatedScale, {
          toValue: 1,
          stiffness: 300,
          damping: 10,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const getGainColor = useCallback((gainValue: number) => {
    if (gainValue > 6) return THEME_COLORS.danger;
    if (gainValue > 3) return THEME_COLORS.warning;
    if (gainValue < -3) return THEME_COLORS.secondary;
    return THEME_COLORS.primary;
  }, []);

  const trackFillHeight = animatedGain.interpolate({
    inputRange: [minGain, maxGain],
    outputRange: [0, SLIDER_HEIGHT],
  });

  const magnitudeHeight = animatedMagnitude.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_HEIGHT * 0.8],
  });

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        {/* Visualisation du spectre */}
        <Animated.View
          style={[
            styles.spectrumBar,
            {
              height: magnitudeHeight,
              opacity: animatedMagnitude.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.6],
              }),
            },
          ]}
        />
        
        {/* Piste du slider */}
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                height: trackFillHeight,
                backgroundColor: getGainColor(gain),
              },
            ]}
          />
        </View>
        
        {/* Ligne zéro */}
        <View style={styles.zeroLine} />
        
        {/* Curseur */}
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [
                { translateY: knobPosition - KNOB_SIZE / 2 },
                { scale: animatedScale },
              ],
              backgroundColor: isDragging ? THEME_COLORS.primary : THEME_COLORS.surface,
              borderColor: getGainColor(gain),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.knobText}>{gain.toFixed(1)}</Text>
        </Animated.View>
      </View>
      
      {/* Label de fréquence */}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
      
      {/* Valeur du gain */}
      <Text style={[styles.gainValue, { color: getGainColor(gain) }]}>
        {gain > 0 ? '+' : ''}{gain.toFixed(1)} dB
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sliderContainer: {
    height: SLIDER_HEIGHT,
    width: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  track: {
    position: 'absolute',
    width: TRACK_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: THEME_COLORS.border,
    borderRadius: TRACK_WIDTH / 2,
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    bottom: 0,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
  },
  zeroLine: {
    position: 'absolute',
    top: SLIDER_HEIGHT / 2,
    left: -10,
    right: -10,
    height: 1,
    backgroundColor: THEME_COLORS.textSecondary,
    opacity: 0.3,
  },
  spectrumBar: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    backgroundColor: THEME_COLORS.primary,
    borderRadius: 4,
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  knobText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME_COLORS.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
    marginBottom: 4,
  },
  labelDisabled: {
    opacity: 0.5,
  },
  gainValue: {
    fontSize: 11,
    fontWeight: '600',
  },
});