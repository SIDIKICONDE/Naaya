/**
 * Écran d'enregistrement vidéo avec caméra native
 * Interface moderne et performante pour Naaya
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import GridOverlay from 'system@components/GridOverlay';
import type { NativeCameraRef } from 'system@components/NativeCamera';
import { NativeCamera } from 'system@components/NativeCamera';
import { NativeCameraEngine } from '../camera';
import { RecordingBar } from '../camera/components/AdvancedCameraControls/components/RecordingBar';
import { ThreeDotsMenu } from '../camera/components/AdvancedCameraControls/components/ThreeDotsMenu';
import type { FlashMode, RecordingState, ThemeConfig } from '../camera/components/AdvancedCameraControls/types';
import type { AdvancedRecordingOptions } from '../camera/components/VideoControl/types';
import { useNativeCamera } from '../camera/hooks/useNativeCamera';


export const RealCameraViewScreen: React.FC = () => {
  // Refs
  const cameraRef = useRef<NativeCameraRef>(null);

  // État
  const [isLoading, setIsLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [gridEnabled, setGridEnabled] = useState(false);
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
    videoBitrate: 4000,
    audioBitrate: 128,
  });

  // Hooks filtres (utilise le module natif CameraFilters)
  const { currentFilter, setFilter, clearFilter, switchDevice, currentDevice } = useNativeCamera();
  

  // Gestion du basculement de caméra
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
    console.log('[RealCameraViewScreen] Caméra prête');
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
  const handleRecordPress = useCallback(async () => {
    try {
      if (recordingState === 'idle') {
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
          if (wantAudio && perms.microphone !== 'granted') {
            // Essayer de demander les permissions micro
            const req = await NativeCameraEngine.requestPermissions();
            if (!req || req.microphone !== 'granted') {
              console.warn('[RealCameraViewScreen] Micro non autorisé — enregistrement sans audio');
              wantAudio = false;
              Alert.alert('Micro non autorisé', 'L\'enregistrement démarre sans audio. Vous pourrez autoriser le micro dans Réglages.');
            }
          }
        } catch {}

        const options = {
          recordAudio: wantAudio,
          container: advancedOptions.container,
          codec: advancedOptions.codec,
          audioCodec: advancedOptions.audioCodec,
          width: advancedOptions.width,
          height: advancedOptions.height,
          fps: advancedOptions.fps,
          orientation: advancedOptions.orientation,
          stabilization: advancedOptions.stabilization,
          lockAE: advancedOptions.lockAE,
          lockAWB: advancedOptions.lockAWB,
          lockAF: advancedOptions.lockAF,
          fileNamePrefix: advancedOptions.fileNamePrefix,
          videoBitrate: advancedOptions.videoBitrate,
          audioBitrate: advancedOptions.audioBitrate,
          // Optionnel: qualité par défaut
          quality: 'high',
        } as const;
        setRecordingDuration(0);
        await cameraRef.current?.startRecording(options);
        setRecordingState('recording');
        console.log('[RealCameraViewScreen] Enregistrement démarré');
      } else if (recordingState === 'recording') {
        setRecordingState('processing');
        console.log('[RealCameraViewScreen] Arrêt enregistrement...');
        const result = await cameraRef.current?.stopRecording();
        if (result) {
          setRecordingDuration(Math.floor(result.duration || 0));
          console.log('[RealCameraViewScreen] Enregistrement arrêté:', result.uri);
        }
        setRecordingState('idle');
      }
    } catch (err) {
      console.error('[RealCameraViewScreen] Erreur enregistrement:', err);
      Alert.alert('Enregistrement', 'Une erreur est survenue lors de la capture');
      setRecordingState('idle');
    }
  }, [recordingState, advancedOptions]);

  // Pause non supportée nativement pour l'instant
  // const handlePausePress = useCallback(() => {}, []);

  // Suivi de la progression enregistrement (durée)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (recordingState === 'recording') {
      // Mettre à jour toutes les 500ms
      progressTimerRef.current = setInterval(async () => {
        try {
          const { duration } = await NativeCameraEngine.getRecordingProgress();
          setRecordingDuration(Math.floor(duration || 0));
        } catch {}
      }, 500);
      return () => {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      };
    }
    // Nettoyage si on sort de l'état recording
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, [recordingState]);

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
            onFlashModeChange={setFlashMode}
            onTimerChange={setTimerSeconds}
            timerSeconds={timerSeconds}
            onGridToggle={() => setGridEnabled(!gridEnabled)}
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

          {/* Grille (règle des tiers) */}
          <GridOverlay visible={gridEnabled} />

          {/* RecordingBar */}
          {!isLoading && (
            <View style={styles.recordingBarContainer}>
              <RecordingBar
                recordingState={recordingState}
                durationSec={recordingDuration}
                theme={theme}
                onRecordPress={handleRecordPress}
                fps={advancedOptions.fps}
              />
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
});