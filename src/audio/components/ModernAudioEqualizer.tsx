/**
 * Composant principal de l'égaliseur audio moderne
 * Interface complète avec animations fluides et design glassmorphism
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Vibration,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { 
  MODERN_THEME, 
  ANIMATION_CONFIG,
  EQUALIZER_DIMENSIONS,
  FREQUENCY_CONFIG,
  TOUCH_CONFIG 
} from '../constants/theme';
import { useEqualizer } from '../hooks';
import EqualizerService from '../services/EqualizerService';
import { ModernFrequencyBand } from './ModernFrequencyBand';
import { ModernPresetSelector } from './ModernPresetSelector';
import { ModernSpectrumVisualizer } from './ModernSpectrumVisualizer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModernAudioEqualizerProps {
  enableSpectrum?: boolean;
  onError?: (error: Error) => void;
}

export const ModernAudioEqualizer: React.FC<ModernAudioEqualizerProps> = ({
  enableSpectrum = true,
  onError,
}) => {
  const {
    isEnabled,
    currentPreset,
    bands,
    spectrumData,
    isLoading,
    error,
    setEnabled,
    setBandGain,
    setPreset,
    reset,
  } = useEqualizer();

  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation d'entrée
  React.useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.duration.slow,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...ANIMATION_CONFIG.spring.bouncy,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, fadeAnim, slideAnim]);
  
  // Animation de pulsation pour l'état actif
  React.useEffect(() => {
    if (isEnabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isEnabled, pulseAnim]);
  
  // Gestion des erreurs
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  // Toggle de l'égaliseur avec animation
  const handleToggleEqualizer = useCallback(async (value: boolean) => {
    try {
      // Animation de rotation du switch
      Animated.spring(rotateAnim, {
        toValue: value ? 1 : 0,
        ...ANIMATION_CONFIG.spring.bouncy,
        useNativeDriver: true,
      }).start();
      
      await setEnabled(value);
      
      if (Platform.OS === 'ios') {
        Vibration.vibrate(value ? TOUCH_CONFIG.haptic.success : TOUCH_CONFIG.haptic.light);
      }
    } catch (err) {
      console.error('Erreur lors de l\'activation:', err);
    }
  }, [setEnabled, rotateAnim]);
  
  // Changement de gain optimisé avec batch
  const batchTimeout = useRef<NodeJS.Timeout>();
  const handleBandGainChange = useCallback((bandId: string, gain: number) => {
    // Démarrer un batch pour optimiser les performances
    try { 
      (EqualizerService as any)?.beginBatch?.(); 
    } catch {}
    
    if (batchTimeout.current) clearTimeout(batchTimeout.current);
    
    batchTimeout.current = setTimeout(() => {
      setBandGain(Number(bandId), gain);
      try { 
        (EqualizerService as any)?.endBatch?.(); 
      } catch {}
    }, 16); // ~60fps
  }, [setBandGain]);
  
  // Sélection de preset avec animation
  const handlePresetSelect = useCallback(async (presetId: string) => {
    try {
      if (!isEnabled) {
        await setEnabled(true);
      }
      
      // Animation de confirmation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: ANIMATION_CONFIG.duration.instant,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
      
      await setPreset(presetId);
      
      if (Platform.OS === 'ios') {
        Vibration.vibrate(TOUCH_CONFIG.haptic.selection);
      }
    } catch (err) {
      console.error('Erreur lors de l\'application du préréglage:', err);
    }
  }, [isEnabled, setEnabled, setPreset, fadeAnim]);
  
  // Reset avec animation
  const handleReset = useCallback(async () => {
    try {
      // Animation de reset
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
      
      await reset();
      
      if (Platform.OS === 'ios') {
        Vibration.vibrate(TOUCH_CONFIG.haptic.success);
      }
    } catch (err) {
      console.error('Erreur lors de la réinitialisation:', err);
    }
  }, [reset, fadeAnim]);
  
  // Toggle vue avancée
  const toggleAdvancedView = useCallback(() => {
    setShowAdvanced(!showAdvanced);
    if (Platform.OS === 'ios') {
      Vibration.vibrate(TOUCH_CONFIG.haptic.light);
    }
  }, [showAdvanced]);
  
  // Normalisation des données du spectre
  const normalizedSpectrumData = React.useMemo(() => {
    return spectrumData ? spectrumData.map(v => Math.max(0, Math.min(1, v))) : null;
  }, [spectrumData]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={MODERN_THEME.effects.gradients.primary}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color={MODERN_THEME.colors.text.primary} />
          <Text style={styles.loadingText}>Initialisation de l'égaliseur...</Text>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      {/* Fond avec gradient animé */}
      <LinearGradient
        colors={[MODERN_THEME.colors.background, MODERN_THEME.colors.backgroundSecondary]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
      >
        {/* Header moderne avec glassmorphism */}
        <View style={styles.header}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={20}
          />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Égaliseur Audio</Text>
              <View style={[styles.statusBadge, isEnabled && styles.statusBadgeActive]}>
                <View style={[styles.statusDot, isEnabled && styles.statusDotActive]} />
                <Text style={styles.statusText}>
                  {isEnabled ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
            
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Switch
                value={isEnabled}
                onValueChange={handleToggleEqualizer}
                trackColor={{
                  false: MODERN_THEME.colors.border.default,
                  true: MODERN_THEME.colors.primary.base,
                }}
                thumbColor={isEnabled ? MODERN_THEME.colors.text.primary : MODERN_THEME.colors.text.secondary}
                ios_backgroundColor={MODERN_THEME.colors.surface}
              />
            </Animated.View>
          </View>
        </View>
        
        {/* Visualiseur de spectre moderne */}
        {enableSpectrum && isEnabled && (
          <Animated.View 
            style={[
              styles.visualizerContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[MODERN_THEME.colors.surface, MODERN_THEME.colors.surfaceElevated]}
              style={styles.visualizerGradient}
            >
              <ModernSpectrumVisualizer
                spectrumData={normalizedSpectrumData}
                height={EQUALIZER_DIMENSIONS.visualizer.height}
                isEnabled={isEnabled}
              />
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* Sélecteur de présets moderne */}
        <View style={styles.presetsSection}>
          <ModernPresetSelector
            currentPreset={currentPreset}
            onPresetSelect={handlePresetSelect}
            disabled={!isEnabled}
          />
        </View>
        
        {/* Contrôles des fréquences */}
        <View style={styles.frequencySection}>
          <View style={styles.frequencySectionHeader}>
            <Text style={styles.sectionTitle}>Ajustements manuels</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={toggleAdvancedView}
                style={styles.advancedButton}
              >
                <Text style={styles.advancedButtonText}>
                  {showAdvanced ? 'Simple' : 'Avancé'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReset}
                disabled={!isEnabled}
                style={[styles.resetButton, !isEnabled && styles.resetButtonDisabled]}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>
          
          {/* Conteneur des sliders avec effet glassmorphism */}
          <View style={styles.slidersWrapper}>
            <LinearGradient
              colors={[MODERN_THEME.colors.surface + '80', MODERN_THEME.colors.surfaceElevated + '80']}
              style={styles.slidersGradient}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slidersContainer}
                snapToInterval={EQUALIZER_DIMENSIONS.slider.containerWidth + 8}
                decelerationRate="fast"
              >
                {bands.map((band, index) => {
                  const config = FREQUENCY_CONFIG[index];
                  const magnitude = normalizedSpectrumData?.[index] || 0;
                  
                  return (
                    <ModernFrequencyBand
                      key={band.index}
                      id={band.index.toString()}
                      frequency={band.frequency}
                      gain={band.gain}
                      minGain={-24}
                      maxGain={24}
                      label={config?.label || band.label}
                      color={config?.color || MODERN_THEME.colors.primary.base}
                      magnitude={magnitude}
                      onGainChange={handleBandGainChange}
                      disabled={!isEnabled}
                      index={index}
                    />
                  );
                })}
              </ScrollView>
            </LinearGradient>
          </View>
          
          {/* Vue avancée avec plus d'options */}
          {showAdvanced && (
            <Animated.View style={styles.advancedSection}>
              <View style={styles.advancedControls}>
                <Text style={styles.advancedText}>
                  Q Factor: 0.707
                </Text>
                <Text style={styles.advancedText}>
                  Gain Range: ±24 dB
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
        
        {/* Message d'erreur stylisé */}
        {error && (
          <Animated.View style={styles.errorContainer}>
            <LinearGradient
              colors={[MODERN_THEME.colors.danger + '20', MODERN_THEME.colors.danger + '10']}
              style={styles.errorGradient}
            >
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error.message}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MODERN_THEME.colors.background,
  },
  loadingGradient: {
    padding: MODERN_THEME.spacing.xl,
    borderRadius: MODERN_THEME.borderRadius.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: MODERN_THEME.spacing.md,
    fontSize: MODERN_THEME.typography.fontSize.lg,
    color: MODERN_THEME.colors.text.primary,
    fontWeight: '500',
  },
  header: {
    height: 80,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: MODERN_THEME.colors.border.default,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingTop: MODERN_THEME.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: MODERN_THEME.typography.fontSize.xxl,
    fontWeight: '700',
    color: MODERN_THEME.colors.text.primary,
    marginBottom: MODERN_THEME.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MODERN_THEME.spacing.sm,
    paddingVertical: 4,
    backgroundColor: MODERN_THEME.colors.surface,
    borderRadius: MODERN_THEME.borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: MODERN_THEME.colors.primary.base + '20',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MODERN_THEME.colors.text.tertiary,
    marginRight: MODERN_THEME.spacing.xs,
  },
  statusDotActive: {
    backgroundColor: MODERN_THEME.colors.primary.base,
  },
  statusText: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    color: MODERN_THEME.colors.text.secondary,
    fontWeight: '500',
  },
  visualizerContainer: {
    marginHorizontal: MODERN_THEME.spacing.md,
    marginVertical: MODERN_THEME.spacing.md,
    height: EQUALIZER_DIMENSIONS.visualizer.height,
    borderRadius: MODERN_THEME.borderRadius.lg,
    overflow: 'hidden',
    ...MODERN_THEME.effects.shadows.large,
  },
  visualizerGradient: {
    flex: 1,
    padding: 2,
  },
  presetsSection: {
    marginVertical: MODERN_THEME.spacing.sm,
  },
  frequencySection: {
    marginTop: MODERN_THEME.spacing.md,
  },
  frequencySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MODERN_THEME.spacing.md,
    marginBottom: MODERN_THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: MODERN_THEME.typography.fontSize.lg,
    fontWeight: '600',
    color: MODERN_THEME.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: MODERN_THEME.spacing.sm,
  },
  advancedButton: {
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingVertical: MODERN_THEME.spacing.xs,
    backgroundColor: MODERN_THEME.colors.surface,
    borderRadius: MODERN_THEME.borderRadius.md,
  },
  advancedButtonText: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    color: MODERN_THEME.colors.text.secondary,
    fontWeight: '500',
  },
  resetButton: {
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingVertical: MODERN_THEME.spacing.xs,
    backgroundColor: MODERN_THEME.colors.primary.base + '20',
    borderRadius: MODERN_THEME.borderRadius.md,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    color: MODERN_THEME.colors.primary.light,
    fontWeight: '600',
  },
  slidersWrapper: {
    marginHorizontal: MODERN_THEME.spacing.md,
    borderRadius: MODERN_THEME.borderRadius.lg,
    overflow: 'hidden',
    ...MODERN_THEME.effects.shadows.medium,
  },
  slidersGradient: {
    paddingVertical: MODERN_THEME.spacing.md,
  },
  slidersContainer: {
    paddingHorizontal: MODERN_THEME.spacing.sm,
    alignItems: 'flex-end',
  },
  advancedSection: {
    marginTop: MODERN_THEME.spacing.md,
    marginHorizontal: MODERN_THEME.spacing.md,
    padding: MODERN_THEME.spacing.md,
    backgroundColor: MODERN_THEME.colors.surface,
    borderRadius: MODERN_THEME.borderRadius.md,
  },
  advancedControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  advancedText: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    color: MODERN_THEME.colors.text.secondary,
  },
  errorContainer: {
    marginHorizontal: MODERN_THEME.spacing.md,
    marginTop: MODERN_THEME.spacing.md,
    borderRadius: MODERN_THEME.borderRadius.md,
    overflow: 'hidden',
  },
  errorGradient: {
    padding: MODERN_THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginRight: MODERN_THEME.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: MODERN_THEME.typography.fontSize.md,
    color: MODERN_THEME.colors.danger,
    fontWeight: '500',
  },
});

export default ModernAudioEqualizer;