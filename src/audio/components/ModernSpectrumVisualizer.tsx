/**
 * Visualiseur de spectre moderne avec animations fluides
 * Effets visuels avancés et design futuriste
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient as SvgLinearGradient, 
  Stop, 
  Rect, 
  Path,
  G,
  Circle,
} from 'react-native-svg';
import { 
  MODERN_THEME, 
  ANIMATION_CONFIG,
  EQUALIZER_DIMENSIONS 
} from '../constants/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModernSpectrumVisualizerProps {
  spectrumData: number[] | null;
  height: number;
  isEnabled: boolean;
}

export const ModernSpectrumVisualizer: React.FC<ModernSpectrumVisualizerProps> = ({
  spectrumData,
  height,
  isEnabled,
}) => {
  const { barWidth, barSpacing, maxBars } = EQUALIZER_DIMENSIONS.visualizer;
  
  // Nombre de barres basé sur la largeur disponible
  const numBars = Math.min(
    spectrumData?.length || 0,
    Math.floor((SCREEN_WIDTH - 32) / (barWidth + barSpacing))
  );
  
  // Animations pour chaque barre
  const barAnimations = useRef(
    Array.from({ length: maxBars }, () => new Animated.Value(0))
  ).current;
  
  // Animation de pulsation globale
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Animation de pulsation continue
  useEffect(() => {
    if (isEnabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      
      // Animation de glow
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.duration.slow,
        useNativeDriver: false,
      }).start();
      
      return () => {
        pulse.stop();
      };
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.duration.normal,
        useNativeDriver: false,
      }).start();
    }
  }, [isEnabled, pulseAnim, glowAnim]);
  
  // Animation des barres du spectre
  useEffect(() => {
    if (spectrumData && isEnabled) {
      spectrumData.slice(0, numBars).forEach((value, index) => {
        Animated.timing(barAnimations[index], {
          toValue: value,
          duration: ANIMATION_CONFIG.duration.instant,
          useNativeDriver: false,
        }).start();
      });
    } else {
      // Reset des animations si désactivé
      barAnimations.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.duration.normal,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [spectrumData, isEnabled, numBars, barAnimations]);
  
  // Génération du path pour la courbe
  const generateWavePath = useCallback(() => {
    if (!spectrumData || spectrumData.length === 0) {
      return `M 0 ${height} L ${SCREEN_WIDTH} ${height}`;
    }
    
    const points = spectrumData.slice(0, numBars).map((value, index) => {
      const x = index * ((SCREEN_WIDTH - 32) / numBars) + 16;
      const y = height - (value * height * 0.8);
      return { x, y };
    });
    
    if (points.length === 0) return `M 0 ${height} L ${SCREEN_WIDTH} ${height}`;
    
    // Créer une courbe de Bézier smooth
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const cp1x = (points[i - 1].x + points[i].x) / 2;
      const cp1y = points[i - 1].y;
      const cp2x = cp1x;
      const cp2y = points[i].y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
    }
    
    // Fermer le path
    path += ` L ${SCREEN_WIDTH - 16} ${height} L 16 ${height} Z`;
    
    return path;
  }, [spectrumData, numBars, height]);
  
  // Couleur basée sur l'intensité
  const getBarColor = useCallback((value: number, index: number) => {
    const colors = MODERN_THEME.effects.gradients.spectrum;
    const colorIndex = Math.floor((index / numBars) * colors.length);
    return colors[Math.min(colorIndex, colors.length - 1)];
  }, [numBars]);
  
  const svgWidth = SCREEN_WIDTH - 32;
  const svgHeight = height;
  
  return (
    <View style={styles.container}>
      <Svg
        width={svgWidth}
        height={svgHeight}
        style={styles.svg}
      >
        <Defs>
          {/* Gradient principal */}
          <SvgLinearGradient id="spectrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={MODERN_THEME.colors.primary.light} stopOpacity="0.8" />
            <Stop offset="50%" stopColor={MODERN_THEME.colors.secondary.base} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={MODERN_THEME.colors.primary.dark} stopOpacity="0.2" />
          </SvgLinearGradient>
          
          {/* Gradient pour les barres */}
          <SvgLinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={MODERN_THEME.colors.primary.light} stopOpacity="1" />
            <Stop offset="100%" stopColor={MODERN_THEME.colors.primary.base} stopOpacity="0.3" />
          </SvgLinearGradient>
          
          {/* Gradient de glow */}
          <SvgLinearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {MODERN_THEME.effects.gradients.spectrum.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (MODERN_THEME.effects.gradients.spectrum.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity="0.6"
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        
        {/* Courbe de fond avec effet de glow */}
        <AnimatedPath
          d={generateWavePath()}
          fill="url(#spectrumGradient)"
          opacity={glowAnim}
        />
        
        {/* Barres individuelles du spectre */}
        <G>
          {spectrumData && spectrumData.slice(0, numBars).map((_, index) => {
            const x = index * ((svgWidth) / numBars) + (barWidth / 2);
            const barHeight = barAnimations[index];
            
            return (
              <G key={index}>
                {/* Effet de glow pour chaque barre */}
                <AnimatedRect
                  x={x - barWidth / 2 - 1}
                  y={Animated.subtract(svgHeight, Animated.multiply(barHeight, svgHeight * 0.9))}
                  width={barWidth + 2}
                  height={Animated.multiply(barHeight, svgHeight * 0.9)}
                  fill={getBarColor(0, index)}
                  opacity={Animated.multiply(barHeight, 0.3)}
                  rx={barWidth / 2}
                />
                
                {/* Barre principale */}
                <AnimatedRect
                  x={x - barWidth / 2}
                  y={Animated.subtract(svgHeight, Animated.multiply(barHeight, svgHeight * 0.8))}
                  width={barWidth}
                  height={Animated.multiply(barHeight, svgHeight * 0.8)}
                  fill="url(#barGradient)"
                  opacity={Animated.add(0.6, Animated.multiply(barHeight, 0.4))}
                  rx={barWidth / 2}
                />
                
                {/* Point lumineux en haut de chaque barre */}
                <AnimatedCircle
                  cx={x}
                  cy={Animated.subtract(svgHeight, Animated.multiply(barHeight, svgHeight * 0.8))}
                  r={Animated.multiply(barHeight, 3)}
                  fill={getBarColor(0, index)}
                  opacity={Animated.multiply(barHeight, 0.8)}
                />
              </G>
            );
          })}
        </G>
        
        {/* Ligne de base avec gradient */}
        <Rect
          x={0}
          y={svgHeight - 2}
          width={svgWidth}
          height={2}
          fill="url(#glowGradient)"
          opacity={0.8}
        />
      </Svg>
      
      {/* Overlay pour effet de profondeur */}
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.1],
            }),
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
};

// Version fallback sans animations complexes
export const ModernSpectrumVisualizerFallback: React.FC<ModernSpectrumVisualizerProps> = ({
  spectrumData,
  height,
  isEnabled,
}) => {
  const barAnimations = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;
  
  useEffect(() => {
    if (spectrumData && isEnabled) {
      spectrumData.slice(0, 20).forEach((value, index) => {
        Animated.spring(barAnimations[index], {
          toValue: value,
          ...ANIMATION_CONFIG.spring.gentle,
          useNativeDriver: false,
        }).start();
      });
    } else {
      barAnimations.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.duration.normal,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [spectrumData, isEnabled, barAnimations]);
  
  return (
    <View style={[styles.container, styles.fallbackContainer]}>
      {barAnimations.slice(0, 20).map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.fallbackBar,
            {
              height: Animated.multiply(anim, height * 0.8),
              backgroundColor: MODERN_THEME.effects.gradients.spectrum[
                Math.floor((index / 20) * MODERN_THEME.effects.gradients.spectrum.length)
              ],
              opacity: Animated.add(0.5, Animated.multiply(anim, 0.5)),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MODERN_THEME.colors.primary.base,
  },
  fallbackContainer: {
    flexDirection: 'row',
    paddingHorizontal: MODERN_THEME.spacing.md,
    alignItems: 'flex-end',
  },
  fallbackBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
    minHeight: 2,
  },
});

export default ModernSpectrumVisualizer;