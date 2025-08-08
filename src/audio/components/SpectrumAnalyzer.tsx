/**
 * Composant de visualisation du spectre audio
 * Affiche les données spectrales en temps réel
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useEqualizer, useSpectrumAnalyzer } from '../hooks';

interface SpectrumAnalyzerProps {
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  barSpacing?: number;
  animationDuration?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = memo(({
  height = 150,
  barColor = '#007AFF',
  backgroundColor = '#000000',
  barSpacing = 2,
  animationDuration = 100,
}) => {
  const { spectrumData, startSpectrumAnalysis, stopSpectrumAnalysis } = useEqualizer();
  
  const { barCount, getBarStyle } = useSpectrumAnalyzer(spectrumData, {
    animationDuration,
    minHeight: 2,
    maxHeight: height - 10,
  });

  // Démarrer/arrêter l'analyse automatiquement
  useEffect(() => {
    startSpectrumAnalysis(50); // Mise à jour toutes les 50ms
    
    return () => {
      stopSpectrumAnalysis();
    };
  }, [startSpectrumAnalysis, stopSpectrumAnalysis]);

  // Calculer la largeur de chaque barre
  const barWidth = (screenWidth - (barCount + 1) * barSpacing) / barCount;

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View style={styles.barsContainer}>
        {Array.from({ length: barCount }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                backgroundColor: barColor,
                marginHorizontal: barSpacing / 2,
              },
              getBarStyle(index),
            ]}
          />
        ))}
      </View>
    </View>
  );
});

SpectrumAnalyzer.displayName = 'SpectrumAnalyzer';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});