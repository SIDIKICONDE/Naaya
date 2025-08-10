/**
 * Système de filtres moderne et optimisé
 * Utilise React.memo, useMemo et useCallback pour minimiser les re-rendus
 */
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomSlider from '../../../ui/CustomSlider';
import ImportFilterModal from './ImportFilterModal';
import {
  ANIMATION_CONFIG,
  AVAILABLE_FILTERS,
  FILTER_CATEGORIES,
  FILTER_PRESETS
} from './constants';
import type {
  FilterCallback,
  FilterControlsProps,
  FilterInfo,
  FilterPreset,
  IntensityCallback
} from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Composant optimisé pour un bouton de filtre individuel
 * Utilise React.memo avec comparaison personnalisée pour éviter les re-rendus
 */
const FilterButton = memo<{
  filter: FilterInfo;
  isSelected: boolean;
  onPress: FilterCallback;
  disabled?: boolean;
  showInfo?: boolean;
}>(
  ({ filter, isSelected, onPress, disabled = false, showInfo = true }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(isSelected ? 1 : 0.8)).current;

    const handlePressIn = useCallback(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          ...ANIMATION_CONFIG.filterTransition,
        }),
      ]).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...ANIMATION_CONFIG.filterTransition,
      }).start();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
      if (!disabled) {
        onPress(filter);
      }
    }, [filter, onPress, disabled]);

    // Animation de sélection
    React.useEffect(() => {
      Animated.timing(opacityAnim, {
        toValue: isSelected ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [isSelected, opacityAnim]);

    return (
      <Animated.View
        style={[
          styles.filterButtonContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={useCallback(({ pressed }: { pressed: boolean }) => [
            styles.filterButton,
            isSelected && styles.filterButtonSelected,
            pressed && styles.filterButtonPressed,
            disabled && styles.filterButtonDisabled,
          ], [isSelected, disabled])}
        >
          {filter.previewGradient ? (
            <LinearGradient
              colors={[...filter.previewGradient] as string[]}
              style={styles.filterGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.filterIcon}>{filter.icon}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.filterIconContainer, { backgroundColor: filter.color + '20' }]}>
              <Text style={styles.filterIcon}>{filter.icon}</Text>
            </View>
          )}
          <Text style={[styles.filterName, isSelected && styles.filterNameSelected]}>
            {filter.displayName}
          </Text>
          {showInfo && filter.technicalInfo && (
            <Text style={styles.filterTechnicalInfo} numberOfLines={1}>
              {filter.technicalInfo}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Comparaison personnalisée pour éviter les re-rendus inutiles
    return (
      prevProps.filter.name === nextProps.filter.name &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.showInfo === nextProps.showInfo
    );
  }
);

FilterButton.displayName = 'FilterButton';

/**
 * Composant pour afficher les catégories de filtres
 */
const FilterCategories = memo<{
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}>(({ selectedCategory, onSelectCategory }) => {
  const categories = useMemo(
    () => Object.entries(FILTER_CATEGORIES),
    []
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
      contentContainerStyle={styles.categoriesContent}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          selectedCategory === null && styles.categoryChipSelected,
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={styles.categoryChipText}>Tous</Text>
      </TouchableOpacity>
      {categories.map(([key, category]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.categoryChip,
            selectedCategory === key && styles.categoryChipSelected,
            { borderColor: category.color },
          ]}
          onPress={() => onSelectCategory(key)}
        >
          <Text style={styles.categoryChipIcon}>{category.icon}</Text>
          <Text style={styles.categoryChipText}>{category.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

FilterCategories.displayName = 'FilterCategories';

/**
 * Composant pour les presets de filtres
 */
const FilterPresetsList = memo<{
  onSelectPreset: (preset: FilterPreset) => void;
}>(({ onSelectPreset }) => {
  const renderPreset = useCallback(
    ({ item }: { item: FilterPreset }) => (
      <TouchableOpacity
        style={styles.presetCard}
        onPress={() => onSelectPreset(item)}
      >
        <Text style={styles.presetName}>{item.name}</Text>
        <Text style={styles.presetFilter}>
          {AVAILABLE_FILTERS.find(f => f.name === item.filter)?.displayName}
        </Text>
      </TouchableOpacity>
    ),
    [onSelectPreset]
  );

  return (
    <View style={styles.presetsContainer}>
      <Text style={styles.presetsTitle}>Presets rapides</Text>
      <FlatList
        horizontal
        data={FILTER_PRESETS}
        renderItem={renderPreset}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsContent}
      />
    </View>
  );
});

FilterPresetsList.displayName = 'FilterPresetsList';

/**
 * Slider d'intensité optimisé
 */
const IntensitySlider = memo<{
  value: number;
  onChange: IntensityCallback;
  onComplete: IntensityCallback;
  color: string;
  disabled?: boolean;
}>(
  ({ value, onChange, onComplete, color, disabled = false }) => {
    const throttledOnChange = useCallback(
      (val: number) => {
        // Throttle pour éviter trop d'appels
        const rounded = Math.round(val * 100) / 100;
        onChange(rounded);
      },
      [onChange]
    );

    return (
      <View style={styles.intensityContainer}>
        <View style={styles.intensityHeader}>
          <Text style={styles.intensityLabel}>Intensité</Text>
          <Text style={styles.intensityValue}>{Math.round(value * 100)}%</Text>
        </View>
        <CustomSlider
          value={value}
          onValueChange={throttledOnChange}
          onSlidingComplete={onComplete}
          minimumValue={0}
          maximumValue={1}
          width={SCREEN_WIDTH - 80}
          trackHeight={6}
          thumbSize={24}
          activeTrackColor={color}
          inactiveTrackColor="rgba(255, 255, 255, 0.1)"
          thumbColor="#FFFFFF"
          accentColor={color}
          showValue={false}
          disabled={disabled}
          style={styles.slider}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.color === nextProps.color &&
      prevProps.disabled === nextProps.disabled
    );
  }
);

IntensitySlider.displayName = 'IntensitySlider';

/**
 * Composant principal de contrôle des filtres
 */
export const FilterControls: React.FC<FilterControlsProps> = memo(
  ({ currentFilter, onFilterChange, onClearFilter, onClose, disabled = false, compact = false, style }) => {
    // État local optimisé
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [localIntensity, setLocalIntensity] = useState(currentFilter?.intensity ?? 1.0);
    const [showPresets, setShowPresets] = useState(false);
    const [showImport, setShowImport] = useState<false | 'xmp' | 'lut3d'>(false);

    // Mémorisation du filtre sélectionné
    const selectedFilter = useMemo(() => {
      if (!currentFilter) return AVAILABLE_FILTERS[0];
      const baseName = currentFilter.name.startsWith('lut3d:') ? 'lut3d' : currentFilter.name;
      return AVAILABLE_FILTERS.find(f => f.name === baseName) || AVAILABLE_FILTERS[0];
    }, [currentFilter]);

    // Filtres filtrés par catégorie
    const filteredFilters = useMemo(() => {
      if (!selectedCategory) return AVAILABLE_FILTERS;
      return AVAILABLE_FILTERS.filter(f => f.category === selectedCategory);
    }, [selectedCategory]);

    // Callbacks mémorisés
    const handleFilterSelect = useCallback(
      async (filter: FilterInfo) => {
        if (disabled) return;

        if (filter.name === 'none') {
          await onClearFilter();
        } else if (filter.name === 'lut3d') {
          setShowImport('lut3d');
        } else if (filter.name === 'xmp') {
          setShowImport('xmp');
        } else {
          const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0;
          setLocalIntensity(intensity);
          await onFilterChange(filter.name, intensity);
        }
      },
      [onFilterChange, onClearFilter, disabled]
    );

    const handleIntensityChange = useCallback((value: number) => {
      setLocalIntensity(value);
    }, []);

    const handleIntensityComplete = useCallback(
      (value: number) => {
        const targetName = currentFilter?.name ?? selectedFilter.name;
        onFilterChange(targetName, value);
      },
      [onFilterChange, selectedFilter.name, currentFilter?.name]
    );

    const handlePresetSelect = useCallback(
      async (preset: FilterPreset) => {
        setLocalIntensity(preset.intensity);
        await onFilterChange(preset.filter, preset.intensity, preset.params);
        setShowPresets(false);
      },
      [onFilterChange]
    );

    // Rendu compact pour les petits espaces
    if (compact) {
      return (
        <View style={styles.compactContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactContent}
          >
            {AVAILABLE_FILTERS.map((filter) => (
              <FilterButton
                key={filter.name}
                filter={filter}
                isSelected={selectedFilter.name === filter.name}
                onPress={handleFilterSelect}
                disabled={disabled}
                showInfo={false}
              />
            ))}
          </ScrollView>
          {/* Modal d'import pour le mode compact */}
          <ImportFilterModal
            visible={Boolean(showImport)}
            initialMode={showImport || undefined}
            intensity={localIntensity}
            onApply={onFilterChange}
            onClose={() => setShowImport(false)}
          />
        </View>
      );
    }

    // Rendu complet
    return (
      <View style={[styles.container, style]}>
        {/* Header avec titre et actions */}
        <View style={styles.header}>
          <Text style={styles.title}>Filtres Professionnels</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowPresets(!showPresets)}
            >
              <Text style={styles.headerButtonText}>⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowImport('xmp')}
            >
              <Text style={styles.headerButtonText}>↗️</Text>
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
              >
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Catégories */}
        <FilterCategories
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Presets */}
        {showPresets && (
          <FilterPresetsList onSelectPreset={handlePresetSelect} />
        )}

        {/* Liste des filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filteredFilters.map((filter) => (
            <FilterButton
              key={filter.name}
              filter={filter}
              isSelected={selectedFilter.name === filter.name}
              onPress={handleFilterSelect}
              disabled={disabled}
            />
          ))}
        </ScrollView>

        {/* Description et infos techniques */}
        <View style={styles.infoContainer}>
          <Text style={styles.description}>{selectedFilter.description}</Text>
          {selectedFilter.technicalInfo && (
            <Text style={styles.technicalInfo}>{selectedFilter.technicalInfo}</Text>
          )}
        </View>

        {/* Slider d'intensité */}
        {selectedFilter.hasIntensity && (
          <IntensitySlider
            value={localIntensity}
            onChange={handleIntensityChange}
            onComplete={handleIntensityComplete}
            color={selectedFilter.color}
            disabled={disabled}
          />
        )}

        {/* Modal d'import XMP / LUT 3D */}
        <ImportFilterModal
          visible={Boolean(showImport)}
          initialMode={showImport || undefined}
          intensity={localIntensity}
          onApply={onFilterChange}
          onClose={() => setShowImport(false)}
        />
      </View>
    );
  }
);

FilterControls.displayName = 'FilterControls';

const styles = StyleSheet.create({
  // Container principal
  container: {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    borderRadius: 20,
    padding: 14,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactContainer: {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    borderRadius: 12,
    padding: 8,
    margin: 4,
  },
  compactContent: {
    paddingHorizontal: 4,
    gap: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Catégories
  categoriesContainer: {
    maxHeight: 40,
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Filtres
  filtersContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  filterButtonContainer: {
    marginHorizontal: 4,
  },
  filterButton: {
    alignItems: 'center',
    width: 80,
    paddingVertical: 8,
  },
  filterButtonSelected: {
    transform: [{ scale: 1.05 }],
  },
  filterButtonPressed: {
    opacity: 0.7,
  },
  filterButtonDisabled: {
    opacity: 0.4,
  },
  filterGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  filterIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  filterIcon: {
    fontSize: 24,
  },
  filterName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterTechnicalInfo: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 2,
  },

  // Info
  infoContainer: {
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  technicalInfo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Intensité
  intensityContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  intensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  intensityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  slider: {
    alignSelf: 'center',
  },

  // Presets
  presetsContainer: {
    marginBottom: 12,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  presetsContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  presetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  presetFilter: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default FilterControls;
