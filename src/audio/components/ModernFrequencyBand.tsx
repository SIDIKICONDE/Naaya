/**
 * Composant moderne de bande de fréquence avec animations fluides
 * Design glassmorphism et interactions optimisées
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  MODERN_THEME, 
  ANIMATION_CONFIG, 
  EQUALIZER_DIMENSIONS,
  TOUCH_CONFIG 
} from '../constants/theme';

interface ModernFrequencyBandProps {
  id: string;
  frequency: number;
  gain: number;
  minGain: number;
  maxGain: number;
  label: string;
  color: string;
  magnitude?: number;
  onGainChange: (bandId: string, gain: number) => void;
  disabled?: boolean;
  index: number;
}

const { slider: SLIDER_DIMS } = EQUALIZER_DIMENSIONS;

export const ModernFrequencyBand: React.FC<ModernFrequencyBandProps> = ({
  id,
  gain,
  minGain,
  maxGain,
  label,
  color,
  magnitude = 0,
  onGainChange,
  disabled = false,
  index,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [sliderHeight, setSliderHeight] = useState(SLIDER_DIMS.height);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const magnitudeAnim = useRef(new Animated.Value(0)).current;
  const appearAnim = useRef(new Animated.Value(0)).current;
  
  // Position normalisée (0 = min, 1 = max)
  const normalizedValue = useMemo(() => {
    return (gain - minGain) / (maxGain - minGain);
  }, [gain, minGain, maxGain]);
  
  // Animation d'entrée
  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 50),
      Animated.spring(appearAnim, {
        toValue: 1,
        ...ANIMATION_CONFIG.spring.bouncy,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, appearAnim]);
  
  // Animation du magnitude
  React.useEffect(() => {
    Animated.timing(magnitudeAnim, {
      toValue: magnitude,
      duration: ANIMATION_CONFIG.duration.instant,
      useNativeDriver: false,
    }).start();
  }, [magnitude, magnitudeAnim]);
  
  // Animation de pulsation pour les valeurs extrêmes
  React.useEffect(() => {
    if (Math.abs(gain) > 15) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: ANIMATION_CONFIG.duration.slow,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: ANIMATION_CONFIG.duration.slow,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [gain, pulseAnim]);
  
  // Gestion du layout pour capturer la hauteur réelle
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setSliderHeight(height);
    }
  }, []);
  
  // Calcul de la position à partir d'un événement tactile
  const calculateGainFromPosition = useCallback((locationY: number) => {
    const clampedY = Math.max(0, Math.min(sliderHeight, locationY));
    const normalizedPosition = 1 - (clampedY / sliderHeight);
    const newGain = normalizedPosition * (maxGain - minGain) + minGain;
    return Math.round(newGain * 10) / 10; // Arrondir à 0.1
  }, [sliderHeight, minGain, maxGain]);
  
  // Gestion du début de l'interaction
  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    
    // Animations de début
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        ...ANIMATION_CONFIG.spring.stiff,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.duration.fast,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Retour haptique
    if (Platform.OS === 'ios') {
      Vibration.vibrate(TOUCH_CONFIG.haptic.selection);
    }
    
    // Mise à jour immédiate de la valeur
    const { locationY } = event.nativeEvent;
    const newGain = calculateGainFromPosition(locationY);
    onGainChange(id, newGain);
  }, [disabled, id, calculateGainFromPosition, onGainChange, scaleAnim, glowAnim]);
  
  // Gestion du mouvement
  const handleMove = useCallback((event: GestureResponderEvent) => {
    if (!isPressed || disabled) return;
    
    const { locationY } = event.nativeEvent;
    const newGain = calculateGainFromPosition(locationY);
    onGainChange(id, newGain);
  }, [isPressed, disabled, id, calculateGainFromPosition, onGainChange]);
  
  // Gestion de la fin de l'interaction
  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    
    // Animations de fin
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...ANIMATION_CONFIG.spring.gentle,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.duration.normal,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Retour haptique si valeur à zéro
    if (Math.abs(gain) < 0.1 && Platform.OS === 'ios') {
      Vibration.vibrate(TOUCH_CONFIG.haptic.success);
    }
  }, [gain, scaleAnim, glowAnim]);
  
  // Double tap pour reset
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < TOUCH_CONFIG.doubleTapDelay) {
      onGainChange(id, 0);
      if (Platform.OS === 'ios') {
        Vibration.vibrate(TOUCH_CONFIG.haptic.success);
      }
    }
    lastTap.current = now;
  }, [id, onGainChange]);
  
  // Couleur dynamique basée sur la valeur
  const getValueColor = useCallback(() => {
    if (Math.abs(gain) < 0.5) return MODERN_THEME.colors.text.tertiary;
    if (gain > 15) return MODERN_THEME.colors.danger;
    if (gain > 10) return MODERN_THEME.colors.warning;
    if (gain > 0) return color;
    return MODERN_THEME.colors.secondary.base;
  }, [gain, color]);
  
  const fillHeight = normalizedValue * sliderHeight;
  const knobPosition = sliderHeight - (normalizedValue * sliderHeight) - SLIDER_DIMS.knobSize / 2;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        disabled && styles.containerDisabled,
        {
          opacity: appearAnim,
          transform: [
            {
              translateY: appearAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Label avec effet de glow */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: getValueColor() }]}>
          {label}
        </Text>
        {Math.abs(gain) > 0.1 && (
          <View style={[styles.gainBadge, { backgroundColor: getValueColor() + '20' }]}>
            <Text style={[styles.gainBadgeText, { color: getValueColor() }]}>
              {gain > 0 ? '+' : ''}{gain.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      
      {/* Zone du slider avec glassmorphism */}
      <Pressable
        style={styles.sliderContainer}
        onPressIn={handlePressIn}
        onTouchMove={handleMove}
        onPressOut={handlePressOut}
        onPress={handleDoubleTap}
        disabled={disabled}
      >
        <View 
          style={styles.sliderTrack}
          onLayout={handleLayout}
        >
          {/* Effet de fond glassmorphism */}
          <View style={styles.trackBackground} />
          
          {/* Visualisation du spectre */}
          <Animated.View
            style={[
              styles.spectrumBar,
              {
                height: magnitudeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, sliderHeight * 0.8],
                }),
                backgroundColor: color,
                opacity: magnitudeAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.2, 0.3],
                }),
              },
            ]}
          />
          
          {/* Remplissage avec gradient */}
          <LinearGradient
            colors={[color, color + 'CC']}
            style={[
              styles.trackFill,
              {
                height: Math.max(2, fillHeight),
              },
            ]}
          />
          
          {/* Ligne de référence 0 dB */}
          <View 
            style={[
              styles.zeroLine,
              { 
                bottom: sliderHeight * 0.5 - 0.5,
                opacity: isPressed ? 1 : 0.3,
              },
            ]}
          />
          
          {/* Knob moderne avec effet de glow */}
          <Animated.View
            style={[
              styles.knobContainer,
              {
                bottom: knobPosition,
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
            pointerEvents="none"
          >
            {/* Effet de glow animé */}
            <Animated.View
              style={[
                styles.knobGlow,
                {
                  backgroundColor: getValueColor(),
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />
            
            {/* Knob principal */}
            <LinearGradient
              colors={isPressed ? [getValueColor(), getValueColor() + 'DD'] : [MODERN_THEME.colors.surface, MODERN_THEME.colors.surfaceElevated]}
              style={[
                styles.knob,
                {
                  borderColor: getValueColor(),
                },
              ]}
            >
              <Text style={[styles.knobValue, isPressed && { color: MODERN_THEME.colors.text.primary }]}>
                {Math.abs(gain) < 0.1 ? '0' : gain.toFixed(0)}
              </Text>
            </LinearGradient>
          </Animated.View>
          
          {/* Indicateurs de graduation */}
          {[-20, -10, 0, 10, 20].map((mark) => {
            const markPosition = ((mark - minGain) / (maxGain - minGain)) * sliderHeight;
            return (
              <View
                key={mark}
                style={[
                  styles.graduationMark,
                  {
                    bottom: markPosition - 0.5,
                    opacity: isPressed ? 0.5 : 0.2,
                  },
                ]}
              />
            );
          })}
        </View>
      </Pressable>
      
      {/* Valeur en dB */}
      <Animated.View 
        style={[
          styles.valueContainer,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.6],
            }),
          },
        ]}
      >
        <Text style={[styles.valueText, { color: getValueColor() }]}>
          {gain.toFixed(1)} dB
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SLIDER_DIMS.containerWidth,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  containerDisabled: {
    opacity: 0.4,
  },
  labelContainer: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 32,
  },
  label: {
    fontSize: MODERN_THEME.typography.fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  gainBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: MODERN_THEME.borderRadius.sm,
  },
  gainBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sliderContainer: {
    width: SLIDER_DIMS.touchAreaSize,
    height: SLIDER_DIMS.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    width: SLIDER_DIMS.trackWidth,
    height: SLIDER_DIMS.height,
    position: 'relative',
  },
  trackBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: MODERN_THEME.colors.border.light,
    borderRadius: SLIDER_DIMS.trackWidth / 2,
  },
  trackFill: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: SLIDER_DIMS.trackWidth / 2,
  },
  spectrumBar: {
    position: 'absolute',
    bottom: 0,
    width: '150%',
    left: '-25%',
    borderRadius: 2,
  },
  zeroLine: {
    position: 'absolute',
    width: 20,
    height: 1,
    left: -7,
    backgroundColor: MODERN_THEME.colors.text.secondary,
  },
  graduationMark: {
    position: 'absolute',
    width: 10,
    height: 0.5,
    left: -2,
    backgroundColor: MODERN_THEME.colors.text.tertiary,
  },
  knobContainer: {
    position: 'absolute',
    width: SLIDER_DIMS.knobSize,
    height: SLIDER_DIMS.knobSize,
    left: (SLIDER_DIMS.trackWidth - SLIDER_DIMS.knobSize) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobGlow: {
    position: 'absolute',
    width: SLIDER_DIMS.knobSize + 16,
    height: SLIDER_DIMS.knobSize + 16,
    borderRadius: (SLIDER_DIMS.knobSize + 16) / 2,
  },
  knob: {
    width: SLIDER_DIMS.knobSize,
    height: SLIDER_DIMS.knobSize,
    borderRadius: SLIDER_DIMS.knobSize / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...MODERN_THEME.effects.shadows.medium,
  },
  knobValue: {
    fontSize: 10,
    fontWeight: '700',
    color: MODERN_THEME.colors.text.secondary,
  },
  valueContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: MODERN_THEME.colors.surface,
    borderRadius: MODERN_THEME.borderRadius.sm,
  },
  valueText: {
    fontSize: MODERN_THEME.typography.fontSize.xs,
    fontWeight: '600',
  },
});

export default ModernFrequencyBand;