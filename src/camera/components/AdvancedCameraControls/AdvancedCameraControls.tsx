/**
 * Système de contrôles caméra avancé et adaptatif
 * Interface nouvelle génération avec gestes, adaptabilité et intelligence contextuelle
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ContextualTimer } from './components/ContextualTimer';
import { GestureArea } from './components/GestureArea';
import { ThreeDotsMenu } from './components/ThreeDotsMenu';

import { useHaptics } from './hooks/useHaptics';
import { ProLayout } from './layouts/ProLayout';
import type {
  AdvancedCameraControlsProps,
  FlashMode,
  GestureConfig,
  GesturePoint,
  GestureType,
  GestureVelocity,
  InterfaceMode,
  PinchScale,
  RecordingMetadata,
  SwipeDirection,
  ThemeConfig
} from './types';

export const AdvancedCameraControls = memo<AdvancedCameraControlsProps>(({ 
  disabled = false,
  recordingState,
  cameraMode,
  flashMode,
  cameraPosition: _cameraPosition,
  context,
  recordingMetadata,
  theme: customTheme,
  gestureConfig,
  onModeChange: _onModeChange,
  onRecordPress,
  onPhotoPress,
  onPausePress,
  onFlashPress,
  onSwitchCamera,
  onZoomChange,
  onExposureChange: _onExposureChange,
  onFocusChange: _onFocusChange,
  onFilterPress,
  onSettingsPress,
  onTimerPress,
  onGridPress,
  onGesture,
  style,
  onTimerChange,
  onGridToggle,
  onSettingsOpen,
  currentFilter,
  onFilterChange,
  onClearFilter,
}) => {
  const [_autoHideTimer, _setAutoHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Thème par défaut
  const defaultTheme: ThemeConfig = useMemo(() => ({
    isDark: true,
    accentColor: '#FF4757',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    surfaceColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
    activeColor: '#FF6B6B',
    disabledColor: 'rgba(255, 255, 255, 0.3)',
  }), []);

  const theme = useMemo(() => ({
    ...defaultTheme,
    ...customTheme,
  }), [defaultTheme, customTheme]);

  // Layout adaptatif (valeurs par défaut) - Version compacte
  const interfaceMode: InterfaceMode = 'pro';
  const interfaceVisible = true;
  const showInterface = useCallback(() => {}, []);
  const resetAutoHide = useCallback(() => {}, []);
  const isCompact = true; // Activé pour un design compact
  const isLandscape = false;

  // Feedback haptique
  const { haptics } = useHaptics({ enabled: true, intensity: 1 });

  // Métadonnées d'enregistrement par défaut
  const defaultRecordingMetadata: RecordingMetadata = useMemo(() => ({
    duration: 0,
    fileSize: 0,
    resolution: '1920x1080',
    frameRate: 30,
    quality: 'high',
  }), []);

  const currentRecordingMetadata = recordingMetadata || defaultRecordingMetadata;

  // Configuration des gestes avec valeurs par défaut
  const defaultGestureConfig: GestureConfig = useMemo(() => ({
    enableSwipeToSwitch: true,
    enablePinchToZoom: true,
    enableDoubleTapPhoto: true,
    enableLongPressSettings: true,
    swipeSensitivity: 0.5,
    pinchSensitivity: 0.1,
  }), []);

  const currentGestureConfig = useMemo(() => ({
    ...defaultGestureConfig,
    ...gestureConfig,
  }), [defaultGestureConfig, gestureConfig]);

  // Actions unifiées
  const handleAction = useCallback((action: string, _data?: any) => {
    resetAutoHide();
    
    switch (action) {
      case 'record':
        haptics.startRecord();
        onRecordPress();
        break;
      case 'recordHold':
        haptics.startRecord();
        onRecordPress();
        break;
      case 'photo':
        haptics.capture();
        onPhotoPress();
        break;
      case 'pause':
        haptics.pauseRecord();
        onPausePress?.();
        break;
      case 'resume':
        haptics.startRecord();
        onRecordPress(); // Resume peut utiliser la même fonction
        break;
      case 'flash':
        haptics.selectOption();
        onFlashPress();
        break;
      case 'switchCamera':
        haptics.switchMode();
        onSwitchCamera();
        break;
      case 'filters':
        haptics.openPanel();
        onFilterPress();
        break;
      case 'gallery':
        // galerie supprimée
        break;
      case 'settings':
        haptics.openPanel();
        onSettingsPress?.();
        break;
      case 'timer':
        haptics.selectOption();
        onTimerPress?.();
        break;
      case 'grid':
        haptics.selectOption();
        onGridPress?.();
        break;
      // modeSwitch supprimé (mode photo retiré)
      case 'zoomReset':
        haptics.selectOption();
        onZoomChange(1);
        break;
      // Suppression des actions de focus
      case 'openPanel':
        haptics.openPanel();
        break;
      case 'closePanel':
        haptics.closePanel();
        break;
      default:
        console.warn('[AdvancedCameraControls] Action non reconnue:', action);
    }
  }, [
    resetAutoHide,
    haptics,
    onRecordPress,
    onPhotoPress,
    onPausePress,
    onFlashPress,
    onSwitchCamera,
    onFilterPress,
    onSettingsPress,
    onTimerPress,
    onGridPress,
    onZoomChange,
  ]);

  // Gestion des gestes
  const handleGesture = useCallback((type: GestureType, data: any) => {
    resetAutoHide();
    showInterface();
    
    switch (type) {
      case 'tap':
        break;
      case 'double-tap':
        // Photo rapide
        if (recordingState === 'idle') {
          handleAction('photo');
        }
        break;
      case 'long-press':
        // Ouvrir paramètres avancés
        handleAction('settings');
        break;
      case 'swipe':
        if (data.direction === 'left' || data.direction === 'right') {
          // Changer de mode
          handleAction('modeSwitch');
        } else if (data.direction === 'up') {
          // Ouvrir filtres
          handleAction('filters');
        } else if (data.direction === 'down') {
          // Ouvrir galerie
          handleAction('gallery');
        }
        break;
      case 'pinch':
        // Zoom
        if (data.scale > 0.1 && data.scale < 10) {
          onZoomChange(Math.max(1, data.scale));
          haptics.zoom();
        }
        break;
    }

    onGesture?.(type, data);
  }, [
    resetAutoHide,
    showInterface,
    haptics,
    recordingState,
    handleAction,
    onZoomChange,
    onGesture,
  ]);

  // Layout fixe (ProLayout par défaut)
  const CurrentLayout = ProLayout;

  // Styles dynamiques pour l'interface compacte
  const interfaceStyles = {
    opacity: interfaceVisible ? 1 : 0,
    transform: [{ translateY: interfaceVisible ? 0 : 30 }], // Réduction de l'animation
  };

  // Propriétés communes pour tous les layouts
  const layoutProps = useMemo(() => ({
    context: {
      ...context,
      flashMode,
      mode: cameraMode,
      orientation: isLandscape ? 'landscape' as const : 'portrait' as const,
      interfaceMode,
      isCompact, // Ajout de la propriété compact
    },
    recordingState,
    recordingMetadata: currentRecordingMetadata,
    theme,
    onAction: handleAction,
  }), [
    context,
    flashMode,
    cameraMode,
    isLandscape,
    interfaceMode,
    isCompact,
    recordingState,
    currentRecordingMetadata,
    theme,
    handleAction,
  ]);



  if (disabled) {
    return (
      <View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none">
        {/* Interface désactivée - peut afficher un état de chargement */}
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="box-none">
      {/* Zone de gestes */}
      <GestureArea
        onTap={(point: GesturePoint) => handleGesture('tap', { point })}
        onDoubleTap={(point: GesturePoint) => handleGesture('double-tap', { point })}
        onLongPress={(point: GesturePoint) => handleGesture('long-press', { point })}
        onSwipe={(direction: SwipeDirection, velocity: GestureVelocity) => handleGesture('swipe', { direction, velocity })}
        onPinch={(scale: PinchScale, velocity: GestureVelocity) => handleGesture('pinch', { scale, velocity })}
        disabled={disabled}
        gestureConfig={currentGestureConfig}
        style={styles.gestureArea}
      >
        {/* Menu trois points */}
        <ThreeDotsMenu
          flashMode={flashMode}
          onFlashModeChange={(mode: FlashMode) => {
            // Relayer à l'extérieur si fourni
            if (typeof onFlashPress === 'function') {
              onFlashPress();
            }
            // Note: onFlashModeChange est géré via onFlashPress
          }}
          onTimerChange={onTimerChange || (() => {})}
          timerSeconds={0}
          onGridToggle={onGridToggle || (() => {})}
          onSettingsOpen={onSettingsOpen || (() => {})}
          position={isLandscape ? 'top-right' : 'bottom-right'} // Position footer pour compact
          theme={theme.isDark ? 'dark' : 'light'}
          onAction={(action: string) => handleAction(action)}
          cameraMode={cameraMode}
          currentFilter={currentFilter}
          onFilterChange={onFilterChange}
          onClearFilter={onClearFilter}
        />

        {/* Interface principale */}
        <Animated.View
          style={[
            styles.interface,
            interfaceStyles,
          ]}
        >
          {/* Timer contextuel compact */}
          <ContextualTimer
            recordingMetadata={currentRecordingMetadata}
            mode={cameraMode}
            visible={recordingState === 'recording' || recordingState === 'paused'}
            position="top" // Toujours en haut pour le mode compact
            showDetails={false} // Détails réduits pour économiser l'espace
            theme={theme}
          />

          {/* Interface adaptative */}
          {interfaceVisible && (
            <CurrentLayout {...layoutProps} />
          )}

          {/* Interface d'urgence compacte */}
          {!interfaceVisible && recordingState === 'recording' && (
            <View style={styles.emergencyInterface} pointerEvents="box-none">
              <View
                style={[styles.emergencyTap, { backgroundColor: theme.accentColor }]}
                onTouchEnd={showInterface}
              />
            </View>
          )}
        </Animated.View>
      </GestureArea>
    </View>
  );
});

AdvancedCameraControls.displayName = 'AdvancedCameraControls';

const styles = StyleSheet.create({
  gestureArea: {
    flex: 1,
  },
  interface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  emergencyInterface: {
    position: 'absolute',
    top: 30, // Réduit de 40 à 30
    right: 15, // Réduit de 20 à 15
    zIndex: 1000,
  },
  emergencyTap: {
    width: 10, // Réduit de 12 à 10
    height: 10, // Réduit de 12 à 10
    borderRadius: 5, // Réduit de 6 à 5
    opacity: 0.7, // Augmenté de 0.6 à 0.7 pour une meilleure visibilité
  },
});
