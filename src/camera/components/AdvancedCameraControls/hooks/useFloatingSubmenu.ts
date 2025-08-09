/**
 * Hook custom pour gérer les sous-menus flottants
 * Simplifie l'usage et la gestion des positions
 */

import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

interface SubmenuItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
}

interface FloatingSubmenuState {
  visible: boolean;
  position: { x: number; y: number };
  items: SubmenuItem[];
}

export const useFloatingSubmenu = () => {
  const [submenuState, setSubmenuState] = useState<FloatingSubmenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    items: [],
  });

  const buttonRef = useRef<View>(null);

  const showSubmenu = useCallback((
    items: SubmenuItem[],
    triggerRef?: React.RefObject<View>
  ) => {
    const ref = triggerRef || buttonRef;
    
    if (ref.current) {
      ref.current.measure((x, y, width, height, pageX, pageY) => {
        setSubmenuState({
          visible: true,
          position: {
            x: pageX + width / 2 - 60, // Centrer le menu
            y: pageY + height + 8, // Positionner sous le bouton
          },
          items,
        });
      });
    }
  }, []);

  const hideSubmenu = useCallback(() => {
    setSubmenuState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const toggleSubmenu = useCallback((
    items: SubmenuItem[],
    triggerRef?: React.RefObject<View>
  ) => {
    if (submenuState.visible) {
      hideSubmenu();
    } else {
      showSubmenu(items, triggerRef);
    }
  }, [submenuState.visible, showSubmenu, hideSubmenu]);

  return {
    submenuState,
    showSubmenu,
    hideSubmenu,
    toggleSubmenu,
    buttonRef,
  };
};

// Helpers pour créer rapidement des items de menu
export const createFlashItems = (
  currentMode: string,
  onModeChange: (mode: string) => void
): SubmenuItem[] => [
  {
    id: 'off',
    label: 'Off',
    icon: '⚫',
    active: currentMode === 'off',
    onPress: () => onModeChange('off'),
  },
  {
    id: 'auto',
    label: 'Auto',
    icon: '🔆',
    active: currentMode === 'auto',
    onPress: () => onModeChange('auto'),
  },
  {
    id: 'on',
    label: 'On',
    icon: '⚡',
    active: currentMode === 'on',
    onPress: () => onModeChange('on'),
  },
];

export const createTimerItems = (
  currentTimer: number,
  onTimerChange: (seconds: number) => void
): SubmenuItem[] => [
  {
    id: '0',
    label: 'Off',
    icon: '⏱️',
    active: currentTimer === 0,
    onPress: () => onTimerChange(0),
  },
  {
    id: '3',
    label: '3s',
    icon: '⏱️',
    active: currentTimer === 3,
    onPress: () => onTimerChange(3),
  },
  {
    id: '5',
    label: '5s',
    icon: '⏱️',
    active: currentTimer === 5,
    onPress: () => onTimerChange(5),
  },
  {
    id: '10',
    label: '10s',
    icon: '⏱️',
    active: currentTimer === 10,
    onPress: () => onTimerChange(10),
  },
];

export const createGridItems = (
  currentMode: 'none' | 'thirds' | 'golden' | 'diagonals',
  onChange: (mode: 'none' | 'thirds' | 'golden' | 'diagonals') => void,
  currentAspect: 'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16',
  onAspectChange: (aspect: 'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16') => void,
): { title: string; items: SubmenuItem[]; aspectItems: SubmenuItem[] } => {
  const items: SubmenuItem[] = [
    { id: 'mode:none', label: 'Aucune', icon: '✕', active: currentMode === 'none', onPress: () => onChange('none') },
    { id: 'mode:thirds', label: 'Tiers', icon: '⊞', active: currentMode === 'thirds', onPress: () => onChange('thirds') },
    { id: 'mode:golden', label: 'Nombre d’or', icon: 'Φ', active: currentMode === 'golden', onPress: () => onChange('golden') },
    { id: 'mode:diagonals', label: 'Diagonales', icon: '⟂', active: currentMode === 'diagonals', onPress: () => onChange('diagonals') },
  ];

  const aspectItems: SubmenuItem[] = [
    { id: 'aspect_none', label: 'Libre', icon: '□', active: currentAspect === 'none', onPress: () => onAspectChange('none') },
    { id: 'aspect_1_1', label: '1:1', icon: '◼︎', active: currentAspect === '1:1', onPress: () => onAspectChange('1:1') },
    { id: 'aspect_4_3', label: '4:3', icon: '▭', active: currentAspect === '4:3', onPress: () => onAspectChange('4:3') },
    { id: 'aspect_16_9', label: '16:9', icon: '▭', active: currentAspect === '16:9', onPress: () => onAspectChange('16:9') },
    { id: 'aspect_2_39_1', label: '2.39:1', icon: '▭', active: currentAspect === '2.39:1', onPress: () => onAspectChange('2.39:1') },
    { id: 'aspect_9_16', label: '9:16', icon: '▯', active: currentAspect === '9:16', onPress: () => onAspectChange('9:16') },
  ];

  return { title: 'Grille', items, aspectItems };
};
