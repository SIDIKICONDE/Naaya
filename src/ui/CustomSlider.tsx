/**
 * Slider custom haute performance
 * Design moderne avec animations fluides et gestes intuitifs
 */
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export interface CustomSliderProps {
  /** Valeur actuelle du slider (0-1) */
  value: number;
  /** Callback appelé lors du changement de valeur */
  onValueChange: (value: number) => void;
  /** Callback appelé en fin de modification */
  onSlidingComplete?: (value: number) => void;
  /** Valeur minimale (défaut: 0) */
  minimumValue?: number;
  /** Valeur maximale (défaut: 1) */
  maximumValue?: number;
  /** Nombre de pas discrets (optionnel) */
  step?: number;
  /** Largeur du slider */
  width?: number;
  /** Hauteur du track */
  trackHeight?: number;
  /** Couleur du track actif */
  activeTrackColor?: string;
  /** Couleur du track inactif */
  inactiveTrackColor?: string;
  /** Couleur du thumb */
  thumbColor?: string;
  /** Taille du thumb */
  thumbSize?: number;
  /** Afficher la valeur au-dessus du thumb */
  showValue?: boolean;
  /** Format de la valeur affichée */
  valueFormatter?: (value: number) => string;
  /** Désactiver le slider */
  disabled?: boolean;
  /** Style personnalisé du conteneur */
  style?: ViewStyle;
  /** Couleur d'accentuation pour les animations */
  accentColor?: string;
  /** Activer les vibrations tactiles */
  enableHapticFeedback?: boolean;
}

export const CustomSlider: React.FC<CustomSliderProps> = memo(({
  value,
  onValueChange,
  onSlidingComplete,
  minimumValue = 0,
  maximumValue = 1,
  step,
  width = 280,
  trackHeight = 4,
  activeTrackColor = '#007AFF',
  inactiveTrackColor = '#E5E5EA',
  thumbColor = '#FFFFFF',
  thumbSize = 24,
  showValue = false,
  valueFormatter = (val: number) => Math.round(val * 100).toString(),
  disabled = false,
  style,
  accentColor = '#007AFF',
  enableHapticFeedback = true, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  // États et références
  const [isDragging, setIsDragging] = useState(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const valueAnimation = useRef(new Animated.Value(0)).current;

  // Calculs de position et valeurs
  const normalizedValue = useMemo(() => {
    return Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)));
  }, [value, minimumValue, maximumValue]);

  const thumbPosition = useMemo(() => {
    return normalizedValue * (width - thumbSize);
  }, [normalizedValue, width, thumbSize]);

  // Fonction utilitaire pour calculer la valeur depuis la position
  const getValueFromPosition = useCallback((x: number): number => {
    const trackWidth = width - thumbSize;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    let newValue = minimumValue + (clampedX / trackWidth) * (maximumValue - minimumValue);
    
    if (step && step > 0) {
      newValue = Math.round(newValue / step) * step;
    }
    
    return Math.max(minimumValue, Math.min(maximumValue, newValue));
  }, [width, thumbSize, minimumValue, maximumValue, step]);

  // Gestionnaire de gestes Pan avec PanResponder
  const LEFT_PADDING = 12; // doit correspondre au style.track.left
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    
    onPanResponderGrant: () => {
      setIsDragging(true);
      // Animation d'agrandissement du thumb
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(valueAnimation, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },

    onPanResponderMove: (evt) => {
      // locationX: coordonnée relative au conteneur du slider
      const localX = (evt.nativeEvent as any).locationX as number;
      // Convertir en coordonnée relative au track (décalé de LEFT_PADDING)
      const xOnTrack = localX - LEFT_PADDING;
      const newValue = getValueFromPosition(xOnTrack);
      onValueChange(newValue);
    },

    onPanResponderRelease: () => {
      setIsDragging(false);
      
      // Animation de retour à la taille normale
      Animated.parallel([
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(valueAnimation, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Callback de fin de modification avec la valeur actuelle
      if (onSlidingComplete) onSlidingComplete(value);
    },
  }), [disabled, scaleAnimation, valueAnimation, onSlidingComplete, value, getValueFromPosition, onValueChange]);

  // Styles dynamiques
  const containerStyle = useMemo(() => [
    styles.container,
    { width, opacity: disabled ? 0.5 : 1 },
    style,
  ], [width, disabled, style]);

  const trackStyle = useMemo(() => [
    styles.track,
    {
      height: trackHeight,
      backgroundColor: inactiveTrackColor,
      borderRadius: trackHeight / 2,
    },
  ], [trackHeight, inactiveTrackColor]);

  const activeTrackStyle = useMemo(() => [
    styles.activeTrack,
    {
      width: thumbPosition + thumbSize / 2,
      height: trackHeight,
      backgroundColor: isDragging ? accentColor : activeTrackColor,
      borderRadius: trackHeight / 2,
    },
  ], [thumbPosition, thumbSize, trackHeight, activeTrackColor, accentColor, isDragging]);

  const thumbStyle = useMemo(() => [
    styles.thumb,
    {
      width: thumbSize,
      height: thumbSize,
      backgroundColor: thumbColor,
      borderRadius: thumbSize / 2,
      left: thumbPosition,
      borderWidth: isDragging ? 2 : 1,
      borderColor: isDragging ? accentColor : activeTrackColor,
      elevation: isDragging ? 8 : 4,
      shadowOpacity: isDragging ? 0.3 : 0.2,
    },
  ], [thumbSize, thumbColor, thumbPosition, activeTrackColor, accentColor, isDragging]);

  const valueDisplayStyle = useMemo(() => [
    styles.valueDisplay,
    {
      backgroundColor: isDragging ? accentColor : activeTrackColor,
      left: thumbPosition - 20 + thumbSize / 2,
    },
  ], [thumbPosition, thumbSize, activeTrackColor, accentColor, isDragging]);

  return (
    <View
      style={containerStyle}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...panResponder.panHandlers}
    >
      {/* Track inactif */}
      <View style={trackStyle} />
      
      {/* Track actif */}
      <View style={activeTrackStyle} />
      
      {/* Thumb avec gestion des gestes */}
      <Animated.View
        style={[
          thumbStyle,
          {
            transform: [{ scale: scaleAnimation }],
          },
        ]}
      />

      {/* Affichage de la valeur */}
      {showValue && (
        <Animated.View
          style={[
            valueDisplayStyle,
            {
              opacity: valueAnimation,
              transform: [
                {
                  translateY: valueAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -40],
                  }),
                },
                { scale: valueAnimation },
              ],
            },
          ]}
        >
          <Text style={styles.valueText}>{valueFormatter(value)}</Text>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  activeTrack: {
    position: 'absolute',
    left: 12,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 4,
  },
  valueDisplay: {
    position: 'absolute',
    top: -10,
    width: 40,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CustomSlider;
