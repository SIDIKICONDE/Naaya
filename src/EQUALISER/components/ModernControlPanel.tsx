/**
 * Panneau de contrôle moderne avec animations fluides
 * Contrôles de gain et boutons d'action stylisés
 */

import Slider from '@react-native-community/slider';
import React, { memo, useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { AnimateStyle } from 'react-native-reanimated';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { EqualiserTheme } from '../types';

// Removed unused SCREEN_WIDTH

interface ModernControlPanelProps {
  inputGain: number;
  outputGain: number;
  bypassed: boolean;
  onInputGainChange: (value: number) => void;
  onOutputGainChange: (value: number) => void;
  onBypassToggle: () => void;
  onReset: () => void;
  theme: EqualiserTheme;
}

const AnimatedButton = memo<{
  onPress: () => void;
  icon: string;
  label: string;
  theme: EqualiserTheme;
  isActive?: boolean;
  color?: string;
}>(({ onPress, icon, label, theme, isActive = false, color: _color }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1.1),
      withSpring(1)
    );
    rotation.value = withSequence(
      withTiming(5, { duration: 100 }),
      withTiming(-5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    onPress();
  }, [onPress, rotation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }) as unknown as AnimateStyle<ViewStyle>);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={isActive 
            ? theme.gradients.primary 
            : [theme.surface, theme.border]
          }
          style={styles.button}
        >
          <Icon 
            name={icon} 
            size={24} 
            color={isActive ? '#FFF' : theme.textSecondary} 
          />
          <Text style={[
            styles.buttonLabel,
            { color: isActive ? '#FFF' : theme.textSecondary }
          ]}>
            {label}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
});

const GainControl = memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  theme: EqualiserTheme;
  icon: string;
}>(({ label, value, onChange, theme, icon }) => {
  const animatedValue = useSharedValue(value);

  const handleValueChange = useCallback((newValue: number) => {
    animatedValue.value = withSpring(newValue);
    onChange(newValue);
  }, [animatedValue, onChange]);

  const valueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(
        Math.abs(animatedValue.value),
        [0, 12],
        [1, 1.2],
        Extrapolate.CLAMP
      ) },
    ],
  }) as unknown as AnimateStyle<ViewStyle>);

  return (
    <View style={styles.gainControl}>
      <View style={styles.gainHeader}>
        <Icon name={icon} size={20} color={theme.primary} />
        <Text style={[styles.gainLabel, { color: theme.text }]}>
          {label}
        </Text>
        <Animated.View style={valueAnimatedStyle}>
          <Text style={[styles.gainValue, { color: theme.primary }]}>
            {value >= 0 ? '+' : ''}{value.toFixed(1)} dB
          </Text>
        </Animated.View>
      </View>
      
      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLimit, { color: theme.textSecondary }]}>
          -12
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={-12}
          maximumValue={12}
          value={value}
          onValueChange={handleValueChange}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbTintColor={theme.accent}
        />
        <Text style={[styles.sliderLimit, { color: theme.textSecondary }]}>
          +12
        </Text>
      </View>
    </View>
  );
});

export const ModernControlPanel = memo<ModernControlPanelProps>(({
  inputGain,
  outputGain,
  bypassed,
  onInputGainChange,
  onOutputGainChange,
  onBypassToggle,
  onReset,
  theme,
}) => {
  const panelScale = useSharedValue(1);

  // Animation d'entrée
  React.useEffect(() => {
    panelScale.value = withSequence(
      withTiming(0.95, { duration: 0 }),
      withSpring(1)
    );
  }, [panelScale]);

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: panelScale.value }],
  }) as unknown as AnimateStyle<ViewStyle>);

  return (
    <Animated.View style={[styles.container, panelAnimatedStyle]}>
      <LinearGradient
        colors={theme.gradients.glass}
        style={styles.gradient}
      >
        {/* Gain Controls */}
        <View style={styles.gainsSection}>
          <GainControl
            label="Input Gain"
            value={inputGain}
            onChange={onInputGainChange}
            theme={theme}
            icon="import"
          />
          
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          
          <GainControl
            label="Output Gain"
            value={outputGain}
            onChange={onOutputGainChange}
            theme={theme}
            icon="export"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsSection}>
          <AnimatedButton
            onPress={onBypassToggle}
            icon={bypassed ? "power-off" : "power"}
            label="Bypass"
            theme={theme}
            isActive={!bypassed}
          />
          
          <AnimatedButton
            onPress={onReset}
            icon="refresh"
            label="Reset"
            theme={theme}
          />
          
          <AnimatedButton
            onPress={() => {}}
            icon="content-save"
            label="Save"
            theme={theme}
          />
          
          <AnimatedButton
            onPress={() => {}}
            icon="compare"
            label="A/B"
            theme={theme}
          />
        </View>

        {/* Status Bar */}
        <View style={[styles.statusBar, { backgroundColor: theme.surface }]}>
          <View style={styles.statusItem}>
            <View style={[
              styles.statusDot,
              { backgroundColor: bypassed ? theme.warning : theme.success }
            ]} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {bypassed ? 'Bypassed' : 'Processing'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Icon name="cpu-64-bit" size={14} color={theme.textSecondary} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              CPU: 12%
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Icon name="timer" size={14} color={theme.textSecondary} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Latency: 2.3ms
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  gainsSection: {
    marginBottom: 20,
  },
  gainControl: {
    marginVertical: 10,
  },
  gainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gainLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  gainValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLimit: {
    fontSize: 10,
    fontWeight: '600',
    width: 25,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.2,
  },
  buttonsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderRadius: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
});
