import { BlurView } from '@react-native-community/blur';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNativeCamera } from '../../hooks/useNativeCamera';
import NativeCameraEngine from '../../index';
import { AdvancedFilterControls } from '../AdvancedFilterControls';
import { DiagnosticModal } from '../DiagnosticModal';
import { FilterControls } from '../FilterControls';
import { AdvancedControls } from './AdvancedControls';
import {
  FlashAutoIcon,
  FlashOffIcon,
  FlashOnIcon,
  GalleryIcon,
  RecordIcon,
  StopIcon,
  SwitchCameraIcon
} from './Icons';
import { Timer } from './Timer';
import type { AdvancedRecordingOptions, CameraPosition, FlashMode, RecordingState, VideoControlProps } from './types';

export const VideoControl: React.FC<VideoControlProps> = memo(({ 
  cameraRef,
  style,
  disabled = false,
  showBottomControls = true,
  onRecordingStart,
  onRecordingStop,
  onPhotoCaptured,
  initialFlashMode = 'off',
  initialCameraPosition = 'back',
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingSize, setRecordingSize] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>(initialFlashMode);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(initialCameraPosition);
  const [isBusy, setIsBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [_minZoom, setMinZoom] = useState<number | undefined>(undefined);
  const [_maxZoom, setMaxZoom] = useState<number | undefined>(undefined);
  const [_zoomLevel, setZoomLevel] = useState<number>(1);
  const [advanced, setAdvanced] = useState<AdvancedRecordingOptions>({
    recordAudio: true,
    container: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    width: undefined,
    height: undefined,
    fps: undefined,
    orientation: 'auto',
    stabilization: 'auto',
    lockAE: false,
    lockAWB: false,
    lockAF: false,
    saveDirectory: undefined,
    fileNamePrefix: undefined,
    videoBitrate: undefined,
    audioBitrate: undefined,
  });

  const blink = useRef(new Animated.Value(0)).current;
  const recordButtonScale = useRef(new Animated.Value(1)).current;
  const photoButtonScale = useRef(new Animated.Value(1)).current;
  const galleryButtonScale = useRef(new Animated.Value(1)).current;
  const recordPulse = useRef(new Animated.Value(1)).current;

  // Hook pour les filtres
  const { availableFilters, currentFilter, clearFilter, setFilter } = useNativeCamera();

  // Gestion des filtres
  const handleFilterChange = useCallback(async (name: string, intensity: number) => {
    try {
      return await setFilter(name, intensity);
    } catch (error) {
      console.error('[VideoControl] Erreur application filtre:', error);
      return false;
    }
  }, [setFilter]);

  const handleClearFilter = useCallback(async () => {
    try {
      return await clearFilter();
    } catch (error) {
      console.error('[VideoControl] Erreur suppression filtre:', error);
      return false;
    }
  }, [clearFilter]);
  
  type IntervalHandle = ReturnType<typeof setInterval> | null;
  const durationTimer = useRef<IntervalHandle>(null);
  const progressTimer = useRef<IntervalHandle>(null);

  // Animations d'enregistrement et pulsation
  useEffect(() => {
    if (recordingState === 'recording') {
      // Animation de clignotement du point rouge
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
      
      // Animation de pulsation du bouton d'enregistrement
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(recordPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      blink.setValue(0);
      recordPulse.setValue(1);
    }
  }, [recordingState, blink, recordPulse]);

  // timers durée + progression taille
  useEffect(() => {
    if (recordingState === 'recording') {
      durationTimer.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
      progressTimer.current = setInterval(async () => {
        try {
          const prog = await NativeCameraEngine.getRecordingProgress();
          if (prog && typeof prog.size === 'number') setRecordingSize(prog.size);
        } catch {}
      }, 1000);
    } else {
      if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
      setRecordingDuration(0);
      setRecordingSize(0);
    }
    return () => {
      if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
      if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    };
  }, [recordingState]);

  // Charger min/max zoom une fois au montage (ou quand la caméra prête si besoin)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [mn, mx] = await Promise.all([
          NativeCameraEngine.getMinZoom(),
          NativeCameraEngine.getMaxZoom(),
        ]);
        if (mounted) {
          setMinZoom(mn);
          setMaxZoom(mx);
          setZoomLevel(mn);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Animation pulsation record
  useEffect(() => {
    if (recordingState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(recordPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      recordPulse.setValue(1);
    }
  }, [recordingState, recordPulse]);


  // Animations de pression pour les boutons
  const animateButtonPress = useCallback((animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(animValue, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // Icône flash dynamique
  const flashIcon = useMemo(() => {
    switch (flashMode) {
      case 'on': return <FlashOnIcon size={20} color="#FFD700" />;
      case 'off': return <FlashOffIcon size={20} color="#FFFFFF" strokeWidth={1.5} />;
      case 'auto': return <FlashAutoIcon size={20} color="#00E5FF" />;
      default: return <FlashOnIcon size={20} color="#FFFFFF" />;
    }
  }, [flashMode]);

  const toggleFlash = useCallback(async () => {
    if (disabled || recordingState === 'recording' || isBusy) return;
    const modes: Array<FlashMode> = ['off', 'on', 'auto'];
    const next = modes[(modes.indexOf(flashMode) + 1) % modes.length];
    try {
      setIsBusy(true);
      await cameraRef.current?.setFlashMode(next);
      setFlashMode(next);
    } catch (error) {
      console.warn('[VideoControl] Erreur toggle flash:', error);
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, flashMode, recordingState, isBusy]);

  const toggleCamera = useCallback(async () => {
    if (disabled || recordingState === 'recording' || isBusy) return;
    const next: CameraPosition = cameraPosition === 'back' ? 'front' : 'back';
    
    try {
      setIsBusy(true);
      
      // Timeout pour éviter le blocage
      const switchPromise = cameraRef.current?.switchDevice(next);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      await Promise.race([switchPromise, timeoutPromise]);
      setCameraPosition(next);
      console.log('[VideoControl] Caméra basculée vers:', next);
      
    } catch (error) {
      console.warn('[VideoControl] Erreur bascule caméra:', error);
      // Ne pas changer cameraPosition en cas d'erreur
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, cameraPosition, disabled, recordingState, isBusy]);

  const takePhoto = useCallback(async () => {
    if (disabled || recordingState !== 'idle') return;
    try {
      setIsBusy(true);
      const result = await cameraRef.current?.capturePhoto?.({ quality: 0.9 });
      onPhotoCaptured?.(result);
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onPhotoCaptured, recordingState]);

  const startRecording = useCallback(async () => {
    if (disabled || recordingState !== 'idle') return;
    try {
      setIsBusy(true);
      await cameraRef.current?.startRecording?.({ 
        quality: 'high', 
        recordAudio: advanced.recordAudio, 
        maxDuration: 60,
        container: advanced.container,
        codec: advanced.codec,
        audioCodec: advanced.audioCodec,
        width: advanced.width,
        height: advanced.height,
        fps: advanced.fps,
        orientation: advanced.orientation,
        stabilization: advanced.stabilization,
        lockAE: advanced.lockAE,
        lockAWB: advanced.lockAWB,
        lockAF: advanced.lockAF,
        saveDirectory: advanced.saveDirectory,
        fileNamePrefix: advanced.fileNamePrefix,
        videoBitrate: advanced.videoBitrate,
        audioBitrate: advanced.audioBitrate,
      } as any);
      setRecordingState('recording');
      onRecordingStart?.();
    } finally {
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onRecordingStart, recordingState, advanced]);

  const stopRecording = useCallback(async () => {
    if (disabled || recordingState !== 'recording') return;
    try {
      setIsBusy(true);
      setRecordingState('processing');
      const result = await (cameraRef.current?.stopRecording?.());
      onRecordingStop?.(result);
    } finally {
      setRecordingState('idle');
      setIsBusy(false);
    }
  }, [cameraRef, disabled, onRecordingStop, recordingState]);

  const recordingMb = useMemo(() => (recordingSize / 1024 / 1024).toFixed(2), [recordingSize]);



  // Callbacks avec animations
  const onRecordPress = useCallback(() => {
    animateButtonPress(recordButtonScale);
    return recordingState === 'idle' ? startRecording() : stopRecording();
  }, [animateButtonPress, recordButtonScale, recordingState, startRecording, stopRecording]);

  const onPhotoPress = useCallback(() => {
    animateButtonPress(photoButtonScale);
    return takePhoto();
  }, [animateButtonPress, photoButtonScale, takePhoto]);

  const onGalleryPress = useCallback(() => {
    animateButtonPress(galleryButtonScale);
    // Action galerie à implémenter
  }, [animateButtonPress, galleryButtonScale]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {recordingState === 'recording' && (
        <Timer seconds={recordingDuration} blinkOpacity={blink} />
      )}

      {/* Contrôles du haut modernes */}
      <View style={styles.topControls}>
        <TouchableOpacity 
          style={[styles.modernControlButton, disabled || recordingState === 'recording' ? styles.disabledControl : null]} 
          onPress={toggleFlash} 
          disabled={disabled || recordingState === 'recording'}
        >
          <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
            {flashIcon}
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modernControlButton, disabled || recordingState === 'recording' ? styles.disabledControl : null]} 
          onPress={toggleCamera} 
          disabled={disabled || recordingState === 'recording'}
        >
          <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
            <SwitchCameraIcon size={20} color="#FFFFFF" strokeWidth={1.5} />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modernControlButton} 
          onPress={() => setShowAdvanced(s => !s)}
        >
          <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
            <Text style={styles.controlIcon}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modernControlButton} 
          onPress={() => setShowDiagnostic(true)}
        >
          <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
            <Text style={styles.controlIcon}>🔧</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Bouton Filtres */}
        <TouchableOpacity 
          style={styles.modernControlButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <BlurView style={styles.blurContainer} blurType="dark" blurAmount={20}>
            <Text style={[styles.controlIcon, currentFilter && styles.activeFilterIcon]}>🎨</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Contrôles du bas simplifiés */}
      {showBottomControls && (
        <View style={styles.bottomBar}>
          {/* Galerie */}
          <Animated.View style={{ transform: [{ scale: galleryButtonScale }] }}>
            <TouchableOpacity 
              style={[styles.simpleButton]}
              onPress={onGalleryPress}
              activeOpacity={0.8}
            >
              <GalleryIcon size={24} color="#FFFFFF" strokeWidth={1.5} />
            </TouchableOpacity>
          </Animated.View>

          {/* Enregistrer / Stop */}
          <Animated.View style={{ 
            transform: [
              { scale: recordButtonScale },
              { scale: recordingState === 'recording' ? recordPulse : 1 }
            ] 
          }}>
            <TouchableOpacity
              style={[
                styles.simpleRecordButton,
                recordingState === 'recording' && styles.simpleRecordButtonActive,
                recordingState === 'processing' && styles.simpleRecordButtonProcessing,
              ]}
              onPress={onRecordPress}
              disabled={disabled || recordingState === 'processing'}
              activeOpacity={0.9}
            >
              {recordingState === 'processing' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : recordingState === 'recording' ? (
                <StopIcon size={26} color="#FFFFFF" />
              ) : (
                <RecordIcon size={28} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Switch caméra */}
          <TouchableOpacity 
            style={[styles.simpleButton, (disabled || recordingState === 'recording') && styles.disabledButton]}
            onPress={toggleCamera}
            disabled={disabled || recordingState === 'recording'}
            activeOpacity={0.8}
          >
            <SwitchCameraIcon size={24} color="#FFFFFF" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      )}

      {recordingState === 'recording' && (
        <View style={styles.statusPanel}>
          <Text style={styles.statusText}>Fichier: {recordingMb} MB</Text>
        </View>
      )}

      {showAdvanced && (
        <AdvancedControls 
          value={advanced}
          onChange={setAdvanced}
          onApply={() => setShowAdvanced(false)}
        />
      )}

      {/* Contrôles de filtres */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <FilterControls
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
            onClearFilter={handleClearFilter}
            onClose={() => setShowFilters(false)}
            disabled={recordingState === 'recording'}
          />
          
          {/* Bouton pour les contrôles avancés */}
          {currentFilter?.name === 'color_controls' && (
            <TouchableOpacity 
              style={styles.advancedFiltersButton}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Text style={styles.advancedFiltersButtonText}>
                {showAdvancedFilters ? 'Masquer les contrôles avancés' : 'Contrôles avancés'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contrôles avancés de filtres */}
      {showAdvancedFilters && (
        <AdvancedFilterControls
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          disabled={recordingState === 'recording'}
          visible={showAdvancedFilters}
        />
      )}

      <DiagnosticModal 
        visible={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
      />
    </View>
  );
});

VideoControl.displayName = 'VideoControl';

const styles = StyleSheet.create({
  // Panneau de statut
  statusPanel: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  controlIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
  },

  // Contrôles du haut modernes
  topControls: {
    position: 'absolute',
    top: 60,
    right: 24,
    gap: 20,
  },
  modernControlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  disabledControl: {
    opacity: 0.4,
  },

  // Barre du bas simplifiée
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleRecordButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleRecordButtonActive: {
    backgroundColor: '#FF453A',
  },
  simpleRecordButtonProcessing: {
    backgroundColor: '#555555',
  },
  disabledButton: {
    opacity: 0.4,
  },

  // Styles pour les filtres
  activeFilterIcon: {
    color: '#FF6B6B',
    textShadowColor: '#FF6B6B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  filtersPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 160,
    zIndex: 100,
  },
  advancedFiltersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  advancedFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Styles obsolètes supprimés (ancien bouton premium)
});

export default VideoControl;


