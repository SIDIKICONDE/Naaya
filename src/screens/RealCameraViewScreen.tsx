/**
 * Écran d'enregistrement vidéo avec caméra native
 * Interface moderne et performante pour Naaya
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { NativeCameraEngine } from '../camera';
import { Platform, PermissionsAndroid, Dimensions } from 'react-native';
import { RecordingBar } from '../camera/components/AdvancedCameraControls/components/RecordingBar';
import { ThreeDotsMenu } from '../camera/components/AdvancedCameraControls/components/ThreeDotsMenu';
import type { FlashMode, RecordingState, ThemeConfig } from '../camera/components/AdvancedCameraControls/types';
import { GridOverlay } from '../camera/components/GridOverlay';
import type { NativeCameraRef } from '../camera/components/NativeCamera';
import { NativeCamera } from '../camera/components/NativeCamera';
import type { AdvancedRecordingOptions } from '../camera/components/VideoControl/types';
import { useNativeCamera } from '../camera/hooks/useNativeCamera';
import { useDebounce, useThrottle } from '../optimization/react-performance';
import { useSafeTimer, useMemoryOptimization, useMountedState } from '../optimization/memory-management';


export const RealCameraViewScreen: React.FC = () => {
  // Hooks de gestion mémoire
  const isMounted = useMountedState();
  const { setTimeout, setInterval, clearTimer } = useSafeTimer();
  useMemoryOptimization(() => {
    // Libérer la mémoire en cas d'avertissement
    if (cameraRef.current) {
      cameraRef.current.stopRecording?.();
    }
  });

  // Refs
  const cameraRef = useRef<NativeCameraRef>(null);

  // État
  const [isLoading, setIsLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridMode, setGridMode] = useState<'none' | 'thirds' | 'golden' | 'diagonals'>('thirds');
  const [gridAspect, setGridAspect] = useState<'none' | '1:1' | '4:3' | '16:9' | '2.39:1' | '9:16'>('none');
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedRecordingOptions>({
    recordAudio: true,
    container: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
    width: 1920,
    height: 1080,
    fps: 30,
    orientation: 'auto',
    stabilization: 'auto',
    lockAE: false,
    lockAWB: false,
    lockAF: false,
    fileNamePrefix: 'Naaya',
    // Par défaut en bps: 12 Mbps vidéo, 128 kbps audio
    videoBitrate: 12_000_000,
    audioBitrate: 128_000,
    saveToPhotos: true,
    albumName: 'Naaya',
  });

  // Countdown UI pour timer
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Hooks filtres (utilise le module natif CameraFilters)
  const { currentFilter, setFilter, clearFilter, switchDevice, currentDevice } = useNativeCamera();
  
  // Optimisation: debounce les options avancées pour éviter les re-rendus excessifs
  const debouncedAdvancedOptions = useDebounce(advancedOptions, 300);
  
  // Optimisation: mémoriser les dimensions calculées
  const recordingDimensions = useMemo(() => {
    if (gridAspect === 'none') {
      return { width: advancedOptions.width, height: advancedOptions.height };
    }
    
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    const aspectRatios = {
      '1:1': 1,
      '4:3': 4 / 3,
      '16:9': 16 / 9,
      '2.39:1': 2.39,
      '9:16': 9 / 16,
    };
    
    const ratio = aspectRatios[gridAspect];
    let width = screenWidth;
    let height = screenWidth / ratio;
    
    if (height > screenHeight) {
      height = screenHeight;
      width = screenHeight * ratio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }, [gridAspect, advancedOptions.width, advancedOptions.height]);

  // Gestion du basculement de caméra - déjà optimisé avec useCallback
  const handleSwitchCamera = useCallback(async () => {
    try {
      console.log('[RealCameraViewScreen] Basculement de caméra demandé');
      
      // Arrêter l'enregistrement si en cours
      if (recordingState === 'recording') {
        console.log('[RealCameraViewScreen] Arrêt de l\'enregistrement avant basculement');
        setRecordingState('processing');
        try {
          const result = await cameraRef.current?.stopRecording();
          if (result) {
            setRecordingDuration(Math.floor(result.duration || 0));
            console.log('[RealCameraViewScreen] Enregistrement arrêté avant basculement:', result.uri);
          }
        } catch (stopErr) {
          console.error('[RealCameraViewScreen] Erreur arrêt enregistrement avant basculement:', stopErr);
        }
        setRecordingState('idle');
      }
      
      // Déterminer la nouvelle position
      const currentPosition = currentDevice?.position || 'back';
      const newPosition = currentPosition === 'back' ? 'front' : 'back';
      
      console.log(`[RealCameraViewScreen] Basculement ${currentPosition} → ${newPosition}`);
      
      // Effectuer le basculement
      await switchDevice(newPosition);
      
      console.log('[RealCameraViewScreen] Basculement réussi');
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur lors du basculement:', error);
      Alert.alert(
        'Basculement Caméra',
        'Impossible de changer de caméra. Vérifiez que l\'autre caméra est disponible.',
        [{ text: 'OK' }]
      );
    }
  }, [currentDevice, recordingState, switchDevice]);

  // Gestion des actions du menu trois points
  const handleMenuAction = useCallback((action: string) => {
    console.log('[RealCameraViewScreen] Action menu:', action);
    
    switch (action) {
      case 'switchCamera':
        handleSwitchCamera();
        break;
      case 'zoomReset':
        // Reset du zoom via la ref caméra
        cameraRef.current?.setZoomLevel(1.0);
        break;
      default:
        console.warn('[RealCameraViewScreen] Action non gérée:', action);
    }
  }, [handleSwitchCamera]);

  // Nettoyage à la fermeture de l'écran
  useEffect(() => {
    const currentCamera = cameraRef.current;
    return () => {
      currentCamera?.stopCamera().catch(() => {});
    };
  }, []);

  // Callbacks
  const handleCameraReady = useCallback(() => {
    if (__DEV__) {
      console.log('[RealCameraViewScreen] Caméra prête');
    }
    setIsLoading(false);
  }, []);

  const handleCameraError = useCallback((error: Error) => {
    console.error('[RealCameraViewScreen] Erreur caméra:', error);
    Alert.alert(
      'Erreur Caméra',
      `Une erreur est survenue: ${error.message}`,
      [{ text: 'OK' }]
    );
  }, []);

  // Gestion de l'enregistrement
  const startRecordingFlow = useCallback(async () => {
    try {
      // S'assurer que la caméra est bien active avant de démarrer l'enregistrement
      try {
        const active = await NativeCameraEngine.isActive();
        if (!active) {
          console.warn('[RealCameraViewScreen] Caméra inactive — démarrage automatique avant enregistrement');
          await cameraRef.current?.startCamera();
          const nowActive = await NativeCameraEngine.isActive();
          if (!nowActive) {
            throw new Error('Caméra non prête');
          }
        }
      } catch (prepErr) {
        console.error('[RealCameraViewScreen] Préparation caméra avant enregistrement échouée:', prepErr);
        Alert.alert('Caméra', 'La caméra n\'est pas prête. Réessayez.');
        return;
      }
      // Vérifier permissions avant d'encoder l'audio
      let wantAudio = !!advancedOptions.recordAudio;
      try {
        const perms = await NativeCameraEngine.checkPermissions();
        if (Platform.OS === 'android' && wantAudio) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Permission Micro',
              message: 'Naaya a besoin d\'accéder au micro pour enregistrer l\'audio de vos vidéos.',
              buttonPositive: 'Autoriser',
              buttonNegative: 'Refuser',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('[RealCameraViewScreen] Micro refusé (Android) — enregistrement sans audio');
            wantAudio = false;
            Alert.alert('Micro non autorisé', 'L\'enregistrement démarre sans audio. Vous pourrez autoriser le micro dans Paramètres.');
          }
        } else if (wantAudio && perms.microphone !== 'granted') {
          const req = await NativeCameraEngine.requestPermissions();
          if (!req || req.microphone !== 'granted') {
            console.warn('[RealCameraViewScreen] Micro non autorisé — enregistrement sans audio');
            wantAudio = false;
            Alert.alert('Micro non autorisé', 'L\'enregistrement démarre sans audio. Vous pourrez autoriser le micro dans Réglages.');
          }
        }
      } catch {}

      // Utiliser les dimensions selon le format choisi
      const { width, height } = recordingDimensions;

      type NativeOrientation = 'auto' | 'portrait' | 'portraitUpsideDown' | 'landscapeLeft' | 'landscapeRight';
      const resolveOrientation = (): NativeOrientation => {
        const ui = advancedOptions.orientation || 'auto';
        if (ui === 'horizontal' || ui === 'paysage') {
          const { height: wh, width: ww } = Dimensions.get('window');
          const isLandscapeNow = ww > wh;
          return isLandscapeNow ? 'landscapeRight' : 'landscapeLeft';
        }
        return ui as NativeOrientation;
      };

      const options = {
        recordAudio: wantAudio,
        container: advancedOptions.container,
        codec: advancedOptions.codec,
        audioCodec: advancedOptions.audioCodec,
        width,
        height,
        fps: advancedOptions.fps,
        orientation: resolveOrientation(),
        stabilization: advancedOptions.stabilization,
        lockAE: advancedOptions.lockAE,
        lockAWB: advancedOptions.lockAWB,
        lockAF: advancedOptions.lockAF,
        fileNamePrefix: advancedOptions.fileNamePrefix,
        videoBitrate: advancedOptions.videoBitrate,
        audioBitrate: advancedOptions.audioBitrate,
        saveToPhotos: advancedOptions.saveToPhotos,
        albumName: advancedOptions.albumName,
        quality: 'high',
      } as const;
      setRecordingDuration(0);
      await cameraRef.current?.startRecording(options);
      setRecordingState('recording');
      console.log('[RealCameraViewScreen] Enregistrement démarré');
    } catch (err) {
      console.error('[RealCameraViewScreen] Erreur enregistrement:', err);
      Alert.alert('Enregistrement', 'Une erreur est survenue lors de la capture');
      setRecordingState('idle');
    }
  }, [advancedOptions, recordingDimensions]);

  const handleRecordPress = useCallback(async () => {
    try {
      if (recordingState === 'idle') {
        const t = timerSeconds;
        if (t > 0) {
          if (isCountdownActive) return; // éviter double déclenchement
          setIsCountdownActive(true);
          setCountdown(t);
          
          const countdownInterval = setInterval(async () => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearTimer(countdownInterval);
                setIsCountdownActive(false);
                // Démarrer l'enregistrement après le compte à rebours
                if (isMounted()) {
                  startRecordingFlow();
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          return;
        }
        await startRecordingFlow();
      } else if (recordingState === 'recording') {
        setRecordingState('processing');
        console.log('[RealCameraViewScreen] Arrêt enregistrement...');
        const result = await cameraRef.current?.stopRecording();
        if (result) {
          setRecordingDuration(Math.floor(result.duration || 0));
          console.log('[RealCameraViewScreen] Enregistrement arrêté:', result?.uri);
        }
        setRecordingState('idle');
      } else if (recordingState === 'paused') {
        const ok = await NativeCameraEngine.resumeRecording();
        if (ok) {
          setRecordingState('recording');
        } else {
          console.warn('[RealCameraViewScreen] resumeRecording a échoué');
        }
      }
    } catch (err) {
      console.error('[RealCameraViewScreen] Erreur enregistrement:', err);
      Alert.alert('Enregistrement', 'Une erreur est survenue lors de la capture');
      setRecordingState('idle');
    }
  }, [recordingState, timerSeconds, isCountdownActive, startRecordingFlow]);

  const handlePausePress = useCallback(async () => {
    try {
      if (recordingState === 'recording') {
        const ok = await NativeCameraEngine.pauseRecording();
        if (ok) {
          setRecordingState('paused');
        } else {
          console.warn('[RealCameraViewScreen] pauseRecording non supporté ou a échoué');
        }
      }
    } catch (err) {
      console.error('[RealCameraViewScreen] Erreur pause:', err);
    }
  }, [recordingState]);

  // Pause non supportée nativement pour l'instant
  // const handlePausePress = useCallback(() => {}, []);

  // Suivi de la progression enregistrement (durée)
  useEffect(() => {
    if (recordingState === 'recording') {
      // Mettre à jour toutes les 500ms
      const progressInterval = setInterval(async () => {
        try {
          if (isMounted()) {
            const { duration } = await NativeCameraEngine.getRecordingProgress();
            setRecordingDuration(Math.floor(duration || 0));
          }
        } catch (error) {
          console.error('[RealCameraViewScreen] Error getting recording progress:', error);
        }
      }, 500);
      
      return () => clearTimer(progressInterval);
    } else {
      // Reset duration quand pas en enregistrement
      setRecordingDuration(0);
    }
  }, [recordingState, isMounted, setInterval, clearTimer]);

  // Synchroniser le timer local avec la valeur native au montage
  useEffect(() => {
    (async () => {
      try {
        const t = await NativeCameraEngine.getTimer();
        if (typeof t === 'number' && !Number.isNaN(t)) {
          setTimerSeconds(Math.max(0, Math.min(60, Math.floor(t))));
        }
      } catch {}
    })();
  }, []);



  // Configuration du thème
  const theme: ThemeConfig = {
    isDark: true,
    accentColor: '#FF3B30',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    surfaceColor: 'rgba(255, 255, 255, 0.1)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
    activeColor: '#FF3B30',
    disabledColor: 'rgba(255, 255, 255, 0.3)',
  };



  

  return (
    <SafeAreaView style={styles.container}>
      {/* Vue de la caméra */}
      <View style={styles.cameraContainer}>
        <NativeCamera
          ref={cameraRef}
          style={styles.camera}
          onCameraReady={handleCameraReady}
          onError={handleCameraError}
          enablePreview={true}
          autoStart={true}
          showDebug={false}
        >
          {/* Overlay de chargement */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Initialisation de la caméra...</Text>
            </View>
          )}

          {/* Menu trois points flottant (en position footer) */}
          <ThreeDotsMenu
            flashMode={flashMode}
            onFlashModeChange={async (mode) => {
              console.log('[RealCameraViewScreen] Changement mode flash:', mode);
              setFlashMode(mode);
              
              try {
                // Propager vers le moteur natif
                if (mode === 'on' || mode === 'off' || mode === 'auto') {
                  const success = await cameraRef.current?.setFlashMode(mode);
                  console.log('[RealCameraViewScreen] setFlashMode result:', success);
                }
                
                // Retour visuel immédiat en vidéo: piloter la torche quand on/off
                if (mode === 'on') {
                  const torchSuccess = await cameraRef.current?.setTorchMode(true);
                  console.log('[RealCameraViewScreen] setTorchMode(true) result:', torchSuccess);
                } else if (mode === 'off') {
                  const torchSuccess = await cameraRef.current?.setTorchMode(false);
                  console.log('[RealCameraViewScreen] setTorchMode(false) result:', torchSuccess);
                }
              } catch (error) {
                console.error('[RealCameraViewScreen] Erreur configuration flash:', error);
                // Afficher une alerte à l'utilisateur
                Alert.alert(
                  'Erreur Flash',
                  `Impossible de configurer le flash: ${error}`,
                  [{ text: 'OK' }]
                );
              }
            }}
            onTimerChange={async (seconds) => {
              try {
                setTimerSeconds(seconds);
                await NativeCameraEngine.setTimer(seconds);
              } catch (e) {
                console.error('[RealCameraViewScreen] Erreur configuration timer:', e);
              }
            }}
            timerSeconds={timerSeconds}
            onGridToggle={() => setGridEnabled(!gridEnabled)}
            gridMode={gridMode}
            onGridModeChange={(m) => setGridMode(m)}
            gridAspect={gridAspect}
            onGridAspectChange={(a) => setGridAspect(a)}
            onSettingsOpen={() => console.log('Paramètres')}
            onAction={handleMenuAction}
            theme="dark"
            position="bottom-right"
            advancedOptions={advancedOptions}
            onAdvancedOptionsChange={setAdvancedOptions}
            currentFilter={currentFilter}
            onFilterChange={(name, intensity, params) => setFilter(name, intensity, params)}
            onClearFilter={clearFilter}
          />

          {/* Grille avancée */}
          <GridOverlay visible={gridEnabled} mode={gridMode} aspectMask={gridAspect} showCenter centerStyle="crosshair" />

          {/* RecordingBar */}
          {!isLoading && (
            <View style={styles.recordingBarContainer}>
              <RecordingBar
                recordingState={recordingState}
                durationSec={recordingDuration}
                theme={theme}
                onRecordPress={handleRecordPress}
                onPausePress={handlePausePress}
                fps={advancedOptions.fps}
              />
            </View>
          )}

          {/* Overlay compte à rebours */}
          {isCountdownActive && (
            <View style={styles.countdownOverlay} pointerEvents="none">
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
        </NativeCamera>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  recordingBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 96,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
});