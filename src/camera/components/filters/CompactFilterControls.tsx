/**
 * Version compacte des contrôles de filtres
 */
import React, { memo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { FilterState } from '../../../../specs/NativeCameraFiltersModule';
import { COMPACT_FILTERS } from './constants';

export interface CompactFilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  disabled?: boolean;
  showLabels?: boolean;
  style?: any;
}

export const CompactFilterControls: React.FC<CompactFilterControlsProps> = memo(({ currentFilter, onFilterChange, onClearFilter, disabled = false, showLabels = true, style }) => {
  const handleFilterSelect = useCallback(async (filterName: string) => {
    if (disabled) return;
    try {
      if (filterName === 'none') { await onClearFilter(); }
      else { const defaultIntensity = filterName === 'noir' ? 1.0 : 0.7; await onFilterChange(filterName, defaultIntensity); }
    } catch (error) { console.error('[CompactFilterControls] Erreur application filtre:', error); }
  }, [onFilterChange, onClearFilter, disabled]);

  const selectedFilterName = currentFilter?.name || 'none';

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
        {COMPACT_FILTERS.map((filter) => {
          const isSelected = selectedFilterName === filter.name;
          return (
            <TouchableOpacity key={filter.name} style={[styles.filterButton, isSelected && [styles.filterButtonSelected, { borderColor: filter.color }], disabled && styles.filterButtonDisabled]} onPress={() => handleFilterSelect(filter.name)} disabled={disabled} activeOpacity={0.7}>
              <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>{filter.icon}</Text>
              {showLabels && (
                <Text style={[styles.filterName, isSelected && [styles.filterNameSelected, { color: filter.color }], disabled && styles.filterNameDisabled]} numberOfLines={1}>
                  {filter.displayName}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {currentFilter && currentFilter.name !== 'none' && (
        <View style={styles.intensityIndicator}>
          <View style={[styles.intensityBar, { width: `${currentFilter.intensity * 100}%`, backgroundColor: COMPACT_FILTERS.find(f => f.name === currentFilter.name)?.color || '#007AFF' }]} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, padding: 8 },
  filtersContainer: { paddingHorizontal: 4, gap: 6 },
  filterButton: { alignItems: 'center', justifyContent: 'center', minWidth: 48, height: 56, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  filterButtonSelected: { borderWidth: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  filterButtonDisabled: { opacity: 0.5 },
  filterIcon: { fontSize: 16, marginBottom: 2 },
  filterIconDisabled: { opacity: 0.5 },
  filterName: { fontSize: 10, fontWeight: '500', color: '#CCCCCC', textAlign: 'center' },
  filterNameSelected: { fontWeight: '600' },
  filterNameDisabled: { opacity: 0.5 },
  intensityIndicator: { height: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: 6, marginHorizontal: 4, borderRadius: 1, overflow: 'hidden' },
  intensityBar: { height: '100%', borderRadius: 1 },
});

export default CompactFilterControls;



