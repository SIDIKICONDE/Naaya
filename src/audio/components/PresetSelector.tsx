/**
 * Composant de sélection de préréglages
 * Design moderne avec animations fluides
 */

import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEME_COLORS } from '../constants';
import { useEqualizer } from '../hooks';
import { EqualizerPreset } from '../types';

interface PresetSelectorProps {
  currentPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  disabled?: boolean;
  showHeader?: boolean;
}

const PRESET_CARD_WIDTH = 90;
const PRESET_CARD_HEIGHT = 60;

// Raccourcis lisibles pour les noms de préréglages (FR)
const getShortPresetName = (id: string, name: string): string => {
  const map: Record<string, string> = {
    'flat': 'Plat',
    'rock': 'Rock',
    'electronic': 'Electro',
    'vocal': 'Voix',
    'bass-boost': 'Basses+',
    'treble-boost': 'Aigus+',
    'jazz': 'Jazz',
    'classical': 'Classique',
    'acoustic': 'Acoust.',
    'loudness': 'Loud.',
    'custom': 'Perso',
    '': 'Perso', // Fallback pour currentPreset vide
  };
  const short = map[id] || name;
  return short.length > 10 ? `${short.slice(0, 9)}…` : short;
};

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
        toValue: isSelected ? 1.02 : 1,
        stiffness: 250,
        damping: 20,
        useNativeDriver: true,
      }),
      Animated.timing(animatedOpacity, {
        toValue: isSelected ? 1 : 0.85,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, animatedScale, animatedOpacity]);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(animatedScale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.timing(animatedScale, {
      toValue: isSelected ? 1.02 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={styles.touchableContainer}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      delayPressIn={0}
      delayPressOut={0}
      delayLongPress={0}
    >
      <Animated.View
        style={[
          styles.presetCard,
          isSelected && styles.presetCardSelected,
          disabled && styles.presetCardDisabled,
          preset.id === 'custom' && styles.presetCardCustom,
          {
            transform: [{ scale: animatedScale }],
            opacity: animatedOpacity,
          },
        ]}
        pointerEvents="box-none"
        needsOffscreenAlphaCompositing={false}
      >
        <Text style={[styles.presetIcon, isSelected && styles.presetIconSelected]}>
          {preset.icon}
        </Text>
        <Text style={[styles.presetName, isSelected && styles.presetNameSelected]} numberOfLines={1} ellipsizeMode="tail">
          {getShortPresetName(preset.id, preset.name)}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPreset,
  onPresetSelect,
  disabled = false,
  showHeader = true,
}) => {
  const { presets } = useEqualizer();
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Utiliser tous les presets disponibles, y compris custom
  const allPresets = React.useMemo(() => {
    return presets;
  }, [presets]);

  const effectiveCurrentPreset = currentPreset || 'flat';

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Auto-scroll vers le préréglage sélectionné
  React.useEffect(() => {
    if (effectiveCurrentPreset && scrollViewRef.current) {
      const index = allPresets.findIndex(p => p.id === effectiveCurrentPreset);
      if (index >= 0) {
        const scrollPosition = index * (PRESET_CARD_WIDTH + 8) - 16;
        scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
      }
    }
  }, [effectiveCurrentPreset, allPresets]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Préréglages</Text>
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              {getShortPresetName(
                effectiveCurrentPreset || '',
                allPresets.find(p => p.id === effectiveCurrentPreset)?.name || 'Personnalisé'
              )}
            </Text>
          </View>
        </View>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={PRESET_CARD_WIDTH + 8}
        snapToAlignment="start"
        scrollEnabled={true}
        nestedScrollEnabled={false}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        {allPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={preset.id === effectiveCurrentPreset}
            onPress={() => {
              onPresetSelect(preset.id);
            }}
            disabled={disabled}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
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
    paddingHorizontal: 12,
    gap: 6,
  },
  presetCard: {
    width: PRESET_CARD_WIDTH,
    height: PRESET_CARD_HEIGHT,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: PRESET_CARD_HEIGHT / 2, // Style pilule
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: THEME_COLORS.border + '40',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  presetCardSelected: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: THEME_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  presetCardDisabled: {
    opacity: 0.5,
  },
  presetCardCustom: {
    backgroundColor: THEME_COLORS.surfaceLight,
    borderColor: THEME_COLORS.warning,
    borderStyle: 'solid',
  },
  presetIcon: {
    fontSize: 18,
    marginRight: 6,
    color: THEME_COLORS.text,
  },
  presetIconSelected: {
    color: '#FFFFFF',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.text,
    flex: 1,
  },
  presetNameSelected: {
    color: '#FFFFFF',
  },
  touchableContainer: {
    // Zone de toucher étendue pour améliorer la réactivité
    minWidth: PRESET_CARD_WIDTH + 16,
    minHeight: PRESET_CARD_HEIGHT + 16,
  },
});