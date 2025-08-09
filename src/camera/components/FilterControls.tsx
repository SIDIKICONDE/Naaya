/**
 * Interface de contrôle des filtres caméra
 * Intégration native avec l'engine FFmpeg Naaya
 */

import Slider from '@react-native-community/slider';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { FilterState } from '../../../specs/NativeCameraFiltersModule';

// Types pour les filtres disponibles
export interface FilterInfo {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  hasIntensity: boolean;
  defaultIntensity: number;
  color: string;
}

// Filtres disponibles avec leurs métadonnées
const AVAILABLE_FILTERS: FilterInfo[] = [
  {
    name: 'none',
    displayName: 'Aucun',
    description: 'Aucun filtre',
    icon: '🔘',
    hasIntensity: false,
    defaultIntensity: 0,
    color: '#666666',
  },
  {
    name: 'sepia',
    displayName: 'Sépia',
    description: 'Effet vintage sépia',
    icon: '🟤',
    hasIntensity: true,
    defaultIntensity: 0.8,
    color: '#8B4513',
  },
  {
    name: 'noir',
    displayName: 'N&B',
    description: 'Noir et blanc',
    icon: '⚫',
    hasIntensity: true,
    defaultIntensity: 1.0,
    color: '#404040',
  },
  {
    name: 'monochrome',
    displayName: 'Mono',
    description: 'Monochrome avec teinte',
    icon: '🔵',
    hasIntensity: true,
    defaultIntensity: 0.7,
    color: '#4169E1',
  },
  {
    name: 'vintage',
    displayName: 'Vintage',
    description: 'Effet années 70',
    icon: '📼',
    hasIntensity: true,
    defaultIntensity: 0.6,
    color: '#CD853F',
  },
  {
    name: 'cool',
    displayName: 'Cool',
    description: 'Effet froid bleuté',
    icon: '❄️',
    hasIntensity: true,
    defaultIntensity: 0.5,
    color: '#4682B4',
  },
  {
    name: 'warm',
    displayName: 'Warm',
    description: 'Effet chaud orangé',
    icon: '🔥',
    hasIntensity: true,
    defaultIntensity: 0.5,
    color: '#FF6347',
  },
];

export interface FilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  onClose?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Composant de contrôle individuel d'un filtre
 */
const FilterButton: React.FC<{
  filter: FilterInfo;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}> = memo(({ filter, isSelected, onPress, disabled }) => {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [onPress, disabled]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          isSelected && styles.filterButtonSelected,
          { borderColor: filter.color },
          isSelected && { backgroundColor: filter.color + '20' },
          disabled && styles.filterButtonDisabled,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>
          {filter.icon}
        </Text>
        <Text
          style={[
            styles.filterName,
            isSelected && styles.filterNameSelected,
            disabled && styles.filterNameDisabled,
          ]}
        >
          {filter.displayName}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

/**
 * Contrôleur d'intensité avec slider
 */
const IntensityControl: React.FC<{
  filter: FilterInfo;
  intensity: number;
  onIntensityChange: (value: number) => void;
  disabled?: boolean;
}> = memo(({ filter, intensity, onIntensityChange, disabled }) => {
  const [localIntensity, setLocalIntensity] = useState(intensity);

  const handleValueChange = useCallback((value: number) => {
    setLocalIntensity(value);
  }, []);

  const handleSlidingComplete = useCallback((value: number) => {
    onIntensityChange(value);
  }, [onIntensityChange]);

  return (
    <View style={styles.intensityContainer}>
      <View style={styles.intensityHeader}>
        <Text style={styles.intensityLabel}>Intensité</Text>
        <Text style={styles.intensityValue}>{Math.round(localIntensity * 100)}%</Text>
      </View>
      
      <Slider
        style={styles.intensitySlider}
        value={localIntensity}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        minimumTrackTintColor={filter.color}
        maximumTrackTintColor="#E0E0E0"
        thumbTintColor={filter.color}
        disabled={disabled}
      />
    </View>
  );
});

/**
 * Composant principal des contrôles de filtres
 */
export const FilterControls: React.FC<FilterControlsProps> = memo(({
  currentFilter,
  onFilterChange,
  onClearFilter,
  onClose,
  disabled = false,
  compact = false,
}) => {
  const [localIntensity, setLocalIntensity] = useState(
    currentFilter?.intensity ?? 1.0
  );

  // Trouver le filtre actuellement sélectionné
  const selectedFilter = useMemo(() => {
    if (!currentFilter) return AVAILABLE_FILTERS[0]; // 'none'
    return AVAILABLE_FILTERS.find(f => f.name === currentFilter.name) || AVAILABLE_FILTERS[0];
  }, [currentFilter]);

  // Gestion de la sélection d'un filtre
  const handleFilterSelect = useCallback(async (filter: FilterInfo) => {
    if (disabled) return;

    try {
      if (filter.name === 'none') {
        await onClearFilter();
      } else {
        const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0;
        setLocalIntensity(intensity);
        await onFilterChange(filter.name, intensity);
      }
    } catch (error) {
      console.error('[FilterControls] Erreur application filtre:', error);
    }
  }, [onFilterChange, onClearFilter, disabled]);

  // Gestion du changement d'intensité
  const handleIntensityChange = useCallback(async (intensity: number) => {
    if (disabled || !currentFilter) return;

    try {
      setLocalIntensity(intensity);
      await onFilterChange(currentFilter.name, intensity);
    } catch (error) {
      console.error('[FilterControls] Erreur changement intensité:', error);
    }
  }, [onFilterChange, currentFilter, disabled]);

  // Affichage compact pour l'intégration dans les contrôles vidéo
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactFilters}
        >
          {AVAILABLE_FILTERS.map((filter) => (
            <FilterButton
              key={filter.name}
              filter={filter}
              isSelected={selectedFilter.name === filter.name}
              onPress={() => handleFilterSelect(filter)}
              disabled={disabled}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // Affichage complet avec contrôles d'intensité
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtres</Text>
        {onClose && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Sélection des filtres */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {AVAILABLE_FILTERS.map((filter) => (
          <FilterButton
            key={filter.name}
            filter={filter}
            isSelected={selectedFilter.name === filter.name}
            onPress={() => handleFilterSelect(filter)}
            disabled={disabled}
          />
        ))}
      </ScrollView>

      {/* Description du filtre sélectionné */}
      <Text style={styles.description}>{selectedFilter.description}</Text>

      {/* Contrôle d'intensité */}
      {selectedFilter.hasIntensity && currentFilter && (
        <IntensityControl
          filter={selectedFilter}
          intensity={localIntensity}
          onIntensityChange={handleIntensityChange}
          disabled={disabled}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 8,
    margin: 3,
    maxHeight: 160,
  },
  compactContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    margin: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '400',
  },
  filtersContainer: {
    paddingHorizontal: 1,
    gap: 4,
  },
  compactFilters: {
    paddingHorizontal: 1,
    gap: 1,
  },
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666666',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 2,
  },
  filterButtonSelected: {
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonDisabled: {
    opacity: 0.5,
  },
  filterIcon: {
    fontSize:   10,
    marginBottom: 4,
  },
  filterIconDisabled: {
    opacity: 0.5,
  },
  filterName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#CCCCCC',
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterNameDisabled: {
    opacity: 0.5,
  },
  description: {
    fontSize: 10,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  intensityContainer: {
    marginTop: 4,
  },
  intensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  intensityLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  intensityValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  intensitySlider: {
    height: 20,
  },

});

export default FilterControls;
