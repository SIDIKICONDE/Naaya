/**
 * Interface de contrôle des filtres caméra
 * Intégration native avec l'engine FFmpeg Naaya
 */
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
import type { FilterState } from '../../../../specs/NativeCameraFiltersModule';
import { AVAILABLE_FILTERS } from './constants';
import type { FilterInfo } from './types';

export interface FilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  onClose?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const FilterButton: React.FC<{ filter: FilterInfo; isSelected: boolean; onPress: () => void; disabled?: boolean; }> = memo(({ filter, isSelected, onPress, disabled }) => {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const handlePressIn = useCallback(() => { Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [scaleAnim]);
  const handlePressOut = useCallback(() => { Animated.timing(scaleAnim, { toValue: 1, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [scaleAnim]);
  const handlePress = useCallback(() => { if (!disabled) onPress(); }, [onPress, disabled]);
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.filterButton, isSelected && styles.filterButtonSelected, { borderColor: filter.color }, isSelected && { backgroundColor: filter.color + '20' }, disabled && styles.filterButtonDisabled]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>{filter.icon}</Text>
        <Text style={[styles.filterName, isSelected && styles.filterNameSelected, disabled && styles.filterNameDisabled]}>{filter.displayName}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const FilterControls: React.FC<FilterControlsProps> = memo(({ currentFilter, onFilterChange, onClearFilter, onClose, disabled = false, compact = false }) => {
  const [localIntensity, setLocalIntensity] = useState(currentFilter?.intensity ?? 1.0);
  const selectedFilter = useMemo(() => { if (!currentFilter) return AVAILABLE_FILTERS[0]; return AVAILABLE_FILTERS.find(f => f.name === currentFilter.name) || AVAILABLE_FILTERS[0]; }, [currentFilter]);
  const handleFilterSelect = useCallback(async (filter: FilterInfo) => {
    if (disabled) return;
    try {
      if (filter.name === 'none') { await onClearFilter(); }
      else { const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0; setLocalIntensity(intensity); await onFilterChange(filter.name, intensity); }
    } catch (error) { console.error('[FilterControls] Erreur application filtre:', error); }
  }, [onFilterChange, onClearFilter, disabled]);
  const handleIntensityChange = useCallback((newIntensity: number) => { const clamped = Math.max(0, Math.min(1, newIntensity)); setLocalIntensity(clamped); onFilterChange(selectedFilter.name, clamped); }, [onFilterChange, selectedFilter.name]);
  const incrementIntensity = useCallback(() => { handleIntensityChange(localIntensity + 0.1); }, [localIntensity, handleIntensityChange]);
  const decrementIntensity = useCallback(() => { handleIntensityChange(localIntensity - 0.1); }, [localIntensity, handleIntensityChange]);
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactFilters}>
          {AVAILABLE_FILTERS.map((filter) => (
            <FilterButton key={filter.name} filter={filter} isSelected={selectedFilter.name === filter.name} onPress={() => handleFilterSelect(filter)} disabled={disabled} />
          ))}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtres</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
        {AVAILABLE_FILTERS.map((filter) => (
          <FilterButton key={filter.name} filter={filter} isSelected={selectedFilter.name === filter.name} onPress={() => handleFilterSelect(filter)} disabled={disabled} />
        ))}
      </ScrollView>
      <Text style={styles.description}>{selectedFilter.description}</Text>
      {selectedFilter.hasIntensity && (
        <View style={styles.intensityContainer}>
          <Text style={styles.intensityLabel}>Intensité</Text>
          <View style={styles.intensityControls}>
            <TouchableOpacity style={[styles.intensityButton, { backgroundColor: selectedFilter.color }]} onPress={decrementIntensity} disabled={localIntensity <= 0} activeOpacity={0.7}>
              <Text style={styles.intensityButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.intensityDisplay}>
              <Text style={[styles.intensityValue, { color: selectedFilter.color }]}>{Math.round(localIntensity * 100)}%</Text>
            </View>
            <TouchableOpacity style={[styles.intensityButton, { backgroundColor: selectedFilter.color }]} onPress={incrementIntensity} disabled={localIntensity >= 1} activeOpacity={0.7}>
              <Text style={styles.intensityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 8, margin: 3, maxHeight: 160 },
  compactContainer: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 10, padding: 12, margin: 3 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4, position: 'relative' },
  title: { fontSize: 10, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  closeButton: { position: 'absolute', right: 0, top: 0, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '400' },
  filtersContainer: { paddingHorizontal: 1, gap: 4 },
  compactFilters: { paddingHorizontal: 1, gap: 1 },
  filterButton: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: '#666666', backgroundColor: 'rgba(255, 255, 255, 0.05)', marginHorizontal: 2 },
  filterButtonSelected: { borderWidth: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  filterButtonDisabled: { opacity: 0.5 },
  filterIcon: { fontSize: 10, marginBottom: 4 },
  filterIconDisabled: { opacity: 0.5 },
  filterName: { fontSize: 10, fontWeight: '500', color: '#CCCCCC', textAlign: 'center' },
  filterNameSelected: { color: '#FFFFFF', fontWeight: '600' },
  filterNameDisabled: { opacity: 0.5 },
  description: { fontSize: 10, color: '#AAAAAA', textAlign: 'center', marginTop: 4, marginBottom: 4, fontStyle: 'italic' },
  intensityContainer: { marginTop: 4 },
  intensityControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  intensityButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF' },
  intensityButtonText: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
  intensityDisplay: { width: 40, alignItems: 'center' },
  intensityLabel: { fontSize: 10, fontWeight: '500', color: '#FFFFFF' },
  intensityValue: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
});

export default FilterControls;
