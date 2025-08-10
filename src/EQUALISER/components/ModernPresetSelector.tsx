/**
 * Sélecteur de presets moderne avec animations fluides
 * Cartes interactives avec effets visuels
 */

import React, { memo, useCallback } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { EqualiserPreset, EqualiserTheme } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

interface ModernPresetSelectorProps {
  presets: EqualiserPreset[];
  currentPreset: string | null;
  onSelect: (presetId: string) => void;
  theme: EqualiserTheme;
}

const PresetCard = memo<{
  preset: EqualiserPreset;
  isSelected: boolean;
  onPress: () => void;
  theme: EqualiserTheme;
  index: number;
}>(({ preset, isSelected, onPress, theme, index }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.95);
    rotation.value = withSpring(5);
    setTimeout(() => {
      scale.value = withSpring(1);
      rotation.value = withSpring(0);
    }, 200);
    onPress();
  }, [onPress, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotateDeg = `${rotation.value}deg` as `${number}deg`;
    return {
      transform: [
        { scale: scale.value },
        { rotate: rotateDeg },
      ],
    } as any;
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.cardContainer, animatedStyle]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <LinearGradient
          colors={isSelected ? theme.gradients.primary : [theme.surface, theme.background]}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={20} color={theme.success} />
            </View>
          )}

          <View style={styles.cardHeader}>
            <Text style={styles.presetIcon}>
              {preset.icon}
            </Text>
            <Text style={[styles.presetName, { color: theme.text }]}>
              {preset.name}
            </Text>
          </View>

          <Text style={[styles.presetDescription, { color: theme.textSecondary }]}>
            {preset.description}
          </Text>

          {/* Mini visualisation des gains */}
          <View style={styles.miniVisualization}>
            {Object.values(preset.bands).slice(0, 10).map((gain, idx) => (
              <View
                key={idx}
                style={[
                  styles.miniBar,
                  {
                    height: Math.abs(gain) * 3 + 10,
                    backgroundColor: gain >= 0 ? theme.success : theme.danger,
                  },
                ]}
              />
            ))}
          </View>

          {preset.metadata?.tags && (
            <View style={styles.tags}>
              {preset.metadata.tags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: theme.border }]}
                >
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const ModernPresetSelector = memo<ModernPresetSelectorProps>(({
  presets,
  currentPreset,
  onSelect,
  theme,
}) => {
  const categories = [...new Set(presets.map(p => p.category))];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {categories.map((category) => (
        <View key={category} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryTitle, { color: theme.text }]}>
              {category.toUpperCase()}
            </Text>
            <View style={[styles.categoryLine, { backgroundColor: theme.primary }]} />
          </View>

          <View style={styles.presetsGrid}>
            {presets
              .filter(p => p.category === category)
              .map((preset, index) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={currentPreset === preset.id}
                  onPress={() => onSelect(preset.id)}
                  theme={theme}
                  index={index}
                />
              ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  categorySection: {
    marginBottom: 30,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginRight: 10,
  },
  categoryLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 15,
  },
  card: {
    padding: 15,
    borderRadius: 12,
    minHeight: 140,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetIcon: {
    marginRight: 8,
    fontSize: 28,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '700',
  },
  presetDescription: {
    fontSize: 12,
    marginBottom: 10,
  },
  miniVisualization: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 30,
    alignItems: 'flex-end',
    marginVertical: 10,
  },
  miniBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
    opacity: 0.7,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 5,
    marginTop: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
