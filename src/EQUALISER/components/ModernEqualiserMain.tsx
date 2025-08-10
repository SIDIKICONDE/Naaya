/**
 * Composant principal de l'égaliseur ultra moderne
 * Design futuriste avec gradients, glassmorphism et animations fluides
 */

import { BlurView } from '@react-native-community/blur';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import type { AnimateStyle } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  SlideInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { EQUALISER_THEMES, PROFESSIONAL_PRESETS } from '../constants';
import { useEqualiser } from '../hooks/useEqualiser';
import { useGestureHandler } from '../hooks/useGestureHandler';
import { ModernControlPanel } from './ModernControlPanel';
import { ModernFrequencySlider } from './ModernFrequencySlider';
import { ModernPresetSelector } from './ModernPresetSelector';
import { ModernSpectrumVisualizer } from './ModernSpectrumVisualizer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModernEqualiserMainProps {
  theme?: 'dark' | 'light' | 'neon';
  onClose?: () => void;
  initialPreset?: string;
}

export const ModernEqualiserMain: React.FC<ModernEqualiserMainProps> = ({
  theme = 'dark',
  onClose,
  initialPreset = 'flat',
}) => {
  const colors = EQUALISER_THEMES[theme];
  const [activeView, setActiveView] = useState<'equalizer' | 'visualizer' | 'presets'>('equalizer');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Hook de l'égaliseur
  const {
    enabled,
    bypassed,
    bands,
    currentPreset,
    spectrumData,
    soloedBand,
    inputGain,
    outputGain,
    setEnabled,
    setBypass,
    setBandGain,
    setSoloBand,
    setPreset,
    resetAllBands,
    setInputGain,
    setOutputGain,
  } = useEqualiser({
    enableSpectrum: true,
    autoSave: true,
  });

  // Hook de gestion des gestes
  const {
    gesture,
    animatedStyle: gestureAnimatedStyle,
    triggerHaptic,
  } = useGestureHandler({
    enableHaptic: true,
    enableMultiTouch: true,
    conflictResolution: 'priority',
  });

  // Valeurs animées
  const headerOpacity = useSharedValue(1);
  const contentScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const rotateValue = useSharedValue(0);

  // Animation d'entrée
  useEffect(() => {
    headerOpacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(100, withSpring(1))
    );
    contentScale.value = withSequence(
      withTiming(0.9, { duration: 0 }),
      withDelay(200, withSpring(1))
    );
  }, [headerOpacity, contentScale]);

  // Appliquer le preset initial si fourni
  useEffect(() => {
    if (initialPreset) {
      setPreset(initialPreset);
    }
  }, [initialPreset, setPreset]);

  // Animation de glow pulsé
  useEffect(() => {
    const interval = setInterval(() => {
      glowIntensity.value = withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [glowIntensity]);

  // Styles animés
  const headerAnimatedStyle = useAnimatedStyle((): AnimateStyle<ViewStyle> => ({
    opacity: headerOpacity.value,
    transform: [
      { translateY: interpolate(headerOpacity.value, [0, 1], [-20, 0]) } as any,
    ] as any,
  }));

  const contentAnimatedStyle = useAnimatedStyle((): AnimateStyle<ViewStyle> => ({
    transform: [
      { scale: contentScale.value } as any,
      { rotate: `${rotateValue.value}deg` as `${number}deg` } as any,
    ] as any,
  }));

  const glowAnimatedStyle = useAnimatedStyle((): AnimateStyle<ViewStyle> => ({
    shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glowIntensity.value, [0, 1], [10, 30]),
  }));

  // Gestionnaires
  const handleBandChange = useCallback((bandId: string, value: number) => {
    triggerHaptic('light');
    setBandGain(bandId, value);
  }, [setBandGain, triggerHaptic]);

  const handlePresetSelect = useCallback((presetId: string) => {
    triggerHaptic('medium');
    setPreset(presetId);
    
    // Animation de transition
    contentScale.value = withSequence(
      withTiming(0.95, { duration: 150 }),
      withSpring(1)
    );
  }, [setPreset, triggerHaptic, contentScale]);

  const handleReset = useCallback(() => {
    triggerHaptic('heavy');
    resetAllBands();
    
    // Animation de reset
    rotateValue.value = withSequence(
      withTiming(360, { duration: 500 }),
      withTiming(0, { duration: 0 })
    );
  }, [resetAllBands, triggerHaptic, rotateValue]);

  const handleToggleBypass = useCallback(() => {
    triggerHaptic('medium');
    setBypass(!bypassed);
  }, [bypassed, setBypass, triggerHaptic]);

  const handleToggleEnabled = useCallback(() => {
    triggerHaptic('medium');
    setEnabled(!enabled);
  }, [enabled, setEnabled, triggerHaptic]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
      
      {/* Background avec gradient animé */}
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Effet de particules/étoiles en arrière-plan */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            entering={FadeIn.delay(i * 50).duration(1000)}
            style={[
              styles.particle,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * SCREEN_HEIGHT,
                backgroundColor: colors.accent,
              },
            ]}
          />
        ))}
      </View>

      {/* Header avec glassmorphism */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={theme === 'light' ? 'light' : 'dark'}
          blurAmount={20}
        />
        <LinearGradient
          colors={colors.gradients.glass}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: colors.text }]}>
            EQUALIZER PRO
          </Text>
          
          <TouchableOpacity onPress={handleToggleEnabled} style={styles.powerButton}>
            <LinearGradient
              colors={enabled ? colors.gradients.primary : ['#666', '#444']}
              style={styles.powerButtonGradient}
            >
              <Icon name="power" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tabs de navigation */}
        <View style={styles.tabs}>
          {['equalizer', 'visualizer', 'presets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveView(tab as any);
                triggerHaptic('light');
              }}
              style={[
                styles.tab,
                activeView === tab && styles.activeTab,
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeView === tab ? colors.primary : colors.textSecondary }
              ]}>
                {tab.toUpperCase()}
              </Text>
              {activeView === tab && (
                <LinearGradient
                  colors={colors.gradients.primary}
                  style={styles.tabIndicator}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={gesture}>
          <Animated.View style={[contentAnimatedStyle, gestureAnimatedStyle]}>
            {activeView === 'equalizer' && (
              <View style={styles.equalizerContainer}>
                {/* Visualiseur de spectre en arrière-plan */}
                <View style={styles.spectrumBackground}>
                  <ModernSpectrumVisualizer
                    data={spectrumData}
                    theme={colors}
                    height={150}
                    animated
                  />
                </View>

                {/* Sliders de fréquence */}
                <View style={styles.slidersContainer}>
                  {bands.map((band, index) => (
                    <ModernFrequencySlider
                      key={band.id}
                      band={band}
                      onChange={(value) => handleBandChange(band.id, value)}
                      theme={colors}
                      index={index}
                      totalBands={bands.length}
                      isSoloed={soloedBand === band.id}
                      onSolo={() => setSoloBand(band.id)}
                      animated
                    />
                  ))}
                </View>

                {/* Panneau de contrôle */}
                <ModernControlPanel
                  inputGain={inputGain}
                  outputGain={outputGain}
                  bypassed={bypassed}
                  onInputGainChange={setInputGain}
                  onOutputGainChange={setOutputGain}
                  onBypassToggle={handleToggleBypass}
                  onReset={handleReset}
                  theme={colors}
                />
              </View>
            )}

            {activeView === 'visualizer' && (
              <View style={styles.visualizerContainer}>
                <ModernSpectrumVisualizer
                  data={spectrumData}
                  theme={colors}
                  height={300}
                  mode="3d"
                  animated
                  fullscreen
                />
              </View>
            )}

            {activeView === 'presets' && (
              <ModernPresetSelector
                presets={PROFESSIONAL_PRESETS}
                currentPreset={currentPreset}
                onSelect={handlePresetSelect}
                theme={colors}
              />
            )}
          </Animated.View>
        </GestureDetector>
      </ScrollView>

      {/* Footer avec informations */}
      <Animated.View 
        style={[styles.footer, glowAnimatedStyle]}
        entering={SlideInDown.delay(300)}
      >
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={theme === 'light' ? 'light' : 'dark'}
          blurAmount={15}
        />
        <LinearGradient
          colors={colors.gradients.glass}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.footerContent}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              { backgroundColor: enabled ? colors.success : colors.danger }
            ]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {enabled ? 'Active' : 'Inactive'} • {currentPreset || 'Custom'}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => setShowAdvanced(!showAdvanced)}
            style={styles.advancedButton}
          >
            <Icon 
              name={showAdvanced ? 'chevron-down' : 'chevron-up'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,217,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  powerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  powerButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Style handled by indicator
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 1.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  equalizerContainer: {
    flex: 1,
  },
  spectrumBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    opacity: 0.3,
  },
  slidersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 20,
    marginTop: 150,
  },
  visualizerContainer: {
    flex: 1,
    paddingTop: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advancedButton: {
    padding: 5,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    opacity: 0.3,
  },
});
