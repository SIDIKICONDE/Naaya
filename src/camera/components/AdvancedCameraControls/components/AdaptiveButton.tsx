/**
 * Composant bouton adaptatif avec feedback haptique et animations
 * S'adapte automatiquement au contexte et à la taille d'écran
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useHaptics } from '../hooks/useHaptics';
import type { AdaptiveButtonProps, ThemeConfig } from '../types';

interface AdaptiveButtonInternalProps extends AdaptiveButtonProps {
  theme: ThemeConfig;
  adaptiveSize?: number;
}

export const AdaptiveButton = memo<AdaptiveButtonInternalProps>(({
  disabled = false,
  onPress,
  onLongPress,
  children,
  size = 'medium',
  variant = 'default',
  shape = 'circle',
  hapticFeedback = true,
  tooltip,
  badge,
  theme,
  adaptiveSize,
  style,
}) => {
  const { haptics } = useHaptics({ enabled: hapticFeedback, intensity: 1 });
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const badgeAnim = useRef(new Animated.Value(badge ? 1 : 0)).current;

  // Calcul des dimensions
  const dimensions = useMemo(() => {
    const baseSizes = {
      small: adaptiveSize ? adaptiveSize * 0.8 : 42,
      medium: adaptiveSize || 50,
      large: adaptiveSize ? adaptiveSize * 1.2 : 60,
      auto: adaptiveSize || 50,
    };

    const buttonSize = baseSizes[size];
    const borderRadius = shape === 'circle' ? buttonSize / 2 : 
                       shape === 'rounded' ? buttonSize * 0.25 : 4;

    return { buttonSize, borderRadius };
  }, [size, shape, adaptiveSize]);

  // Couleurs selon le variant et le thème
  const colors = useMemo(() => {
    const baseColors = {
      background: theme.surfaceColor,
      border: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      text: theme.textColor,
      icon: theme.iconColor,
    };

    switch (variant) {
      case 'active':
        return {
          ...baseColors,
          background: theme.activeColor,
          border: theme.activeColor,
          text: '#FFFFFF',
          icon: '#FFFFFF',
        };
      case 'accent':
        return {
          ...baseColors,
          background: theme.accentColor,
          border: theme.accentColor,
          text: '#FFFFFF',
          icon: '#FFFFFF',
        };
      case 'danger':
        return {
          ...baseColors,
          background: '#FF4757',
          border: '#FF4757',
          text: '#FFFFFF',
          icon: '#FFFFFF',
        };
      default:
        return baseColors;
    }
  }, [variant, theme]);

  // Animation de pression
  const animatePress = useCallback(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  // Animation du badge
  React.useEffect(() => {
    Animated.spring(badgeAnim, {
      toValue: badge ? 1 : 0,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [badge, badgeAnim]);

  // Gestion des interactions
  const handlePress = useCallback(() => {
    if (disabled) return;
    
    animatePress();
    if (hapticFeedback) {
      haptics.selectOption();
    }
    onPress();
  }, [disabled, animatePress, hapticFeedback, haptics, onPress]);

  const handleLongPress = useCallback(() => {
    if (disabled || !onLongPress) return;
    
    if (hapticFeedback) {
      haptics.longPress();
    }
    onLongPress();
  }, [disabled, onLongPress, hapticFeedback, haptics]);

  // Styles dynamiques
  const buttonStyle = [
    styles.button,
    {
      width: dimensions.buttonSize,
      height: dimensions.buttonSize,
      borderRadius: dimensions.borderRadius,
      opacity: disabled ? 0.4 : 1,
    },
    style,
  ];

  const contentStyle = [
    styles.content,
    {
      borderRadius: dimensions.borderRadius,
      borderColor: colors.border,
    },
  ];

  return (
    <Animated.View
      style={[
        buttonStyle,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel={tooltip}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {/* Arrière-plan avec couleur unie */}
        <View
          style={[
            contentStyle,
            {
              backgroundColor: variant === 'default'
                ? theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)'
                : colors.background,
            },
          ]}
        >
          <View style={styles.children}>
            {children}
          </View>
        </View>

        {/* Badge */}
        {badge && (
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [{ scale: badgeAnim }],
                backgroundColor: theme.accentColor,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </Text>
          </Animated.View>
        )}

        {/* Tooltip (si nécessaire) */}
        {tooltip && variant === 'default' && (
          <View style={styles.tooltipContainer} pointerEvents="none">
            <Text style={[styles.tooltipText, { color: colors.text }]}>
              {tooltip}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

AdaptiveButton.displayName = 'AdaptiveButton';

const styles = StyleSheet.create({
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  touchable: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  children: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: -30,
    left: '50%',
    marginLeft: -50,
    width: 100,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
});
