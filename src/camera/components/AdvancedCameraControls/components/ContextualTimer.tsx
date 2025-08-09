/**
 * Timer contextuel pour l'enregistrement vidéo
 * Affiche durée, métadonnées et indicateurs visuels adaptatifs
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ContextualTimerProps, ThemeConfig } from '../types';

interface ContextualTimerInternalProps extends ContextualTimerProps {
  theme: ThemeConfig;
}

export const ContextualTimer = memo<ContextualTimerInternalProps>(({
  recordingMetadata,
  mode,
  visible,
  position = 'top',
  showDetails = false,
  theme,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Animation de pulsation du point rouge
  useEffect(() => {
    if (visible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [visible, pulseAnim]);

  // Animation d'apparition/disparition
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 300,
          friction: 20,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === 'top' ? -50 : 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, position]);

  // Formatage du temps
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Formatage de la taille de fichier
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Couleur de statut selon la durée
  const getStatusColor = useCallback((duration: number) => {
    if (duration < 30) return '#4CAF50'; // Vert
    if (duration < 120) return '#FF9800'; // Orange
    return '#F44336'; // Rouge
  }, []);

  // Contenu du timer
  const timerContent = useMemo(() => (
    <View style={styles.content}>
      {/* Point rouge pulsant */}
      <Animated.View
        style={[
          styles.recordDot,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
            backgroundColor: getStatusColor(recordingMetadata.duration),
          },
        ]}
      />

      {/* Temps principal */}
      <Text style={[styles.timeText, { color: theme.textColor }]}>
        {formatDuration(recordingMetadata.duration)}
      </Text>

      {/* Détails supplémentaires */}
      {showDetails && (
        <View style={styles.details}>
          <Text style={[styles.detailText, { color: theme.textColor }]}>
            {recordingMetadata.resolution} • {recordingMetadata.frameRate}fps
          </Text>
          {recordingMetadata.fileSize > 0 && (
            <Text style={[styles.detailText, { color: theme.textColor }]}>
              {formatFileSize(recordingMetadata.fileSize)}
            </Text>
          )}
        </View>
      )}

      {/* Indicateur de mode */}
      <View style={[styles.modeIndicator, { backgroundColor: theme.accentColor }]}>
        <Text style={styles.modeText}>
          {mode.toUpperCase()}
        </Text>
      </View>
    </View>
  ), [
    recordingMetadata,
    theme,
    showDetails,
    formatDuration,
    formatFileSize,
    getStatusColor,
    pulseAnim,
    mode,
  ]);

  if (!visible) return null;

  const containerStyle = [
    styles.container,
    position === 'top' && styles.containerTop,
    position === 'bottom' && styles.containerBottom,
    position === 'floating' && styles.containerFloating,
    style,
  ];

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Arrière-plan avec couleur unie */}
      <View
        style={[
          styles.background,
          {
            backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          },
        ]}
      >
        {timerContent}
      </View>
    </Animated.View>
  );
});

ContextualTimer.displayName = 'ContextualTimer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  containerTop: {
    top: 60,
    alignSelf: 'center',
  },
  containerBottom: {
    bottom: 120,
    alignSelf: 'center',
  },
  containerFloating: {
    top: '50%',
    left: 20,
    marginTop: -30,
  },
  background: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  details: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  detailText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.8,
    lineHeight: 12,
  },
  modeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  modeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
