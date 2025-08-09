/**
 * Composant de contrôle professionnel avec slider
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SLIDER_WIDTH } from '../constants';
import type { ParameterControlProps } from '../types';

export const ParameterControl: React.FC<ParameterControlProps> = memo(({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit = '', 
  color = '#007AFF',
  onValueChange, 
  onSlidingComplete,
  disabled 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbPosition, setThumbPosition] = useState(() => {
    // Initialiser avec la position correcte
    return ((value - min) / (max - min)) * SLIDER_WIDTH;
  });
  const [trackWidth, setTrackWidth] = useState<number>(SLIDER_WIDTH);
  const sliderContainerRef = useRef<View | null>(null);
  
  // Calculer la position du slider basée sur la valeur
  const valueToPosition = useCallback((val: number) => {
    const width = trackWidth || SLIDER_WIDTH;
    return ((val - min) / (max - min)) * width;
  }, [min, max, trackWidth]);

  const positionToValue = useCallback((pos: number) => {
    const width = trackWidth || SLIDER_WIDTH;
    const ratio = Math.max(0, Math.min(1, pos / width));
    const rawValue = min + ratio * (max - min);
    return Math.round(rawValue / step) * step;
  }, [min, max, step, trackWidth]);

  // Mettre à jour la position quand la valeur change
  React.useEffect(() => {
    if (!isDragging) {
      const newPosition = valueToPosition(value);
      console.log(`[${label}] Mise à jour position: value=${value}, position=${newPosition}`);
      setThumbPosition(newPosition);
    }
  }, [value, isDragging, valueToPosition, label]);

  // Références pour le glissement
  const startPosition = React.useRef(0);

  // PanResponder pour gérer le glissement (compatible ScrollView)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => !disabled && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 2,
    onStartShouldSetPanResponderCapture: () => !disabled,
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => !disabled && Math.abs(dx) > Math.abs(dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      setIsDragging(true);
      startPosition.current = thumbPosition;
    },
    onPanResponderMove: (evt) => {
      // Utiliser la position locale du doigt dans le conteneur pour éviter les dérives dx
      const localX = evt.nativeEvent.locationX;
      const newPosition = Math.max(0, Math.min(trackWidth, localX));
      const newValue = positionToValue(newPosition);
      setThumbPosition(newPosition);
      onValueChange(newValue);
    },
    onPanResponderRelease: (evt) => {
      const localX = evt.nativeEvent.locationX;
      const newPosition = Math.max(0, Math.min(trackWidth, localX));
      const newValue = positionToValue(newPosition);
      setThumbPosition(newPosition);
      setIsDragging(false);
      onSlidingComplete(newValue);
    },
    onPanResponderTerminate: (evt) => {
      const localX = evt.nativeEvent.locationX;
      const newPosition = Math.max(0, Math.min(trackWidth, localX));
      const newValue = positionToValue(newPosition);
      setThumbPosition(newPosition);
      setIsDragging(false);
      onSlidingComplete(newValue);
    },
  });

  const displayValue = useMemo(() => {
    if (unit === '%') {
      return Math.round(value * 100);
    }
    return Math.round(value * 100) / 100;
  }, [value, unit]);

  const handleTrackPress = useCallback((event: any) => {
    if (disabled) return;
    
    const { locationX } = event.nativeEvent;
    const newValue = positionToValue(locationX);
    const newPosition = valueToPosition(newValue);
    
    setThumbPosition(newPosition);
    onValueChange(newValue);
    onSlidingComplete(newValue);
  }, [disabled, onValueChange, onSlidingComplete, positionToValue, valueToPosition]);

  return (
    <View style={[styles.parameterContainer, disabled && styles.parameterDisabled]}>
      <View style={styles.parameterHeader}>
        <Text style={[styles.parameterLabel, disabled && styles.textDisabled]}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.parameterValue, { color }, disabled && styles.textDisabled]}>
            {displayValue}{unit}
          </Text>
        </View>
      </View>
      
      <View ref={sliderContainerRef} style={[styles.sliderContainer, { width: SLIDER_WIDTH }]} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.sliderTrackFull}
          onPress={handleTrackPress}
          disabled={disabled}
          activeOpacity={1}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View 
            style={[
              styles.sliderActiveTrack, 
              { backgroundColor: color, width: thumbPosition },
              disabled && styles.sliderDisabled
            ]} 
          />
        </TouchableOpacity>
        
        <View 
          style={[styles.sliderThumb, { transform: [{ translateX: thumbPosition }] }]}
        >
          <View style={[
            styles.sliderThumbInner, 
            { borderColor: color },
            isDragging && styles.sliderThumbActive,
            !isDragging && styles.sliderThumbInactive,
            disabled && styles.sliderThumbDisabled
          ]} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  parameterContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  parameterDisabled: {
    opacity: 0.5,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parameterLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  valueContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  parameterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#666666',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderTrackFull: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  sliderActiveTrack: {
    height: '100%',
    borderRadius: 2,
  },
  sliderDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderThumbInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbActive: {
    backgroundColor: '#007AFF',
  },
  sliderThumbInactive: {
    backgroundColor: '#FFFFFF',
  },
  sliderThumbDisabled: {
    backgroundColor: '#666666',
    borderColor: '#666666',
  },
});
