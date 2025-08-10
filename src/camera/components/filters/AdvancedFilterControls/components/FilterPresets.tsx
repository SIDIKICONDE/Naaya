/**
 * Presets prédéfinis pour accès rapide
 */

import React, { memo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { FILTER_PRESETS } from '../constants';
import type { FilterPresetsProps } from '../types';

export const FilterPresets: React.FC<FilterPresetsProps> = memo(({ 
  onPresetSelect, 
  disabled 
}: FilterPresetsProps) => {
  return (
    <View style={styles.presetsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsList}
      >
        {FILTER_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            style={styles.presetButton}
            onPress={() => onPresetSelect(preset.params)}
            disabled={disabled}
          >
            <Text style={styles.presetIcon}>{preset.icon}</Text>
            <Text style={styles.presetName}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  presetsContainer: {
    marginBottom: 16,
  },
  presetsList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  presetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  presetIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  presetName: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
