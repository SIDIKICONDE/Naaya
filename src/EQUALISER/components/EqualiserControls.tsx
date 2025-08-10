/**
 * Contrôles avancés de l'égaliseur
 * Gains d'entrée/sortie et actions d'import/export
 */

import React, { useCallback } from 'react';
import {
  Slider,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EqualiserTheme } from '../types';

interface EqualiserControlsProps {
  inputGain: number;
  outputGain: number;
  onInputGainChange: (gain: number) => void;
  onOutputGainChange: (gain: number) => void;
  onExport: () => void;
  onImport: () => void;
  theme: EqualiserTheme;
  disabled?: boolean;
}

export const EqualiserControls: React.FC<EqualiserControlsProps> = ({
  inputGain,
  outputGain,
  onInputGainChange,
  onOutputGainChange,
  onExport,
  onImport,
  theme,
  disabled = false,
}) => {
  const formatGain = useCallback((gain: number) => {
    if (gain === 0) return '0 dB';
    return `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
  }, []);

  const getGainColor = useCallback((gain: number) => {
    if (Math.abs(gain) < 0.5) return theme.textSecondary;
    if (Math.abs(gain) > 12) return theme.danger;
    if (Math.abs(gain) > 6) return theme.warning;
    return theme.primary;
  }, [theme]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Contrôles avancés
      </Text>

      {/* Gains */}
      <View style={styles.gainsContainer}>
        {/* Input Gain */}
        <View style={styles.gainControl}>
          <View style={styles.gainHeader}>
            <Text style={[styles.gainLabel, { color: theme.textSecondary }]}>
              Gain d'entrée
            </Text>
            <Text style={[
              styles.gainValue,
              { color: getGainColor(inputGain) }
            ]}>
              {formatGain(inputGain)}
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
              -24
            </Text>
            <Slider
              style={styles.slider}
              value={inputGain}
              onValueChange={onInputGainChange}
              minimumValue={-24}
              maximumValue={24}
              step={0.1}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
              disabled={disabled}
            />
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
              +24
            </Text>
          </View>
        </View>

        {/* Output Gain */}
        <View style={styles.gainControl}>
          <View style={styles.gainHeader}>
            <Text style={[styles.gainLabel, { color: theme.textSecondary }]}>
              Gain de sortie
            </Text>
            <Text style={[
              styles.gainValue,
              { color: getGainColor(outputGain) }
            ]}>
              {formatGain(outputGain)}
            </Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
              -24
            </Text>
            <Slider
              style={styles.slider}
              value={outputGain}
              onValueChange={onOutputGainChange}
              minimumValue={-24}
              maximumValue={24}
              step={0.1}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
              disabled={disabled}
            />
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>
              +24
            </Text>
          </View>
        </View>
      </View>

      {/* Indicateurs visuels */}
      <View style={styles.metersContainer}>
        <View style={styles.meter}>
          <Text style={[styles.meterLabel, { color: theme.textSecondary }]}>
            IN
          </Text>
          <View style={[styles.meterBar, { backgroundColor: theme.surface }]}>
            <View 
              style={[
                styles.meterFill,
                {
                  backgroundColor: getGainColor(inputGain),
                  width: `${Math.abs(inputGain) / 24 * 100}%`,
                },
              ]}
            />
          </View>
        </View>
        
        <View style={styles.meter}>
          <Text style={[styles.meterLabel, { color: theme.textSecondary }]}>
            OUT
          </Text>
          <View style={[styles.meterBar, { backgroundColor: theme.surface }]}>
            <View 
              style={[
                styles.meterFill,
                {
                  backgroundColor: getGainColor(outputGain),
                  width: `${Math.abs(outputGain) / 24 * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={onImport}
          disabled={disabled}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>
            📥 Importer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={onExport}
          disabled={disabled}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>
            📤 Exporter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Informations supplémentaires */}
      <View style={[styles.infoBox, { backgroundColor: theme.primary + '10' }]}>
        <Text style={[styles.infoIcon, { color: theme.primary }]}>ℹ️</Text>
        <Text style={[styles.infoText, { color: theme.primary }]}>
          Ajustez les gains avec précaution. Des valeurs élevées peuvent causer de la distorsion.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  gainsContainer: {
    gap: 20,
    marginBottom: 24,
  },
  gainControl: {
    gap: 8,
  },
  gainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gainLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  gainValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 10,
    width: 24,
    textAlign: 'center',
  },
  metersContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  meter: {
    flex: 1,
    gap: 4,
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  meterBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
