/**
 * Composant de visualisation du spectre audio
 * Animations fluides et design moderne
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SpectrumData } from '../types';

interface SpectrumVisualizerProps {
  spectrumData: SpectrumData | null;
  height?: number;
  style?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_HEIGHT = 120;
const BAR_COUNT = 32;
const BAR_WIDTH = (SCREEN_WIDTH - 40) / BAR_COUNT;
const BAR_GAP = 2;

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  spectrumData,
  height = DEFAULT_HEIGHT,
  style,
}) => {
  const animatedHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (spectrumData && spectrumData.length > 0) {
      const step = Math.floor(spectrumData.length / BAR_COUNT);
      
      const animations = animatedHeights.map((animValue, index) => {
        const dataIndex = Math.min(index * step, spectrumData.length - 1);
        const magnitude = spectrumData[dataIndex] || 0;
        const normalizedMagnitude = Math.max(0, Math.min(1, magnitude));
        
        return Animated.spring(animValue, {
          toValue: normalizedMagnitude * height * 0.8,
          stiffness: 100,
          damping: 15,
          mass: 0.5,
          useNativeDriver: false,
        });
      });
      
      Animated.parallel(animations).start();
    } else {
      const animations = animatedHeights.map(animValue =>
        Animated.spring(animValue, {
          toValue: 0,
          stiffness: 100,
          damping: 15,
          useNativeDriver: false,
        })
      );
      
      Animated.parallel(animations).start();
    }
  }, [spectrumData, height, animatedHeights]);

  return (
    <View style={[styles.container, { height }, style]}>
      <View style={styles.barsContainer}>
        {animatedHeights.map((animHeight, index) => {
          const opacity = 0.9 - (index / BAR_COUNT) * 0.3;
          const hue = (index / BAR_COUNT) * 60; // De bleu à violet
          
          return (
            <View key={index} style={styles.barWrapper}>
              {/* Effet de lueur */}
              <Animated.View
                style={[
                  styles.barGlow,
                  {
                    height: animHeight,
                    backgroundColor: `hsl(${220 + hue}, 100%, 50%)`,
                    opacity: Animated.multiply(
                      animHeight.interpolate({
                        inputRange: [0, height],
                        outputRange: [0, 0.3],
                      }),
                      opacity
                    ),
                  },
                ]}
              />
              {/* Barre principale */}
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: animHeight,
                    backgroundColor: `hsl(${220 + hue}, 100%, 60%)`,
                    opacity,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Version alternative identique pour la compatibilité
export const SpectrumVisualizerFallback = SpectrumVisualizer;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 20,
  },
  barWrapper: {
    width: BAR_WIDTH - BAR_GAP,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  barGlow: {
    width: '120%',
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    transform: [{ scaleX: 1.5 }],
  },
});