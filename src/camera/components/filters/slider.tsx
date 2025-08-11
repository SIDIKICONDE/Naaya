import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  PanResponderGestureState,
  Platform,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

export interface NumberLineControlProps {
  value: number;
  min: number;
  max: number;
  step: number;
  width: number;
  color: string;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}

const THUMB_SIZE = 24;
const SLIDER_HEIGHT = 6;

export const NumberLineControl: React.FC<NumberLineControlProps> = memo(({
  value,
  min,
  max,
  step,
  width,
  color,
  disabled = false,
  onValueChange,
  onSlidingComplete,
}) => {
  const [sliderWidth, setSliderWidth] = useState(width);
  const [currentValue, setCurrentValue] = useState(value);
  const animatedValue = useRef(new Animated.Value(value)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);

  const range = useMemo(() => max - min, [max, min]);
  const percentage = useMemo(() => (currentValue - min) / range, [currentValue, min, range]);
  
  const thumbPosition = useMemo(() => {
    return percentage * (sliderWidth - THUMB_SIZE);
  }, [percentage, sliderWidth]);

  const progressWidth = useMemo(() => {
    return percentage * sliderWidth;
  }, [percentage, sliderWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      
      onPanResponderGrant: useCallback((evt: any, gestureState: PanResponderGestureState) => {
        if (disabled) return;
        
        isDraggingRef.current = true;
        startXRef.current = gestureState.x0;

        // Si on touche loin du pouce, sauter directement à la position tapée
        const locationX = evt?.nativeEvent?.locationX ?? 0;
        const percentCurrent = (currentValue - min) / range;
        const thumbCenter = percentCurrent * (sliderWidth - THUMB_SIZE) + THUMB_SIZE / 2;
        const isFarFromThumb = Math.abs(locationX - thumbCenter) > THUMB_SIZE;

        if (isFarFromThumb) {
          const ratio = Math.max(0, Math.min(1, locationX / Math.max(1, sliderWidth)));
          const initialValue = min + ratio * range;
          const steppedInitial = Math.round((initialValue - min) / step) * step + min;
          const clampedInitial = Math.max(min, Math.min(max, steppedInitial));
          startValueRef.current = clampedInitial;
          setCurrentValue(clampedInitial);
          animatedValue.setValue(clampedInitial);
          if (onValueChange) onValueChange(clampedInitial);
        } else {
          startValueRef.current = currentValue;
        }
        
        Animated.spring(thumbScale, {
          toValue: 1.2,
          useNativeDriver: true,
          friction: 5,
        }).start();
        
        if (Platform.OS === 'ios') {
          Vibration.vibrate(10);
        }
      }, [disabled, currentValue, sliderWidth, range, min, max, step, onValueChange, animatedValue, thumbScale]),
      
      onPanResponderMove: useCallback((evt: any, gestureState: PanResponderGestureState) => {
        if (disabled) return;
        
        const dx = gestureState.dx;
        const pixelsPerUnit = (sliderWidth - THUMB_SIZE) / range;
        const valueChange = dx / pixelsPerUnit;
        const newValue = Math.max(min, Math.min(max, startValueRef.current + valueChange));
        
        // Arrondir en s'alignant sur min (et pas sur 0) pour éviter les décalages
        const steppedValue = Math.round((newValue - min) / step) * step + min;
        const clampedValue = Math.max(min, Math.min(max, steppedValue));
        
        setCurrentValue(clampedValue);
        animatedValue.setValue(clampedValue);
        
        if (onValueChange) {
          onValueChange(clampedValue);
        }
      }, [disabled, sliderWidth, range, min, max, step, onValueChange, animatedValue]),
      
      onPanResponderRelease: useCallback(() => {
        if (disabled) return;
        
        console.log('[NumberLineControl] PanResponder Release - reset drag flag');
        isDraggingRef.current = false;
        
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }).start();
        
        if (onSlidingComplete) {
          onSlidingComplete(currentValue);
        }
      }, [disabled, onSlidingComplete, currentValue, thumbScale]),
      
      onPanResponderTerminate: useCallback(() => {
        if (disabled) return;
        
        console.log('[NumberLineControl] PanResponder Terminate - reset drag flag');
        isDraggingRef.current = false;
        
        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }).start();
        
        if (onSlidingComplete) {
          onSlidingComplete(currentValue);
        }
      }, [disabled, onSlidingComplete, currentValue, thumbScale]),
    })
  ).current;

  // Synchroniser avec la prop value quand elle change
  React.useEffect(() => {
    if (!isDraggingRef.current && Math.abs(currentValue - value) > 0.001) {
      setCurrentValue(value);
      animatedValue.setValue(value);
    }
  }, [value, animatedValue, currentValue]);

  // Reset du drag state au cas où il reste bloqué
  React.useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (isDraggingRef.current) {
        console.log('[NumberLineControl] Reset du flag dragging bloqué');
        isDraggingRef.current = false;
      }
    }, 1000);
    
    return () => clearTimeout(resetTimer);
  }, [currentValue]);

  React.useEffect(() => {
    setSliderWidth(width);
  }, [width]);

  return (
    <View
      style={[styles.container, disabled && styles.containerDisabled, { width }]}
      onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.progress,
            {
              width: progressWidth,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      
      <Animated.View
        style={[
          styles.thumb,
          {
            left: thumbPosition,
            backgroundColor: color,
            transform: [{ scale: thumbScale }],
          },
        ]}
      >
        <View style={styles.thumbInner} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 10,
    justifyContent: 'center',
    position: 'relative',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  track: {
    height: SLIDER_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SLIDER_HEIGHT / 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: SLIDER_HEIGHT / 1,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbInner: {
    width: '50%',
    height: '50%',
    borderRadius: 10,
    backgroundColor: 'white',
  },
});

export default NumberLineControl;