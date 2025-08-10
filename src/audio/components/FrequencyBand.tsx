/**
 * Composant modernisé pour une bande de fréquence
 * Design épuré avec slider vertical professionnel
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  Vibration,
  View,
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

const CONTAINER_HEIGHT = 180;
const SLIDER_HEIGHT = 130;
const TRACK_WIDTH = 5;
const KNOB_SIZE = 24;
const CONTAINER_WIDTH = 65;

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
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedGlow = useRef(new Animated.Value(0)).current;
  const initialGainRef = useRef(gain);

  // Calcul de la position normalisée (0 = bas, 1 = haut)
  const normalizedPosition = (gain - minGain) / (maxGain - minGain);
  const knobTop = (1 - normalizedPosition) * (SLIDER_HEIGHT - KNOB_SIZE);

  // Animation du spectre
  const animatedMagnitude = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(animatedMagnitude, {
      toValue: magnitude,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [magnitude, animatedMagnitude]);

  // Couleur du gain
  const getGainColor = useCallback((gainValue: number) => {
    if (Math.abs(gainValue) < 0.5) return THEME_COLORS.textSecondary;
    if (gainValue > 12) return '#FF453A';
    if (gainValue > 6) return '#FF9F0A';
    if (gainValue > 0) return THEME_COLORS.primary;
    return THEME_COLORS.secondary;
  }, []);

  // Style de gain selon la valeur
  const getGainValueStyle = useCallback((gainValue: number) => {
    if (Math.abs(gainValue) < 0.5) return styles.gainValueNeutral;
    if (gainValue > 12) return styles.gainValueDanger;
    if (gainValue > 6) return styles.gainValueWarning;
    if (gainValue > 0) return styles.gainValueBoost;
    return styles.gainValueCut;
  }, []);

  // Utiliser useMemo au lieu de useRef pour que le PanResponder se mette à jour correctement
  const panResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onStartShouldSetPanResponderCapture: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponderCapture: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      
      onPanResponderGrant: () => {
        setIsDragging(true);
        // Sauvegarder le gain initial au début du geste
        initialGainRef.current = gain;
        
        // Animations de début
        Animated.parallel([
          Animated.spring(animatedScale, {
            toValue: 1.15,
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
        
        // Retour haptique
        if (Platform.OS === 'ios') {
          Vibration.vibrate(10);
        }
      },
      
      onPanResponderMove: (_, gestureState) => {
        // Utiliser le gain initial sauvegardé comme référence
        const initialNormalizedPosition = (initialGainRef.current - minGain) / (maxGain - minGain);
        const initialKnobTop = (1 - initialNormalizedPosition) * (SLIDER_HEIGHT - KNOB_SIZE);
        
        // Calculer la nouvelle position avec le déplacement
        const newTop = Math.max(0, Math.min(SLIDER_HEIGHT - KNOB_SIZE, initialKnobTop + gestureState.dy));
        const newNormalizedPosition = 1 - (newTop / (SLIDER_HEIGHT - KNOB_SIZE));
        const newGain = newNormalizedPosition * (maxGain - minGain) + minGain;
        
        // Arrondir à 0.1 près
        const roundedGain = Math.round(newGain * 10) / 10;
        onGainChange(id, roundedGain);
      },
      
      onPanResponderRelease: () => {
        setIsDragging(false);
        
        // Animations de fin
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
    [disabled, gain, minGain, maxGain, id, onGainChange] // Dépendances pour que le PanResponder soit recréé quand nécessaire
  );

  const trackFillHeight = normalizedPosition * SLIDER_HEIGHT;
  const spectrumHeight = magnitude * SLIDER_HEIGHT * 0.7;
  
  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* Label de fréquence */}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
      
      {/* Zone du slider */}
      <View style={styles.sliderZone}>
        {/* Track de fond */}
        <View style={styles.track} />
        
        {/* Visualisation du spectre (derrière) */}
        <Animated.View
          style={[
            styles.spectrumBar,
            {
              height: animatedMagnitude.interpolate({
                inputRange: [0, 1],
                outputRange: [2, spectrumHeight],
              }),
              opacity: animatedMagnitude.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.4],
              }),
            },
          ]}
        />
        
        {/* Fill du track (partie active) */}
        <View
          style={[
            styles.trackFill,
            {
              height: Math.max(2, trackFillHeight),
              backgroundColor: getGainColor(gain),
            },
          ]}
        />
        
        {/* Ligne de référence 0 dB */}
        <View 
          style={[
            styles.zeroLine,
            { top: (1 - (-minGain) / (maxGain - minGain)) * SLIDER_HEIGHT },
          ]}
        />
        
        {/* Knob avec glow */}
        <Animated.View
          style={[
            styles.knobTouchArea,
            {
              top: knobTop - 6, // Compenser l'agrandissement de la zone tactile
              transform: [{ scale: animatedScale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Effet de lueur */}
          <Animated.View
            style={[
              styles.knobGlow,
              {
                backgroundColor: getGainColor(gain),
                opacity: animatedGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          />
          
          {/* Knob principal */}
          <View
            style={[
              styles.knob,
              isDragging && styles.knobDragging,
              {
                backgroundColor: isDragging ? getGainColor(gain) : THEME_COLORS.surface,
                borderColor: getGainColor(gain),
              },
            ]}
          >
            <Text style={[styles.knobText, isDragging && styles.knobTextDragging]}>
              {Math.abs(gain) < 0.1 ? '0' : gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
            </Text>
          </View>
        </Animated.View>
      </View>
      
      {/* Valeur du gain */}
      <Text 
        style={[
          styles.gainValue, 
          getGainValueStyle(gain), 
          disabled && styles.gainValueDisabled
        ]}
      >
        {gain.toFixed(1)} dB
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  labelDisabled: {
    opacity: 0.5,
  },
  sliderZone: {
    width: TRACK_WIDTH + KNOB_SIZE,
    height: SLIDER_HEIGHT,
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: (TRACK_WIDTH + KNOB_SIZE - TRACK_WIDTH) / 2,
    top: 0,
    width: TRACK_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: THEME_COLORS.border,
    borderRadius: TRACK_WIDTH / 2,
  },
  trackFill: {
    position: 'absolute',
    left: (TRACK_WIDTH + KNOB_SIZE - TRACK_WIDTH) / 2,
    bottom: 0,
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
    minHeight: 2,
  },
  zeroLine: {
    position: 'absolute',
    left: (TRACK_WIDTH + KNOB_SIZE - TRACK_WIDTH) / 2 - 4,
    width: TRACK_WIDTH + 8,
    height: 1,
    backgroundColor: THEME_COLORS.text,
    opacity: 0.3,
  },
  spectrumBar: {
    position: 'absolute',
    left: (TRACK_WIDTH + KNOB_SIZE - 16) / 2,
    bottom: 0,
    width: 16,
    backgroundColor: THEME_COLORS.primary,
    borderRadius: 2,
    minHeight: 2,
  },
  knobTouchArea: {
    position: 'absolute',
    width: KNOB_SIZE + 12, // Zone tactile élargie
    height: KNOB_SIZE + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobGlow: {
    position: 'absolute',
    width: KNOB_SIZE + 12,
    height: KNOB_SIZE + 12,
    borderRadius: (KNOB_SIZE + 12) / 2,
    top: -6,
    left: -6,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  knobDragging: {
    shadowOpacity: 0.4,
    elevation: 6,
  },
  knobText: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME_COLORS.text,
    textAlign: 'center',
  },
  knobTextDragging: {
    color: '#FFFFFF',
  },
  gainValue: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  gainValueNeutral: {
    color: THEME_COLORS.textSecondary,
  },
  gainValueBoost: {
    color: THEME_COLORS.primary,
  },
  gainValueCut: {
    color: THEME_COLORS.secondary,
  },
  gainValueWarning: {
    color: '#FF9F0A',
  },
  gainValueDanger: {
    color: '#FF453A',
  },
  gainValueDisabled: {
    opacity: 0.5,
  },
});