import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { RecordingState, ThemeConfig } from '../types';

interface RecordingBarProps {
  recordingState: RecordingState;
  durationSec?: number;
  theme: ThemeConfig;
  disabled?: boolean;
  onRecordPress: () => void;
  onPausePress?: () => void;
  fps?: number;
  // Insertion d'accessoires (ex: menu trois points)
  rightAccessory?: React.ReactNode;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hh = h > 0 ? String(h).padStart(2, '0') + ':' : '';
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}${mm}:${ss}`;
}

// Composants d'icônes premium
const RecordIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#FFFFFF' }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  }} />
);

const StopIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#FFFFFF' }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: 2,
    backgroundColor: color,
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  }} />
);

const PlayIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#FFFFFF' }) => (
  <View style={{
    width: 0,
    height: 0,
    borderLeftWidth: size * 0.8,
    borderLeftColor: color,
    borderTopWidth: size * 0.5,
    borderTopColor: 'transparent',
    borderBottomWidth: size * 0.5,
    borderBottomColor: 'transparent',
    marginLeft: 2,
    shadowColor: color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  }} />
);

const PauseIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#FFFFFF' }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    <View style={{
      width: size * 0.35,
      height: size,
      borderRadius: 1,
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    }} />
    <View style={{
      width: size * 0.35,
      height: size,
      borderRadius: 1,
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    }} />
  </View>
);

const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#FFFFFF' }) => (
  <Text style={{
    fontSize: size,
    fontWeight: '900',
    color: color,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }}>✓</Text>
);



export const RecordingBar: React.FC<RecordingBarProps> = memo(({ 
  recordingState,
  durationSec = 0,
  theme,
  disabled = false,
  onRecordPress,
  onPausePress,
  fps,
  rightAccessory,
}) => {
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Animation du pulse pour le point d'enregistrement
  useEffect(() => {
    if (recordingState === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Animation du glow
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [recordingState, pulseAnim, glowAnim]);

  // Animation d'apparition
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // Animation de la barre de progression
  useEffect(() => {
    if (recordingState === 'recording' && durationSec > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min(durationSec / 3600, 1), // Max 1 heure pour la barre
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [durationSec, recordingState, progressAnim]);

  const timeText = useMemo(() => formatDuration(durationSec), [durationSec]);

  const canPause = recordingState === 'recording' && !!onPausePress;
  const showResume = recordingState === 'paused';
  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isProcessing = recordingState === 'processing';

  // Couleurs dynamiques
  const statusColor = isRecording ? '#FF3B30' : isPaused ? '#FF9500' : isProcessing ? '#34C759' : theme.accentColor;

  const containerBackgroundColor = theme.isDark 
    ? 'rgba(0, 0, 0, 0.75)' 
    : 'rgba(255, 255, 255, 0.85)';
  
  const pauseButtonStyles = {
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: containerBackgroundColor,
          transform: [
            { 
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              })
            }
          ],
        }
      ]}
    >
      {/* Barre de progression en haut */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: statusColor,
          }
        ]}
      />

      {/* Conteneur principal */}
      <View style={styles.content}>
        {/* Section gauche - Statut et temps */}
        <View style={styles.leftSection}>
          <View style={styles.statusContainer}>
            {/* Point de statut avec animations */}
            <View style={styles.statusDotContainer}>
              <Animated.View
                style={[
                  styles.statusGlow,
                  {
                    opacity: glowAnim,
                    backgroundColor: statusColor,
                    transform: [{ scale: pulseAnim }],
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: statusColor,
                    transform: [{ scale: isRecording ? pulseAnim : 1 }],
                  }
                ]}
              />
            </View>

            {/* Temps avec style monospace */}
            <View style={styles.timeContainer}>
              <Text style={[styles.timeMain, { color: theme.textColor }]}>
                {timeText}
              </Text>
              {isRecording && (
                <Text style={[styles.liveLabel, { color: statusColor }]}>
                  LIVE
                </Text>
              )}
              {isPaused && (
                <Text style={[styles.pausedLabel, { color: statusColor }]}>
                  PAUSED
                </Text>
              )}
              {isProcessing && (
                <Text style={[styles.processingLabel, { color: statusColor }]}>
                  SAVING
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Section droite - Contrôles et accessoire (alignés horizontalement) */}
        <View style={styles.rightSection}>
          {/* Boutons de contrôle + accessoire sur la même ligne */}
          <View style={styles.controlsContainer}>
            {canPause && (
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.pauseButton,
                  pauseButtonStyles,
                ]}
                onPress={onPausePress}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <PauseIcon size={14} color={theme.textColor} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.mainButton,
                { 
                  backgroundColor: statusColor,
                  borderColor: statusColor,
                }
              ]}
              onPress={onRecordPress}
              disabled={disabled}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <StopIcon size={16} color="#FFFFFF" />
              ) : showResume ? (
                <PlayIcon size={16} color="#FFFFFF" />
              ) : isProcessing ? (
                <CheckIcon size={16} color="#FFFFFF" />
              ) : (
                <RecordIcon size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {rightAccessory && (
              <View style={styles.accessoryAfter}>
                {rightAccessory}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Indicateur de qualité en bas */}
      {isRecording && (
        <View style={[styles.qualityIndicator, { backgroundColor: statusColor }]}>
          <Text style={styles.qualityText}>
            HD • {fps || 30}fps
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

RecordingBar.displayName = 'RecordingBar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minHeight: 48,
    borderRadius: 24,
    alignSelf: 'flex-start',
    width: '75%',
    maxWidth: 320,
    marginTop: 25,
    marginBottom: -20,
    marginLeft: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderRadius: 24,
    opacity: 0.9,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingTop: 9, // Espace pour la barre de progression
  },

  // Section gauche
  leftSection: {
    flex: 4,
    flexDirection: 'column',
    gap: 1,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDotContainer: {
    position: 'relative',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.6,
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },

  timeMain: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  liveLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  pausedLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.4)',
    overflow: 'hidden',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  processingLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Section droite
  rightSection: {
    alignItems: 'center',
    gap: 4,
  },

  accessoryAfter: {
    marginLeft: 4,
  },



  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  mainButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  controlIcon: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  mainIcon: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Styles pour les nouveaux composants d'icônes
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  qualityIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qualityText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  whiteText: {
    color: '#FFFFFF',
  },
});


