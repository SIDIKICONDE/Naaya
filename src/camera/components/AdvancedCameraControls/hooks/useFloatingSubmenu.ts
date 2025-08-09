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
