/**
 * Bouton compact pour l'égaliseur
 * Affiche l'état actuel et permet d'ouvrir le contrôle complet
 */

import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import { useEqualizer } from '../hooks';

interface EqualizerButtonProps {
  onPress: () => void;
  style?: any;
  compact?: boolean;
}

export const EqualizerButton: React.FC<EqualizerButtonProps> = memo(({
  onPress,
  style,
  compact = false,
}) => {
  const { isEnabled, currentPreset, isLoading } = useEqualizer();

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  const getPresetLabel = () => {
    if (!isEnabled) return 'Off';
    if (currentPreset === 'flat') return 'Plat';
    if (currentPreset === 'custom') return 'Perso';
    return currentPreset.charAt(0).toUpperCase() + currentPreset.slice(1);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isEnabled && styles.containerActive,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!compact && (
        <View style={styles.iconContainer}>
          <View style={[styles.bar, styles.barShort]} />
          <View style={[styles.bar, styles.barMedium]} />
          <View style={[styles.bar, styles.barTall]} />
          <View style={[styles.bar, styles.barMedium]} />
          <View style={[styles.bar, styles.barShort]} />
        </View>
      )}
      <Text style={[styles.text, compact && styles.textCompact]}>
        {compact ? 'EQ' : 'Égaliseur'}
      </Text>
      {!compact && (
        <Text style={styles.status}>{getPresetLabel()}</Text>
      )}
    </TouchableOpacity>
  );
});

EqualizerButton.displayName = 'EqualizerButton';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
  },
  containerActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 8,
    height: 16,
  },
  bar: {
    width: 3,
    backgroundColor: '#fff',
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  barShort: {
    height: 6,
  },
  barMedium: {
    height: 10,
  },
  barTall: {
    height: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  textCompact: {
    fontSize: 12,
  },
  status: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
});