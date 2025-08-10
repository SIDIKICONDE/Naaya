/**
 * Visualiseur de spectre moderne avec animations 3D
 * Effets visuels avancés et modes de visualisation multiples
 */

import React, { memo, useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { EqualiserTheme, SpectrumAnalyserData } from '../types';

// Animation SVG simplifiée sans wrappers Animated spécifiques

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModernSpectrumVisualizerProps {
  data: SpectrumAnalyserData | null;
  theme: EqualiserTheme;
  height?: number;
  mode?: 'spectrum' | 'waveform' | '3d' | 'circular';
  animated?: boolean;
  fullscreen?: boolean;
}

export const ModernSpectrumVisualizer = memo<ModernSpectrumVisualizerProps>(({
  data,
  theme,
  height = 200,
  mode = 'spectrum',
  animated = true,
  fullscreen = false,
}) => {
  const animationProgress = useSharedValue(0);
  // Suppression des SharedValues par barre pour respecter les règles des hooks

  // Animation continue
  useEffect(() => {
    if (animated) {
      animationProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [animated, animationProgress]);

  // Pas d'animation par barre via hooks, rendu basé sur les données courantes

  const renderSpectrumBars = () => {
    if (!data) return null;

    const barWidth = (SCREEN_WIDTH - 40) / data.frequencies.length;
    const maxMagnitude = Math.max(...data.magnitudes, 1);

    return (
      <Svg width={SCREEN_WIDTH - 20} height={height}>
        <Defs>
          <SvgLinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            {theme.spectrum.gradient.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (theme.spectrum.gradient.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity={1}
              />
            ))}
          </SvgLinearGradient>
        </Defs>

        <G>
          {data.frequencies.map((_, index) => {
            const baseHeight = (data.magnitudes[index] / maxMagnitude) * height * 0.8;
            const opacity = interpolate(
              data.magnitudes[index],
              [0, maxMagnitude],
              [0.3, 1],
              Extrapolate.CLAMP
            );
            const x = index * barWidth + barWidth * 0.1;
            const y = height - baseHeight;
            const w = barWidth * 0.8;
            const h = baseHeight;
            return (
              <Path
                key={index}
                d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`}
                fill="url(#barGradient)"
                opacity={opacity}
              />
            );
          })}

          {/* Peaks */}
          {data.peaks.map((peak, index) => {
            const x = index * barWidth + barWidth * 0.1;
            const w = barWidth * 0.8;
            const h = 2;
            const y = height - (peak / maxMagnitude) * height * 0.8 - h;
            return (
              <Path
                key={`peak-${index}`}
                d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`}
                fill={theme.spectrum.peakColor}
                opacity={0.8}
              />
            );
          })}
        </G>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <Path
            key={ratio}
            d={`M 0 ${height * (1 - ratio)} L ${SCREEN_WIDTH - 20} ${height * (1 - ratio)}`}
            stroke={theme.spectrum.gridColor}
            strokeWidth={0.5}
            strokeDasharray="5,5"
          />
        ))}
      </Svg>
    );
  };

  const renderWaveform = () => {
    if (!data) return null;

    const points = data.magnitudes.map((magnitude, index) => {
      const x = (index / data.magnitudes.length) * (SCREEN_WIDTH - 40);
      const y = height / 2 + (magnitude / Math.max(...data.magnitudes)) * (height / 2) * 
                Math.sin(index * 0.1);
      return `${x},${y}`;
    }).join(' ');

    return (
      <Svg width={SCREEN_WIDTH - 20} height={height}>
        <Defs>
          <SvgLinearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {theme.gradients.spectrum.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (theme.gradients.spectrum.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity={0.8}
              />
            ))}
          </SvgLinearGradient>
        </Defs>

        <Path
          d={`M 0,${height / 2} ${points} L ${SCREEN_WIDTH - 40},${height / 2}`}
          fill="url(#waveGradient)"
          opacity={0.3}
          stroke={theme.primary}
          strokeWidth={2}
        />

        <Path
          d={`M 0,${height / 2} ${points}`}
          fill="none"
          stroke={theme.accent}
          strokeWidth={1}
          opacity={0.5}
        />
      </Svg>
    );
  };

  const render3DVisualization = () => {
    if (!data) return null;

    // Simulation 3D avec perspective
    const layers = 5;
    const layerElements = [];

    for (let layer = 0; layer < layers; layer++) {
      const depth = layer / layers;
      const scale = 1 - depth * 0.3;
      const opacity = 1 - depth * 0.5;
      
      layerElements.push(
        <View
          key={layer}
          style={[
            styles.layer3D,
            {
              transform: [
                { scaleX: scale },
                { scaleY: scale },
                { translateY: layer * 10 },
              ],
              opacity,
              zIndex: layers - layer,
            },
          ]}
        >
          {renderSpectrumBars()}
        </View>
      );
    }

    return (
      <View style={[styles.container3D, { height }]}>
        {layerElements}
      </View>
    );
  };

  const renderCircularVisualization = () => {
    if (!data) return null;

    const centerX = (SCREEN_WIDTH - 20) / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    return (
      <Svg width={SCREEN_WIDTH - 20} height={height}>
        <Defs>
          <SvgLinearGradient id="circularGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {theme.gradients.primary.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (theme.gradients.primary.length - 1)) * 100}%`}
                stopColor={color}
                stopOpacity={0.8}
              />
            ))}
          </SvgLinearGradient>
        </Defs>

        <G transform={`translate(${centerX}, ${centerY})`}>
          {data.frequencies.map((_, index) => {
            const angle = (index / data.frequencies.length) * Math.PI * 2 - Math.PI / 2;
            const magnitude = data.magnitudes[index] / Math.max(...data.magnitudes);
            const barLength = radius * (0.5 + magnitude * 0.5);
            
            const x1 = Math.cos(angle) * radius * 0.3;
            const y1 = Math.sin(angle) * radius * 0.3;
            const x2 = Math.cos(angle) * barLength;
            const y2 = Math.sin(angle) * barLength;

            return (
              <Path
                key={index}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="url(#circularGradient)"
                strokeWidth={Math.max(1, (SCREEN_WIDTH - 20) / data.frequencies.length * 0.5)}
                strokeLinecap="round"
                opacity={0.3 + magnitude * 0.7}
              />
            );
          })}

          {/* Centre glow */}
          <Circle
            cx={0}
            cy={0}
            r={radius * 0.25}
            fill={theme.primary}
            opacity={0.2}
          />
          <Circle
            cx={0}
            cy={0}
            r={radius * 0.15}
            fill={theme.accent}
            opacity={0.4}
          />
        </G>
      </Svg>
    );
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animationProgress.value,
      [0, 0.5, 1],
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <Animated.View 
      style={[
        styles.container,
        fullscreen && styles.fullscreen,
        containerAnimatedStyle,
      ]}
    >
      {mode === 'spectrum' && renderSpectrumBars()}
      {mode === 'waveform' && renderWaveform()}
      {mode === '3d' && render3DVisualization()}
      {mode === 'circular' && renderCircularVisualization()}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  svg: {
    // SVG styles
  },
  container3D: {
    position: 'relative',
    width: SCREEN_WIDTH - 20,
  },
  layer3D: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});
