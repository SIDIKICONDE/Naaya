/**
 * Composant panneau coulissant avec backdrop et animations
 * Permet d'afficher des options et contrôles avancés
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useHaptics } from '../hooks/useHaptics';
import type { SlidePanelProps, ThemeConfig } from '../types';

interface SlidePanelInternalProps extends SlidePanelProps {
  theme: ThemeConfig;
}

// Configuration des côtés pour éviter la duplication
const SIDE_CONFIG = {
  left: { axis: 'horizontal', position: 'left', translate: 'translateX' },
  right: { axis: 'horizontal', position: 'right', translate: 'translateX' },
  top: { axis: 'vertical', position: 'top', translate: 'translateY' },
  bottom: { axis: 'vertical', position: 'bottom', translate: 'translateY' },
} as const;

// Tailles prédéfinies
const SIZE_MAP = {
  small: 0.3,
  medium: 0.4,
  large: 0.6,
} as const;

export const SlidePanel = memo<SlidePanelInternalProps>(({
  visible,
  side,
  size = 'medium',
  backdrop = true,
  onClose,
  theme,
  children,
  style,
}) => {
  const { haptics } = useHaptics({ enabled: true, intensity: 0.8 });
  const translateAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const sideConfig = SIDE_CONFIG[side];

  // Calcul des dimensions du panneau
  const panelDimensions = useMemo(() => {
    const ratio = typeof size === 'number' 
      ? size / (sideConfig.axis === 'horizontal' ? screenWidth : screenHeight) 
      : SIZE_MAP[size];

    if (sideConfig.axis === 'horizontal') {
      return {
        width: Math.round(screenWidth * ratio),
        height: screenHeight,
      };
    } else {
      return {
        width: screenWidth,
        height: Math.round(screenHeight * ratio),
      };
    }
  }, [size, screenWidth, screenHeight, sideConfig.axis]);

  // Position initiale hors écran
  const getInitialTranslate = useCallback(() => {
    const isHorizontal = sideConfig.axis === 'horizontal';
    const dimension = isHorizontal ? panelDimensions.width : panelDimensions.height;
    
    switch (side) {
      case 'left':
      case 'top':
        return -dimension;
      case 'right':
      case 'bottom':
        return dimension;
      default:
        return 0;
    }
  }, [side, panelDimensions, sideConfig.axis]);

  // Animation d'ouverture
  const animateIn = useCallback(() => {
    translateAnim.setValue(getInitialTranslate());
    
    Animated.parallel([
      Animated.spring(translateAnim, {
        toValue: 0,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateAnim, backdropAnim, getInitialTranslate]);

  // Animation de fermeture
  const animateOut = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.spring(translateAnim, {
        toValue: getInitialTranslate(),
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  }, [translateAnim, backdropAnim, getInitialTranslate]);

  // Gestion de la fermeture
  const handleClose = useCallback(() => {
    haptics.closePanel();
    animateOut(() => onClose());
  }, [haptics, animateOut, onClose]);

  // Gestion du swipe pour fermer
  const handleSwipeGesture = useCallback(() => {
    const closeDirections = {
      left: 'left',
      right: 'right', 
      top: 'up',
      bottom: 'down'
    };
    
    if (closeDirections[side]) {
      handleClose();
    }
  }, [side, handleClose]);

  // Gestion du bouton retour Android
  useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible, handleClose]);

  // Animation d'ouverture
  useEffect(() => {
    if (visible) {
      haptics.openPanel();
      animateIn();
    }
  }, [visible, animateIn, haptics]);

  // Styles du panneau
  const panelStyle = useMemo(() => [
    styles.panel,
    {
      width: panelDimensions.width,
      height: panelDimensions.height,
      backgroundColor: theme.surfaceColor,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      [sideConfig.position]: 0,
      top: sideConfig.axis === 'horizontal' ? 0 : undefined,
      left: sideConfig.axis === 'vertical' ? 0 : undefined,
      transform: [{
        [sideConfig.translate]: translateAnim
      }],
    },
    style,
  ], [panelDimensions, theme, sideConfig, translateAnim, style]);

  // Style de l'indicateur de swipe
  const swipeIndicatorStyle = useMemo(() => [
    styles.swipeIndicator,
    side === 'left' && styles.swipeIndicatorLeft,
    side === 'right' && styles.swipeIndicatorRight,
    side === 'top' && styles.swipeIndicatorTop,
    side === 'bottom' && styles.swipeIndicatorBottom,
    { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' },
  ], [side, theme]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        {backdrop && (
          <TouchableWithoutFeedback onPress={handleClose}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
              <View style={[
                StyleSheet.absoluteFill, 
                styles.backdropInner
              ]} />
            </Animated.View>
          </TouchableWithoutFeedback>
        )}

        {/* Panneau */}
        <Animated.View style={panelStyle}>
          {/* Indicateur de glissement */}
          <TouchableWithoutFeedback onPress={handleSwipeGesture}>
            <View style={swipeIndicatorStyle} />
          </TouchableWithoutFeedback>

          {/* Contenu */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

SlidePanel.displayName = 'SlidePanel';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  swipeIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
  swipeIndicatorLeft: {
    right: 0,
    top: '50%',
    width: 4,
    height: 40,
    marginTop: -20,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  swipeIndicatorRight: {
    left: 0,
    top: '50%',
    width: 4,
    height: 40,
    marginTop: -20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  swipeIndicatorTop: {
    bottom: 0,
    left: '50%',
    width: 40,
    height: 4,
    marginLeft: -20,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  swipeIndicatorBottom: {
    top: 0,
    left: '50%',
    width: 40,
    height: 4,
    marginLeft: -20,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  backdropInner: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)',
  },
});
