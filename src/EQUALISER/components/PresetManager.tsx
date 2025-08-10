/**
 * Gestionnaire de préréglages pour l'égaliseur
 * Interface moderne avec catégories et recherche
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { EqualiserPreset, EqualiserTheme } from '../types';

interface PresetManagerProps {
  currentPreset: string | null;
  presets: EqualiserPreset[];
  onSelectPreset: (presetId: string) => void;
  onReset: () => void;
  onCreateCustom?: (preset: EqualiserPreset) => void;
  theme: EqualiserTheme;
  disabled?: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: '🎵' },
  { id: 'genre', name: 'Genres', icon: '🎸' },
  { id: 'voice', name: 'Voix', icon: '🎤' },
  { id: 'instrument', name: 'Instruments', icon: '🎹' },
  { id: 'custom', name: 'Personnalisés', icon: '⭐' },
];

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentPreset,
  presets,
  onSelectPreset,
  onReset,
  onCreateCustom,
  theme,
  disabled = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // Calculer l'opacité basée sur l'état disabled
  const opacityValue = disabled ? 0.5 : 1;

  // Filtrer les préréglages
  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [presets, selectedCategory, searchQuery]);

  // Animation de la recherche
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showSearch ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showSearch, fadeAnim]);

  const handlePresetSelect = useCallback((presetId: string) => {
    if (!disabled) {
      onSelectPreset(presetId);
    }
  }, [disabled, onSelectPreset]);

  const handleReset = useCallback(() => {
    if (!disabled) {
      onReset();
    }
  }, [disabled, onReset]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Préréglages
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Text style={styles.iconButtonText}>🔍</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.resetButton, { 
              backgroundColor: theme.danger + '20',
              opacity: opacityValue,
            }]}
            onPress={handleReset}
            disabled={disabled}
          >
            <Text style={[styles.resetButtonText, { color: theme.danger }]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      {showSearch && (
        <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            }]}
            placeholder="Rechercher un préréglage..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Animated.View>
      )}

      {/* Catégories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        keyboardShouldPersistTaps="always"
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
              { 
                backgroundColor: selectedCategory === category.id 
                  ? theme.primary + '20' 
                  : theme.surface,
                borderColor: selectedCategory === category.id
                  ? theme.primary
                  : theme.border,
              },
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryName,
              { color: selectedCategory === category.id ? theme.primary : theme.textSecondary }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des préréglages */}
      <View 
        style={styles.presetsList}
      >
        {filteredPresets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              Aucun préréglage trouvé
            </Text>
          </View>
        ) : (
          <View pointerEvents="box-none" style={styles.presetsGrid}>
            {filteredPresets.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetItem,
                  currentPreset === preset.id && styles.presetItemActive,
                  {
                    backgroundColor: currentPreset === preset.id
                      ? theme.primary + '20'
                      : theme.surface,
                    borderColor: currentPreset === preset.id
                      ? theme.primary
                      : theme.border,
                    opacity: opacityValue,
                  },
                ]}
                onPress={() => handlePresetSelect(preset.id)}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                disabled={disabled}
              >
                <View style={styles.presetHeader}>
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  {currentPreset === preset.id && (
                    <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                
                <Text 
                  style={[
                    styles.presetName,
                    { color: currentPreset === preset.id ? theme.primary : theme.text }
                  ]}
                  numberOfLines={1}
                >
                  {preset.name}
                </Text>
                
                <Text 
                  style={[styles.presetDescription, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {preset.description}
                </Text>

                {/* Aperçu visuel des gains */}
                <View style={styles.presetPreview}>
                  {Object.values(preset.bands).slice(0, 10).map((gain, index) => (
                    <View
                      key={index}
                      style={[
                          styles.previewBar,
                          {
                            backgroundColor: gain > 0 ? theme.primary : theme.secondary,
                            height: Math.abs(gain) * 2 + 2,
                            opacity: 0.8 as const,
                          },
                        ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Bouton pour créer un préréglage personnalisé */}
      {onCreateCustom && (
        <TouchableOpacity
          style={[styles.createButton, { 
            backgroundColor: theme.primary,
            opacity: opacityValue,
          }]}
          onPress={() => {
            // TODO: Implémenter la création de préréglage
          }}
          disabled={disabled}
        >
          <Text style={styles.createButtonText}>
            + Créer un préréglage
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 16,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  categoriesContainer: {
    paddingBottom: 12,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryButtonActive: {
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsList: {
    flex: 1,
  },
  presetsContent: {
    paddingBottom: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetItem: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  presetItemActive: {
    borderWidth: 2,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetIcon: {
    fontSize: 24,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  presetPreview: {
    flexDirection: 'row',
    gap: 2,
    height: 20,
    alignItems: 'flex-end',
  },
  previewBar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
  },
  createButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
