/**
 * Hook React pour l'analyseur de spectre
 * Gère l'animation et la visualisation des données spectrales
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface UseSpectrumAnalyzerOptions {
  barCount?: number;
  animationDuration?: number;
  minHeight?: number;
  maxHeight?: number;
}

export const useSpectrumAnalyzer = (
  spectrumData: number[] | null,
  options: UseSpectrumAnalyzerOptions = {}
) => {
  const {
    barCount = 32,
    animationDuration = 100,
    minHeight = 5,
    maxHeight = 100,
  } = options;

  // Créer les valeurs animées pour chaque barre
  const animatedValues = useRef<Animated.Value[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialiser les valeurs animées
  useEffect(() => {
    if (animatedValues.current.length === 0) {
      animatedValues.current = Array.from(
        { length: barCount },
        () => new Animated.Value(minHeight)
      );
      setIsInitialized(true);
    }
  }, [barCount, minHeight]);

  // Animer les barres en fonction des données spectrales
  useEffect(() => {
    if (!isInitialized || !spectrumData || spectrumData.length === 0) {
      // Réinitialiser toutes les barres à la hauteur minimale
      if (isInitialized) {
        Animated.parallel(
          animatedValues.current.map(value =>
            Animated.timing(value, {
              toValue: minHeight,
              duration: animationDuration,
              useNativeDriver: false,
            })
          )
        ).start();
      }
      return;
    }

    // Calculer le nombre de points de données par barre
    const dataPointsPerBar = Math.floor(spectrumData.length / barCount);
    
    // Animer chaque barre
    const animations = animatedValues.current.map((value, index) => {
      // Calculer la moyenne des points de données pour cette barre
      const startIdx = index * dataPointsPerBar;
      const endIdx = Math.min(startIdx + dataPointsPerBar, spectrumData.length);
      
      let sum = 0;
      for (let i = startIdx; i < endIdx; i++) {
        sum += spectrumData[i];
      }
      const average = endIdx > startIdx ? sum / (endIdx - startIdx) : 0;
      
      // Normaliser la valeur entre minHeight et maxHeight
      const normalizedValue = minHeight + (average / 255) * (maxHeight - minHeight);
      
      return Animated.timing(value, {
        toValue: normalizedValue,
        duration: animationDuration,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [spectrumData, isInitialized, barCount, animationDuration, minHeight, maxHeight]);

  // Obtenir les styles pour chaque barre
  const getBarStyle = useCallback((index: number) => {
    if (!isInitialized || index >= animatedValues.current.length) {
      return { height: minHeight };
    }
    
    return {
      height: animatedValues.current[index],
    };
  }, [isInitialized, minHeight]);

  // Obtenir toutes les valeurs animées
  const getAnimatedValues = useCallback(() => {
    return animatedValues.current;
  }, []);

  // Réinitialiser l'analyseur
  const reset = useCallback(() => {
    if (isInitialized) {
      Animated.parallel(
        animatedValues.current.map(value =>
          Animated.timing(value, {
            toValue: minHeight,
            duration: animationDuration,
            useNativeDriver: false,
          })
        )
      ).start();
    }
  }, [isInitialized, minHeight, animationDuration]);

  return {
    barCount,
    getBarStyle,
    getAnimatedValues,
    reset,
    isInitialized,
  };
};