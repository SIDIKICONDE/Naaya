/**
 * Menu contextuel avec trois points pour les options avancées
 * Gère le flash, timer, grille et paramètres
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { AdvancedFilterParams, FilterState } from '../../../../../specs/NativeCameraFiltersModule';
import { EqualiserMain } from '../../../../EQUALISER/components/EqualiserMain';
import { ModernAdvancedControls } from '../../VideoControl/ModernAdvancedControls';
import { AdvancedFilterControls } from '../../filters/AdvancedFilterControls';
import { CompactFilterControls } from '../../filters/CompactFilterControls';
import { createFlashItems, createGridItems, createTimerItems, useFloatingSubmenu } from '../hooks/useFloatingSubmenu';
import type { CameraMode, FlashMode } from '../types';
import { FloatingSubmenu } from './FloatingSubmenu';

// Icônes Unicode simples
const ICONS = {
  FLASH_ON: '⚡',
  FLASH_OFF: '⚫',
  FLASH_AUTO: '🔆',
  TIMER: '⏱️',
  GRID: '⊞',
  SETTINGS: '⚙️',
  MORE: '⋯',
  CLOSE: '✕',
  CHECK: '✓',
  ARROW_RIGHT: '▶',
  ARROW_UP: '▲',
  // Actions supplémentaires déplacées depuis l'écran
  SWITCH_CAMERA: '🔄',
  FILTER: '🔍',
  SLIDERS: '🎛️',
  VIDEO: '🎥',
  ZOOM: '🔍',
  AUDIO: '🎚️',
};

export interface ThreeDotsMenuProps {
  flashMode: FlashMode;
  onFlashModeChange: (mode: FlashMode) => void;
  onTimerChange: (seconds: number) => void;
  timerSeconds: number;
  onGridToggle: () => void;
  // État avancé de la grille (optionnel)
  gridMode?: 'none' | 'thirds' | 'golden' | 'diagonals';
  onGridModeChange?: (mode: 'none' | 'thirds' | 'golden' | 'diagonals') => void;
  gridAspect?: 'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16';
  onGridAspectChange?: (aspect: 'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16') => void;
  onSettingsOpen: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'light' | 'dark';
  // Ajouts pour déplacer les options dans ce menu
  onAction?: (action: string) => void;
  cameraMode?: CameraMode;
  // Props pour AdvancedControls
  advancedOptions?: any;
  onAdvancedOptionsChange?: (options: any) => void;
  // Props pour les filtres
  currentFilter?: FilterState | null;
  onFilterChange?: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  onClearFilter?: () => Promise<boolean>;
  // Affichage
  inline?: boolean;
}

interface MenuOption {
  id: string;
  icon: string;
  label: string;
  action: () => void;
  hasSubmenu?: boolean;
}

export const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({
  flashMode,
  onFlashModeChange,
  onTimerChange,
  timerSeconds,
  onGridToggle,
  gridMode = 'thirds',
  onGridModeChange,
  gridAspect = 'none',
  onGridAspectChange,
  onSettingsOpen,
  position = 'top-right',
  theme = 'dark',
  onAction,
  cameraMode: _cameraMode,
  advancedOptions,
  onAdvancedOptionsChange,
  currentFilter,
  onFilterChange,
  onClearFilter,
  inline = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showFilterControls, setShowFilterControls] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);

  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    console.log('[ThreeDotsMenu] rendu: position=', position, ' theme=', theme);
  }, [position, theme]);

  // Hook pour les sous-menus flottants
  const { submenuState, showSubmenu, hideSubmenu, buttonRef } = useFloatingSubmenu();

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
    });
  };

  const handleFlashSubmenu = () => {
    closeMenu(); // Fermer le menu principal d'abord
    setTimeout(() => {
      showSubmenu(createFlashItems(flashMode, (mode) => {
        onFlashModeChange(mode as FlashMode);
        hideSubmenu();
      }));
    }, 200);
  };

  const handleTimerSubmenu = () => {
    closeMenu(); // Fermer le menu principal d'abord
    setTimeout(() => {
      showSubmenu(createTimerItems(timerSeconds, (seconds) => {
        onTimerChange(seconds);
        hideSubmenu();
      }));
    }, 200);
  };

  // Animation d'ouverture du menu
  useEffect(() => {
    if (isMenuOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 20,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMenuOpen, scaleAnim, opacityAnim]);



  const handleGridToggle = () => {
    // Si des callbacks avancés existent, ouvrir un sous-menu combiné
    if (onGridModeChange || onGridAspectChange) {
      closeMenu();
      setTimeout(() => {
        const { items, aspectItems } = createGridItems(
          gridMode,
          (mode) => {
            onGridModeChange?.(mode);
            // activer la grille si on choisit autre que none
            if (mode !== 'none') onGridToggle();
            hideSubmenu();
          },
          gridAspect,
          (aspect) => {
            onGridAspectChange?.(aspect);
            onGridToggle();
            hideSubmenu();
          }
        );
        // Fusionner les deux listes dans un seul sous-menu (titre implicite)
        showSubmenu([
          ...items,
          { id: 'sep', label: '———', icon: ' ', onPress: () => {} },
          ...aspectItems,
        ]);
      }, 200);
    } else {
      onGridToggle();
      closeMenu();
    }
  };

  const handleSettingsOpen = () => {
    onSettingsOpen();
    closeMenu();
    setTimeout(() => {
      setShowAdvancedControls(true);
    }, 200);
  };

  const handleFiltersOpen = () => {
    console.log('[ThreeDotsMenu] handleFiltersOpen: ouverture du modal filtres');
    // Ouvrir immédiatement le modal filtres et fermer le menu sans délai
    console.log('[ThreeDotsMenu] setShowFilterControls(true)');
    setShowFilterControls(true);
    setIsMenuOpen(false);
  };

  const handleAudioOpen = () => {
    setShowAudioControls(true);
    setIsMenuOpen(false);
  };





  const menuOptions: MenuOption[] = [
    {
      id: 'flash',
      icon: ICONS.FLASH_ON,
      label: 'Flash',
      action: handleFlashSubmenu,
      hasSubmenu: false,
    },
    {
      id: 'timer',
      icon: ICONS.TIMER,
      label: 'Timer',
      action: handleTimerSubmenu,
      hasSubmenu: false,
    },
    {
      id: 'grid',
      icon: ICONS.GRID,
      label: 'Grille',
      action: handleGridToggle,
    },
    {
      id: 'settings',
      icon: ICONS.SETTINGS,
      label: 'Paramètres',
      action: handleSettingsOpen,
    },
    // Options déplacées depuis l'écran d'enregistrement
    {
      id: 'switchCamera',
      icon: ICONS.SWITCH_CAMERA,
      label: 'Changer de caméra',
      action: () => onAction?.('switchCamera'),
    },
    {
      id: 'filters',
      icon: ICONS.FILTER,
      label: 'Filtres',
      action: handleFiltersOpen,
    },
    {
      id: 'audio',
      icon: ICONS.AUDIO,
      label: 'Audio',
      action: handleAudioOpen,
    },

    {
      id: 'zoomReset',
      icon: ICONS.ZOOM,
      label: 'Réinitialiser le zoom',
      action: () => onAction?.('zoomReset'),
    },
  ];

  const getButtonPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: 20, left: 20 };
      case 'top-right':
        return { top: 20, right: 20 };
      case 'bottom-left':
        return { bottom: 20, left: 20 };
      case 'bottom-right':
        return { bottom: 20, right: 20 };
      default:
        return { top: 20, right: 20 };
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.menuButton,
          inline ? styles.menuButtonInline : getButtonPositionStyles()
        ]}
        onPress={openMenu}
        activeOpacity={0.7}
      >
        <Text style={styles.menuButtonText}>{ICONS.MORE}</Text>
      </TouchableOpacity>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                opacity: opacityAnim,
                transform: [
                  {
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {menuOptions.map((option) => (
              <View key={option.id}>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    theme === 'light' ? styles.menuItemLight : styles.menuItemDark
                  ]}
                  onPress={option.action}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.menuLabel,
                    theme === 'light' ? styles.menuLabelLight : styles.menuLabelDark
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Sous-menu flottant */}
      <FloatingSubmenu
        visible={submenuState.visible}
        position={submenuState.position}
        items={submenuState.items}
        onClose={hideSubmenu}
        theme={theme}
        centered={true}
      />

      {/* Contrôles avancés modernes */}
      {showAdvancedControls && advancedOptions && onAdvancedOptionsChange && (
        <ModernAdvancedControls
          value={advancedOptions}
          onChange={onAdvancedOptionsChange}
          onApply={() => setShowAdvancedControls(false)}
          onClose={() => setShowAdvancedControls(false)}
        />
      )}

      {/* Filtres - Page modale plein écran */}
      {showFilterControls && onFilterChange && onClearFilter && (
        <Modal
          visible={showFilterControls}
          animationType="slide"
          presentationStyle="fullScreen"
          statusBarTranslucent={false}
          onRequestClose={() => setShowFilterControls(false)}
        >
          <SafeAreaView style={styles.filterPageContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtres</Text>
              <TouchableOpacity
                style={styles.filterModalClose}
                onPress={() => setShowFilterControls(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <CompactFilterControls
                  currentFilter={currentFilter || null}
                  onFilterChange={(name, intensity) => onFilterChange(name, intensity)}
                  onClearFilter={onClearFilter}
                  disabled={false}
                  showLabels={true}
                  style={styles.compactFilterControls}
                />
              </View>

              <View style={styles.advancedSection}>
                <AdvancedFilterControls
                  currentFilter={currentFilter || null}
                  onFilterChange={(name, intensity, params) => onFilterChange(name, intensity, params)}
                  disabled={false}
                  visible={true}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Audio - Égaliseur plein écran */}
      {showAudioControls && (
        <Modal
          visible={showAudioControls}
          animationType="slide"
          presentationStyle="fullScreen"
          statusBarTranslucent={false}
          onRequestClose={() => setShowAudioControls(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <EqualiserMain 
              theme="dark"
              onClose={() => setShowAudioControls(false)}
              showAdvancedControls={true}
            />
          </SafeAreaView>
        </Modal>
      )}


    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  menuButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPageContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  filterScroll: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  advancedSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  menuContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 14,
    padding: 6,
    minWidth: 160,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#AAAAAA',
    marginLeft: 10,
  },
  submenu: {
    marginLeft: 12,
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  submenuItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.5)',
  },
  submenuIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 18,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  submenuLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  checkIcon: {
    fontSize: 14,
    color: '#00D4FF',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  menuItemLight: {
    backgroundColor: '#f8f9fa',
  },
  menuItemDark: {
    backgroundColor: '#2c2c2e',
  },
  menuLabelLight: {
    color: '#000',
  },
  menuLabelDark: {
    color: '#fff',
  },
  menuButtonInline: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  filterModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 540,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  compactFilterControls: {
    backgroundColor: 'transparent',
  },
});
