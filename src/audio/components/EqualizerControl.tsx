/**
 * Composant de contrôle de l'égaliseur
 * Interface principale pour ajuster les bandes de fréquence
 */

import Slider from '@react-native-community/slider';
import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEqualizer } from '../hooks';
import type { EqualizerBand } from '../types';

interface EqualizerControlProps {
  onClose?: () => void;
  showSpectrum?: boolean;
}

export const EqualizerControl: React.FC<EqualizerControlProps> = memo(({
  onClose,
}) => {
  const {
    isEnabled,
    bands,
    currentPreset,
    presets,
    isLoading,
    error,
    setEnabled,
    setBandGain,
    setPreset,
    reset,
  } = useEqualizer();

  const handleBandChange = useCallback((bandIndex: number, value: number) => {
    setBandGain(bandIndex, value);
  }, [setBandGain]);

  const handlePresetSelect = useCallback((presetName: string) => {
    setPreset(presetName);
  }, [setPreset]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement de l'égaliseur...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Égaliseur Audio</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activation/Désactivation */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Activer l'égaliseur</Text>
        <Switch
          value={isEnabled}
          onValueChange={setEnabled}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {/* Préréglages */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.presetsContainer}
        contentContainerStyle={styles.presetsContent}
      >
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            style={[
              styles.presetButton,
              currentPreset === preset.name && styles.presetButtonActive,
            ]}
            onPress={() => handlePresetSelect(preset.name)}
            disabled={!isEnabled}
          >
            <Text
              style={[
                styles.presetText,
                currentPreset === preset.name && styles.presetTextActive,
                !isEnabled && styles.disabledText,
              ]}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bandes de fréquence */}
      <ScrollView 
        style={styles.bandsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bandsGrid}>
          {bands.map((band: EqualizerBand) => (
            <View key={band.index} style={styles.bandContainer}>
              <Text style={[styles.bandLabel, !isEnabled && styles.disabledText]}>
                {band.label}
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={[styles.gainValue, !isEnabled && styles.disabledText]}>
                  +24
                </Text>
                 <Slider
                  style={styles.slider}
                   minimumValue={-24}
                   maximumValue={24}
                  value={band.gain}
                  onValueChange={(value) => handleBandChange(band.index, value)}
                  minimumTrackTintColor={isEnabled ? '#007AFF' : '#cccccc'}
                  maximumTrackTintColor="#cccccc"
                  thumbTintColor={isEnabled ? '#007AFF' : '#999999'}
                  disabled={!isEnabled}
                />
                 <Text style={[styles.gainValue, !isEnabled && styles.disabledText]}>
                   -24
                 </Text>
              </View>
              <Text style={[styles.currentGain, !isEnabled && styles.disabledText]}>
                {band.gain.toFixed(1)} dB
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, !isEnabled && styles.actionButtonDisabled]}
          onPress={handleReset}
          disabled={!isEnabled}
        >
          <Text style={[styles.actionButtonText, !isEnabled && styles.disabledText]}>
            Réinitialiser
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

EqualizerControl.displayName = 'EqualizerControl';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  presetsContainer: {
    backgroundColor: '#fff',
    marginTop: 1,
    maxHeight: 60,
  },
  presetsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  presetButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  presetText: {
    fontSize: 14,
    color: '#333',
  },
  presetTextActive: {
    color: '#fff',
  },
  bandsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 1,
  },
  bandsGrid: {
    padding: 16,
  },
  bandContainer: {
    marginBottom: 20,
  },
  bandLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  gainValue: {
    fontSize: 12,
    color: '#666',
    width: 25,
    textAlign: 'center',
  },
  currentGain: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  actionButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  disabledText: {
    color: '#999999',
  },
});