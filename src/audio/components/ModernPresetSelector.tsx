/**
 * Sélecteur de présets moderne avec animations fluides
 * Design glassmorphism et transitions élégantes
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  MODERN_THEME, 
  ANIMATION_CONFIG,
  TOUCH_CONFIG 
} from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Preset {
  id: string;
  name: string;
  icon: string;
  description: string;
  bands: Record<string, number>;
  gradient?: string[];
}

interface ModernPresetSelectorProps {
  presets?: Preset[];
  currentPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  disabled?: boolean;
}

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'flat',
    name: 'Flat',
    icon: '⚪',
    description: 'Son neutre',
    bands: {},
    gradient: MODERN_THEME.effects.gradients.dark,
  },
  {
    id: 'bass-boost',
    name: 'Bass',
    icon: '🔊',
    description: 'Basses amplifiées',
    bands: {},
    gradient: ['#EF4444', '#DC2626'],
  },
  {
    id: 'vocal',
    name: 'Vocal',
    icon: '🎤',
    description: 'Voix claires',
    bands: {},
    gradient: ['#10B981', '#059669'],
  },
  {
    id: 'rock',
    name: 'Rock',
    icon: '🎸',
    description: 'Son puissant',
    bands: {},
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'electronic',
    name: 'Electro',
    icon: '🎹',
    description: 'Électronique',
    bands: {},
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    icon: '🎻',
    description: 'Son naturel',
    bands: {},
    gradient: ['#EC4899', '#DB2777'],
  },
  {
    id: 'jazz',
    name: 'Jazz',
    icon: '🎺',
    description: 'Jazz smooth',
    bands: {},
    gradient: ['#3B82F6', '#2563EB'],
  },
  {
    id: 'pop',
    name: 'Pop',
    icon: '🎵',
    description: 'Pop moderne',
    bands: {},
    gradient: ['#14B8A6', '#0D9488'],
  },
];

const PresetCard: React.FC<{
  preset: Preset;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
  index: number;
}> = ({ preset, isSelected, onPress, disabled, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const appearAnim = useRef(new Animated.Value(0)).current;
  
  // Animation d'apparition
  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 30),
      Animated.spring(appearAnim, {
        toValue: 1,
        ...ANIMATION_CONFIG.spring.bouncy,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, appearAnim]);
  
  // Animation de sélection
  React.useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          ...ANIMATION_CONFIG.spring.stiff,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.duration.normal,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...ANIMATION_CONFIG.spring.gentle,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isSelected, scaleAnim, glowAnim]);
  
  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        ...ANIMATION_CONFIG.spring.stiff,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, rotateAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 0.95 : 1,
        ...ANIMATION_CONFIG.spring.bouncy,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        ...ANIMATION_CONFIG.spring.wobbly,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, rotateAnim, isSelected]);
  
  const handlePress = useCallback(() => {
    if (!disabled) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(TOUCH_CONFIG.haptic.selection);
      }
      onPress();
    }
  }, [disabled, onPress]);
  
  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: appearAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, appearAnim) },
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '2deg'],
              }),
            },
            {
              translateY: appearAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={styles.cardPressable}
      >
        {/* Effet de glow pour la sélection */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim,
              backgroundColor: preset.gradient ? preset.gradient[0] : MODERN_THEME.colors.primary.base,
            },
          ]}
        />
        
        {/* Carte principale avec gradient */}
        <LinearGradient
          colors={preset.gradient || MODERN_THEME.effects.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            isSelected && styles.cardSelected,
          ]}
        >
          {/* Overlay glassmorphism */}
          <View style={styles.cardOverlay} />
          
          {/* Contenu de la carte */}
          <View style={styles.cardContent}>
            <Text style={styles.cardIcon}>{preset.icon}</Text>
            <Text style={styles.cardName}>{preset.name}</Text>
            <Text style={styles.cardDescription}>{preset.description}</Text>
          </View>
          
          {/* Indicateur de sélection */}
          {isSelected && (
            <Animated.View 
              style={[
                styles.selectedIndicator,
                {
                  opacity: glowAnim,
                },
              ]}
            >
              <View style={styles.selectedDot} />
            </Animated.View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export const ModernPresetSelector: React.FC<ModernPresetSelectorProps> = ({
  presets = DEFAULT_PRESETS,
  currentPreset,
  onPresetSelect,
  disabled = false,
}) => {
  const [expandedView, setExpandedView] = useState(false);
  const listRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Animation de transition entre vues
  const toggleView = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setExpandedView(!expandedView);
    });
    
    if (Platform.OS === 'ios') {
      Vibration.vibrate(TOUCH_CONFIG.haptic.light);
    }
  }, [expandedView, fadeAnim]);
  
  // Auto-scroll vers le preset sélectionné
  React.useEffect(() => {
    if (currentPreset && listRef.current) {
      const index = presets.findIndex(p => p.id === currentPreset);
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ 
            index, 
            animated: true,
            viewPosition: 0.5,
          });
        }, 100);
      }
    }
  }, [currentPreset, presets]);
  
  const renderPreset = useCallback(({ item, index }: { item: Preset; index: number }) => (
    <PresetCard
      preset={item}
      isSelected={item.id === currentPreset}
      onPress={() => onPresetSelect(item.id)}
      disabled={disabled}
      index={index}
    />
  ), [currentPreset, onPresetSelect, disabled]);
  
  const keyExtractor = useCallback((item: Preset) => item.id, []);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim },
      ]}
    >
      {/* Header avec bouton d'expansion */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Préréglages</Text>
          {currentPreset && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {presets.find(p => p.id === currentPreset)?.name || 'Custom'}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={toggleView}
          style={styles.expandButton}
          hitSlop={8}
        >
          <Text style={styles.expandButtonText}>
            {expandedView ? '−' : '+'}
          </Text>
        </Pressable>
      </View>
      
      {/* Liste des présets */}
      <FlatList
        ref={listRef}
        data={expandedView ? presets : presets.slice(0, 4)}
        renderItem={renderPreset}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={110}
        decelerationRate="fast"
        bounces={true}
        overScrollMode="never"
        initialScrollIndex={0}
        getItemLayout={(_, index) => ({
          length: 110,
          offset: 110 * index,
          index,
        })}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: MODERN_THEME.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MODERN_THEME.spacing.md,
    marginBottom: MODERN_THEME.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: MODERN_THEME.typography.fontSize.lg,
    fontWeight: '600',
    color: MODERN_THEME.colors.text.primary,
  },
  currentBadge: {
    marginLeft: MODERN_THEME.spacing.sm,
    paddingHorizontal: MODERN_THEME.spacing.sm,
    paddingVertical: 2,
    backgroundColor: MODERN_THEME.colors.primary.base + '20',
    borderRadius: MODERN_THEME.borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: MODERN_THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: MODERN_THEME.colors.primary.light,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: MODERN_THEME.borderRadius.md,
    backgroundColor: MODERN_THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: {
    fontSize: MODERN_THEME.typography.fontSize.xl,
    color: MODERN_THEME.colors.text.secondary,
    fontWeight: '300',
  },
  listContent: {
    paddingHorizontal: MODERN_THEME.spacing.md,
  },
  cardContainer: {
    marginRight: MODERN_THEME.spacing.sm,
  },
  cardPressable: {
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: MODERN_THEME.borderRadius.lg,
    opacity: 0,
  },
  card: {
    width: 100,
    height: 100,
    borderRadius: MODERN_THEME.borderRadius.lg,
    padding: MODERN_THEME.spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    ...MODERN_THEME.effects.shadows.medium,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: MODERN_THEME.colors.text.primary + '40',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: MODERN_THEME.spacing.xs,
  },
  cardName: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    fontWeight: '600',
    color: MODERN_THEME.colors.text.primary,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: MODERN_THEME.typography.fontSize.xs,
    color: MODERN_THEME.colors.text.secondary,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: MODERN_THEME.spacing.xs,
    right: MODERN_THEME.spacing.xs,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MODERN_THEME.colors.text.primary,
  },
});

export default ModernPresetSelector;