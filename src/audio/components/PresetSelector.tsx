/**
 * Composant de sélection de préréglages
 * Design moderne avec animations fluides
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { THEME_COLORS, EQUALIZER_PRESETS } from '../constants';
import { EqualizerPreset } from '../types';

interface PresetSelectorProps {
  currentPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  disabled?: boolean;
}

const PRESET_CARD_WIDTH = 110;
const PRESET_CARD_HEIGHT = 100;

const PresetCard: React.FC<{
  preset: EqualizerPreset;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}> = ({ preset, isSelected, onPress, disabled }) => {
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(isSelected ? 1 : 0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedScale, {
        toValue: isSelected ? 1.05 : 1,
        stiffness: 200,
        damping: 15,
        useNativeDriver: true,
      }),
      Animated.timing(animatedOpacity, {
        toValue: isSelected ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, animatedScale, animatedOpacity]);

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.95,
      stiffness: 300,
      damping: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: isSelected ? 1.05 : 1,
      stiffness: 300,
      damping: 20,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.presetCard,
          isSelected && styles.presetCardSelected,
          disabled && styles.presetCardDisabled,
          {
            transform: [{ scale: animatedScale }],
            opacity: animatedOpacity,
          },
        ]}
      >
        <Text style={styles.presetIcon}>{preset.icon}</Text>
        <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
          {preset.name}
        </Text>
        {preset.description && (
          <Text style={styles.presetDescription} numberOfLines={2}>
            {preset.description}
          </Text>
        )}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <View style={styles.selectedDot} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  onPresetSelect,
  disabled = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Auto-scroll vers le préréglage sélectionné
  React.useEffect(() => {
    if (currentPreset && scrollViewRef.current) {
      const index = EQUALIZER_PRESETS.findIndex(p => p.id === currentPreset);
      if (index >= 0) {
        const scrollPosition = index * (PRESET_CARD_WIDTH + 12) - 20;
        scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
      }
    }
  }, [currentPreset]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Préréglages</Text>
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {EQUALIZER_PRESETS.find(p => p.id === currentPreset)?.name || 'Personnalisé'}
          </Text>
        </View>
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={PRESET_CARD_WIDTH + 12}
        snapToAlignment="start"
      >
        {EQUALIZER_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={preset.id === currentPreset}
            onPress={() => onPresetSelect(preset.id)}
            disabled={disabled}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME_COLORS.text,
  },
  indicator: {
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME_COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  presetCard: {
    width: PRESET_CARD_WIDTH,
    height: PRESET_CARD_HEIGHT,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  presetCardSelected: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.surfaceLight,
  },
  presetCardDisabled: {
    opacity: 0.5,
  },
  presetIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.text,
    marginBottom: 2,
  },
  presetNameSelected: {
    color: THEME_COLORS.primary,
  },
  presetDescription: {
    fontSize: 10,
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME_COLORS.primary,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME_COLORS.primary,
  },
});