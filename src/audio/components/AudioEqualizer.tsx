/**
 * Composant principal de l'égaliseur audio
 * Interface complète avec design moderne et modulaire
 */

import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEME_COLORS } from '../constants';
import { useEqualizer } from '../hooks';
import EqualizerService from '../services/EqualizerService';
import { FrequencyBand } from './FrequencyBand';
import { PresetSelector } from './PresetSelector';
import { SpectrumVisualizer, SpectrumVisualizerFallback } from './SpectrumVisualizer';

interface AudioEqualizerProps {
  enableSpectrum?: boolean;
  onError?: (error: Error) => void;
}



export const AudioEqualizer: React.FC<AudioEqualizerProps> = ({
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

  const enabled = isEnabled;
  const loading = isLoading;

  // Adapter l'échelle des données spectrales (normalisées 0..1 côté natif Android; iOS peut renvoyer 0)
  const normalizedSpectrumData = React.useMemo(() => {
    return spectrumData ? spectrumData.map(v => Math.max(0, Math.min(1, v))) : null;
  }, [spectrumData]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleToggleEqualizer = useCallback(async (value: boolean) => {
    try {
      await setEnabled(value);
    } catch (err) {
      console.error('Erreur lors de l\'activation:', err);
    }
  }, [setEnabled]);

  const throttledSetBand = React.useRef<number | null>(null);
  const handleBandGainChange = useCallback((bandId: string, gain: number) => {
    // Démarrer un batch pour réduire recalculs natifs
    try { (EqualizerService as any)?.beginBatch?.(); } catch {}
    if (throttledSetBand.current) clearTimeout(throttledSetBand.current as any);
    throttledSetBand.current = (setTimeout(() => {
      setBandGain(Number(bandId), gain);
      try { (EqualizerService as any)?.endBatch?.(); } catch {}
    }, 32) as unknown) as number;
  }, [setBandGain]);

  const handlePresetSelect = useCallback(async (presetId: string) => {
    try {
      if (!enabled) {
        try { await setEnabled(true); } catch {}
      }
      await setPreset(presetId);
    } catch (err) {
      console.error('Erreur lors de l\'application du préréglage:', err);
    }
  }, [enabled, setEnabled, setPreset]);

  const handleReset = useCallback(async () => {
    try {
      await reset();
    } catch (err) {
      console.error('Erreur lors de la réinitialisation:', err);
    }
  }, [reset]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de l'égaliseur...</Text>
      </View>
    );
  }

  // Utiliser le visualiseur Skia ou le fallback selon la disponibilité
  const VisualizerComponent = Platform.select({
    ios: SpectrumVisualizer,
    android: SpectrumVisualizerFallback,
    default: SpectrumVisualizerFallback,
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Égaliseur Audio</Text>
            <Text style={styles.subtitle}>
              {enabled ? 'Actif' : 'Inactif'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggleEqualizer}
            trackColor={{
              false: THEME_COLORS.border,
              true: THEME_COLORS.primary,
            }}
            thumbColor={enabled ? THEME_COLORS.text : THEME_COLORS.textSecondary}
            ios_backgroundColor={THEME_COLORS.border}
          />
        </View>

        {/* Visualiseur de spectre */}
        {enableSpectrum && enabled && (
          <View style={styles.visualizerContainer}>
            <VisualizerComponent
              spectrumData={normalizedSpectrumData}
              height={120}
              style={styles.visualizer}
            />
          </View>
        )}

        {/* Conteneur des préréglages */}
        <View style={styles.presetsSection}>
          <View style={styles.presetsSectionHeader}>
            <Text style={styles.presetsSectionTitle}>Préréglages audio</Text>
            <View style={styles.presetIndicator}>
              <Text style={styles.presetIndicatorText}>
                {currentPreset || 'Personnalisé'}
              </Text>
            </View>
          </View>
          
          <View style={styles.presetsContainer}>
            <PresetSelector
              currentPreset={currentPreset}
              onPresetSelect={handlePresetSelect}
              disabled={false}
              showHeader={false}
            />
          </View>
        </View>

        {/* Conteneur des bandes de fréquence */}
        <View style={styles.bandsSection}>
          <View style={styles.bandsSectionHeader}>
            <Text style={styles.bandsSectionTitle}>Ajustements des fréquences</Text>
            <TouchableOpacity
              onPress={handleReset}
              disabled={!enabled}
              style={styles.resetButton}
            >
              <Text style={[styles.resetButtonText, !enabled && styles.disabledText]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Conteneur principal des fréquences */}
          <View style={styles.frequencyContainer}>
            {/* Labels des groupes de fréquences */}
            <View style={styles.frequencyLabels}>
              <Text style={styles.frequencyGroupLabel}>Graves</Text>
              <Text style={styles.frequencyGroupLabel}>Médiums</Text>
              <Text style={styles.frequencyGroupLabel}>Aigus</Text>
            </View>
            
            {/* Sliders dans un conteneur avec fond */}
            <View style={styles.slidersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bandsContainer}
                decelerationRate="fast"
                scrollEnabled={true}
                nestedScrollEnabled={false}
                directionalLockEnabled={true}
              >
                {bands.map((band) => {
                  const spectrumMagnitude = spectrumData
                    ? spectrumData[bands.indexOf(band)] || 0
                    : 0;
                  
                  return (
                    <FrequencyBand
                      key={band.index}
                      id={band.index.toString()}
                      frequency={band.frequency}
                      gain={band.gain}
                      minGain={-24}
                      maxGain={24}
                      label={band.label}
                      magnitude={spectrumMagnitude}
                      onGainChange={handleBandGainChange}
                      disabled={!enabled}
                    />
                  );
                })}
              </ScrollView>
            </View>
            
            {/* Échelle de gain */}
            <View style={styles.gainScale}>
              <Text style={styles.gainScaleText}>+24 dB</Text>
              <Text style={styles.gainScaleText}>0 dB</Text>
              <Text style={styles.gainScaleText}>-24 dB</Text>
            </View>
          </View>
        </View>

        {/* Informations supplémentaires */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ {error.message}
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
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
    backgroundColor: THEME_COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME_COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: THEME_COLORS.textSecondary,
  },
  visualizerContainer: {
    marginHorizontal: 10,
    marginBottom: 16,
    height: 100,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  visualizer: {
    flex: 1,
  },
  bandsSection: {
    marginTop: 16,
  },
  bandsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bandsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.primary,
  },
  disabledText: {
    color: THEME_COLORS.textSecondary,
    opacity: 0.5,
  },
  presetsSection: {
    marginTop: 16,
  },
  presetsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text,
  },
  presetIndicator: {
    backgroundColor: THEME_COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.primary + '40',
  },
  presetIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME_COLORS.primary,
    textTransform: 'uppercase',
  },
  presetsContainer: {
    backgroundColor: THEME_COLORS.surface,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  frequencyContainer: {
    backgroundColor: THEME_COLORS.surface,
    marginHorizontal: 10,
    borderRadius: 10,
    padding: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  frequencyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  frequencyGroupLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  slidersContainer: {
    backgroundColor: THEME_COLORS.background,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  bandsContainer: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  gainScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  gainScaleText: {
    fontSize: 9,
    fontWeight: '500',
    color: THEME_COLORS.textSecondary,
    opacity: 0.7,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: THEME_COLORS.danger + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.danger + '40',
  },
  errorText: {
    fontSize: 14,
    color: THEME_COLORS.danger,
    textAlign: 'center',
  },
});
