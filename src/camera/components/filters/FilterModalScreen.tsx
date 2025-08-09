/**
 * Page modale pleine écran pour les filtres
 * Interface dédiée avec plus d'espace pour les contrôles avancés
 */

import React, { memo, useCallback, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AdvancedFilterParams, FilterState } from '../../../../specs/NativeCameraFiltersModule';
import { AdvancedFilterControls } from './AdvancedFilterControls';
import { CompactFilterControls } from './CompactFilterControls';

export interface FilterModalScreenProps {
  visible: boolean;
  onClose: () => void;
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
}

export const FilterModalScreen: React.FC<FilterModalScreenProps> = memo(({
  visible,
  onClose,
  currentFilter,
  onFilterChange,
  onClearFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'advanced'>('filters');

  const handleFilterChange = useCallback(async (name: string, intensity: number, params?: AdvancedFilterParams) => {
    try {
      const success = await onFilterChange(name, intensity, params);
      if (success && (name === 'color_controls' || name === 'custom')) {
        // Basculer automatiquement vers l'onglet avancé pour les filtres compatibles
        setActiveTab('advanced');
      }
      return success;
    } catch (error) {
      console.error('[FilterModalScreen] Erreur application filtre:', error);
      return false;
    }
  }, [onFilterChange]);

  const handleClearFilter = useCallback(async () => {
    try {
      const success = await onClearFilter();
      if (success) {
        setActiveTab('filters');
      }
      return success;
    } catch (error) {
      console.error('[FilterModalScreen] Erreur suppression filtre:', error);
      return false;
    }
  }, [onClearFilter]);

  const isAdvancedFilterActive = currentFilter?.name === 'color_controls' || currentFilter?.name === 'custom';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Filtres et Effets</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Onglets */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'filters' && styles.tabActive]}
            onPress={() => setActiveTab('filters')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'filters' && styles.tabTextActive]}>
              Filtres
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === 'advanced' && styles.tabActive,
              !isAdvancedFilterActive && styles.tabDisabled
            ]}
            onPress={() => isAdvancedFilterActive && setActiveTab('advanced')}
            activeOpacity={0.7}
            disabled={!isAdvancedFilterActive}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'advanced' && styles.tabTextActive,
              !isAdvancedFilterActive && styles.tabTextDisabled
            ]}>
              Avancé
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {activeTab === 'filters' ? (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.filtersSection}>
                <Text style={styles.sectionTitle}>Filtres disponibles</Text>
                <Text style={styles.sectionDescription}>
                  Sélectionnez un filtre pour l'appliquer à votre caméra
                </Text>
                
                <View style={styles.compactFiltersWrapper}>
                  <CompactFilterControls
                    currentFilter={currentFilter}
                    onFilterChange={handleFilterChange}
                    onClearFilter={handleClearFilter}
                    disabled={false}
                    showLabels={true}
                    style={styles.compactFilterControls}
                  />
                </View>

                {/* Informations sur le filtre actuel */}
                {currentFilter && currentFilter.name !== 'none' && (
                  <View style={styles.filterInfo}>
                    <Text style={styles.filterInfoTitle}>Filtre actuel</Text>
                    <Text style={styles.filterInfoText}>
                      {currentFilter.name} - Intensité: {Math.round(currentFilter.intensity * 100)}%
                    </Text>
                    {isAdvancedFilterActive && (
                      <Text style={styles.filterInfoHint}>
                        👆 Passez à l'onglet "Avancé" pour plus d'options
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.advancedSection}>
                <Text style={styles.sectionTitle}>Contrôles avancés</Text>
                <Text style={styles.sectionDescription}>
                  Ajustez finement les paramètres du filtre "{currentFilter?.name}"
                </Text>
                
                <AdvancedFilterControls
                  currentFilter={currentFilter}
                  onFilterChange={onFilterChange}
                  disabled={false}
                  visible={true}
                />
              </View>
            </ScrollView>
          )}
        </View>

        {/* Actions en bas */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleClearFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>🔄 Réinitialiser</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.applyButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.applyButtonText}>✓ Appliquer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabDisabled: {
    opacity: 0.5,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#CCCCCC',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabTextDisabled: {
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  filtersSection: {
    paddingHorizontal: 20,
  },
  advancedSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
    lineHeight: 20,
  },
  compactFiltersWrapper: {
    marginBottom: 24,
  },
  compactFilterControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  filterInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  filterInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  filterInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  filterInfoHint: {
    fontSize: 12,
    color: '#CCCCCC',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FilterModalScreen;
