/**
 * Sous-menu flottant custom pour les options Flash et Timer
 * Design compact et moderne avec animations fluides
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface FloatingSubmenuProps {
  visible: boolean;
  position?: { x: number; y: number }; // Position optionnelle, centre par défaut
  items: Array<{
    id: string;
    label: string;
    icon: string;
    active?: boolean;
    onPress: () => void;
  }>;
  onClose: () => void;
  theme?: 'light' | 'dark';
  centered?: boolean; // Nouveau prop pour centrer
}

export const FloatingSubmenu: React.FC<FloatingSubmenuProps> = ({
  visible,
  position,
  items,
  onClose,
  theme = 'dark',
  centered = true, // Centre par défaut
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'ouverture
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 400,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animation de fermeture
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const containerStyle = centered 
    ? {
        // Menu centré sans pourcentages (compatibilité types)
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [
          {
            scale: scaleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ],
        opacity: opacityAnim,
      }
    : {
        // Position basée sur le bouton
        position: 'absolute' as const,
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        transform: [
          {
            scale: scaleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ],
        opacity: opacityAnim,
      };

  return (
    <>
      {/* Backdrop invisible pour fermer */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      
      {/* Menu flottant */}
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={[
          styles.menuContainer,
          theme === 'dark' ? styles.darkTheme : styles.lightTheme
        ]}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                item.active && styles.menuItemActive,
                index === 0 && styles.firstItem,
                index === items.length - 1 && styles.lastItem,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.menuIcon,
                item.active && styles.activeIcon
              ]}>
                {item.icon}
              </Text>
              <Text style={[
                styles.menuLabel,
                theme === 'dark' ? styles.darkText : styles.lightText,
                item.active && styles.activeText
              ]}>
                {item.label}
              </Text>
              {item.active && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Flèche pointant vers le bouton parent (seulement si pas centré) */}
        {!centered && (
          <View style={[
            styles.arrow,
            theme === 'dark' ? styles.darkArrow : styles.lightArrow
          ]} />
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    elevation: 998,
  },
  container: {
    zIndex: 9999,
    elevation: 999,
  },
  menuContainer: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 1000,
    zIndex: 10000,
  },
  darkTheme: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lightTheme: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    position: 'relative',
  },
  firstItem: {
    marginTop: 2,
  },
  lastItem: {
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  menuIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  activeIcon: {
    transform: [{ scale: 1.1 }],
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },
  darkText: {
    color: '#FFFFFF',
  },
  lightText: {
    color: '#000000',
  },
  activeText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginLeft: 6,
  },
  arrow: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 6,
  },
  darkArrow: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(30, 30, 30, 0.95)',
  },
  lightArrow: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.95)',
  },
});
