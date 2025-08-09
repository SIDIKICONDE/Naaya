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
      await setPreset(presetId);
    } catch (err) {
      console.error('Erreur lors de l\'application du préréglage:', err);
    }
  }, [setPreset]);

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

        {/* Sélecteur de préréglages */}
        <PresetSelector
          currentPreset={currentPreset}
          onPresetSelect={handlePresetSelect}
          disabled={!enabled}
        />

        {/* Bandes de fréquence */}
        <View style={styles.bandsSection}>
          <View style={styles.bandsSectionHeader}>
            <Text style={styles.bandsSectionTitle}>Ajustements manuels</Text>
            <TouchableOpacity
              onPress={handleReset}
              disabled={!enabled}
              style={styles.resetButton}
            >
              <Text style={[styles.resetButtonText, !enabled && styles.disabledText]}>
                Réinitialiser
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bandsContainer}
            decelerationRate="fast"
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: THEME_COLORS.textSecondary,
  },
  visualizerContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    height: 120,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 16,
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
    marginTop: 24,
  },
  bandsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bandsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME_COLORS.text,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME_COLORS.primary,
  },
  disabledText: {
    color: THEME_COLORS.textSecondary,
    opacity: 0.5,
  },
  bandsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
