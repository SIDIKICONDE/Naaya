/**
 * Contrôles de filtres compacts optimisés pour les petits espaces
 * Version minimaliste avec performances maximales
 */
import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ANIMATION_CONFIG, AVAILABLE_FILTERS } from './constants';
import type { FilterControlsProps, FilterInfo } from './types';

/**
 * Bouton de filtre compact optimisé
 */
const CompactFilterButton = memo<{
  filter: FilterInfo;
  isSelected: boolean;
  onPress: (filter: FilterInfo) => void;
  disabled?: boolean;
}>(
  ({ filter, isSelected, onPress, disabled = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const borderAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    // Animation de sélection
    React.useEffect(() => {
      Animated.timing(borderAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }, [isSelected, borderAnim]);

    const handlePressIn = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        speed: 20,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 20,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
      if (!disabled) {
        onPress(filter);
      }
    }, [filter, onPress, disabled]);

    const borderColor = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.1)', filter.color],
    });

    return (
      <Animated.View
        style={[
          styles.buttonWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
        >
          <Animated.View
            style={[
              styles.filterButton,
              {
                borderColor,
                borderWidth: 2,
                opacity: disabled ? 0.4 : 1,
              },
            ]}
          >
            {filter.previewGradient && isSelected ? (
              <LinearGradient
                colors={filter.previewGradient as string[]}
                style={styles.gradientBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            ) : null}
            <View style={styles.buttonContent}>
              <Text style={[styles.filterIcon, isSelected && styles.filterIconSelected]}>
                {filter.icon}
              </Text>
              <Text
                style={[
                  styles.filterLabel,
                  isSelected && styles.filterLabelSelected,
                ]}
                numberOfLines={1}
              >
                {filter.displayName}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.filter.name === nextProps.filter.name &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.disabled === nextProps.disabled
    );
  }
);

CompactFilterButton.displayName = 'CompactFilterButton';

/**
 * Composant principal de contrôles compacts
 */
const CompactFilterControls: React.FC<FilterControlsProps> = memo(
  ({ currentFilter, onFilterChange, onClearFilter, disabled = false }) => {
    // Mémorisation du filtre sélectionné
    const selectedFilter = useMemo(() => {
      if (!currentFilter) return AVAILABLE_FILTERS[0];
      const baseName = currentFilter.name.startsWith('lut3d:') ? 'lut3d' : currentFilter.name;
      return AVAILABLE_FILTERS.find(f => f.name === baseName) || AVAILABLE_FILTERS[0];
    }, [currentFilter]);

    // Callback pour la sélection de filtre
    const handleFilterSelect = useCallback(
      async (filter: FilterInfo) => {
        if (disabled) return;

        if (filter.name === 'none') {
          await onClearFilter();
        } else {
          const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0;
          await onFilterChange(filter.name, intensity);
        }
      },
      [onFilterChange, onClearFilter, disabled]
    );

    // Rendu optimisé avec FlatList
    const renderFilter = useCallback(
      ({ item }: { item: FilterInfo }) => (
        <CompactFilterButton
          filter={item}
          isSelected={selectedFilter.name === item.name}
          onPress={handleFilterSelect}
          disabled={disabled}
        />
      ),
      [selectedFilter.name, handleFilterSelect, disabled]
    );

    const keyExtractor = useCallback((item: FilterInfo) => item.name, []);

    // Optimisation : scroll automatique vers le filtre sélectionné
    const flatListRef = useRef<FlatList<FilterInfo>>(null);
    const getItemLayout = useCallback(
      (_: any, index: number) => ({
        length: 72, // largeur du bouton + marges
        offset: 72 * index,
        index,
      }),
      []
    );

    React.useEffect(() => {
      const selectedIndex = AVAILABLE_FILTERS.findIndex(
        f => f.name === selectedFilter.name
      );
      if (selectedIndex > 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }, [selectedFilter.name]);

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(20, 20, 30, 0.95)', 'rgba(20, 20, 30, 0.85)']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <FlatList
            ref={flatListRef}
            horizontal
            data={AVAILABLE_FILTERS}
            renderItem={renderFilter}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialScrollIndex={0}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />
        </LinearGradient>
        {selectedFilter.name !== 'none' && (
          <View style={styles.infoBar}>
            <Text style={styles.selectedFilterName}>{selectedFilter.displayName}</Text>
            {selectedFilter.technicalInfo && (
              <Text style={styles.technicalInfo} numberOfLines={1}>
                {selectedFilter.technicalInfo}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

CompactFilterControls.displayName = 'CompactFilterControls';

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  gradientContainer: {
    borderRadius: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  buttonWrapper: {
    marginHorizontal: 4,
  },
  filterButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  filterIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  filterIconSelected: {
    fontSize: 22,
  },
  filterLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  filterLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  selectedFilterName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  technicalInfo: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});

export default CompactFilterControls;



