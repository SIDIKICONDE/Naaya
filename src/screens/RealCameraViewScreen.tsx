/**
 * Écran d'enregistrement vidéo avec caméra native
 * Interface moderne et performante pour Naaya
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Animated,
  SafeAreaView,
} from 'react-native';
import { NativeCamera } from '../camera/components/NativeCamera';
import type { NativeCameraRef } from '../camera/components/NativeCamera';
import type { VideoResult } from '../../specs/NativeCameraModule';
import CameraEngine from '../camera';

// Types pour l'état d'enregistrement
type RecordingState = 'idle' | 'recording' | 'processing';

export const RealCameraViewScreen: React.FC = () => {
  // Refs
  const cameraRef = useRef<NativeCameraRef>(null);
  const recordingAnimation = useRef(new Animated.Value(0)).current;
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // État
  const [isLoading, setIsLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off' | 'auto'>('off');
  const [lastVideo, setLastVideo] = useState<VideoResult | null>(null);
  const [showControls, _setShowControls] = useState(true);
  const [engineActive, setEngineActive] = useState(false);
  const [recordingSize, setRecordingSize] = useState(0);

  // Animation du bouton d'enregistrement
  useEffect(() => {
    if (recordingState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      recordingAnimation.setValue(0);
    }
  }, [recordingState, recordingAnimation]);

  // Timer d'enregistrement
  useEffect(() => {
    if (recordingState === 'recording') {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [recordingState]);

  // Callbacks
  const handleCameraReady = useCallback(() => {
    console.log('[RealCameraViewScreen] Caméra prête');
    setIsLoading(false);
    // Rafraîchir l'état actif moteur
    CameraEngine.isActive()
      .then(setEngineActive)
      .catch(() => setEngineActive(false));
  }, []);

  const handleCameraError = useCallback((error: Error) => {
    console.error('[RealCameraViewScreen] Erreur caméra:', error);
    Alert.alert(
      'Erreur Caméra',
      `Une erreur est survenue: ${error.message}`,
      [{ text: 'OK' }]
    );
  }, []);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    if (recordingState !== 'idle') return;

    try {
      console.log('[RealCameraViewScreen] Démarrage enregistrement...');
      setRecordingState('recording');
      
      const ok = await CameraEngine.startRecording({
        quality: 'high',
        maxDuration: 60, // Limite à 60 secondes
        recordAudio: true,
      });

      if (!ok) {
        throw new Error('Échec du démarrage de l\'enregistrement');
      }

      console.log('[RealCameraViewScreen] Enregistrement démarré');
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur démarrage enregistrement:', error);
      setRecordingState('idle');
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  }, [recordingState]);

  // Suivi de la progression d'enregistrement (taille)
  useEffect(() => {
    if (recordingState === 'recording') {
      setRecordingSize(0);
      progressTimer.current = setInterval(async () => {
        try {
          const prog = await CameraEngine.getRecordingProgress();
          setRecordingSize(prog.size || 0);
        } catch (e) {
          // ignorer erreurs transitoires
        }
      }, 1000);
    } else {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setRecordingSize(0);
    }
    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    };
  }, [recordingState]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(async () => {
    if (recordingState !== 'recording') return;

    try {
      console.log('[RealCameraViewScreen] Arrêt enregistrement...');
      setRecordingState('processing');
      
      const result = await CameraEngine.stopRecording();
      console.log('[RealCameraViewScreen] Vidéo enregistrée:', result);
      
      setLastVideo(result);
      setRecordingState('idle');

      // Afficher un message de succès
      Alert.alert(
        'Vidéo enregistrée',
        `Durée: ${result.duration}s\nTaille: ${(result.size / 1024 / 1024).toFixed(2)} MB`,
        [
          { text: 'OK' },
          { 
            text: 'Voir', 
            onPress: () => console.log('Voir vidéo:', result.uri) 
          }
        ]
      );
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur arrêt enregistrement:', error);
      setRecordingState('idle');
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  }, [recordingState]);

  // Basculer la caméra
  const toggleCamera = useCallback(async () => {
    if (recordingState === 'recording') return;

    try {
      const newPosition = cameraPosition === 'back' ? 'front' : 'back';
      const ok = await CameraEngine.switchDevice(newPosition);
      if (!ok) throw new Error('Échec du changement de caméra');
      setCameraPosition(newPosition);
      // Mettre à jour l'état actif
      const active = await CameraEngine.isActive();
      setEngineActive(active);
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur changement caméra:', error);
      Alert.alert('Erreur', 'Impossible de changer de caméra');
    }
  }, [cameraPosition, recordingState]);

  // Basculer le flash
  const toggleFlash = useCallback(async () => {

    try {
      const modes: Array<'on' | 'off' | 'auto'> = ['off', 'on', 'auto'];
      const currentIndex = modes.indexOf(flashMode);
      const newMode = modes[(currentIndex + 1) % modes.length];
      
      const ok = await CameraEngine.setFlashMode(newMode);
      if (!ok) throw new Error('Échec de la configuration du flash');
      setFlashMode(newMode);
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur changement flash:', error);
    }
  }, [flashMode]);

  // Prendre une photo
  const takePhoto = useCallback(async () => {
    if (recordingState === 'recording') return;

    try {
      const result = await CameraEngine.capturePhoto({ quality: 0.9 });
      
      console.log('[RealCameraViewScreen] Photo capturée:', result);
      Alert.alert('Photo capturée', `Résolution: ${result.width}x${result.height}`);
    } catch (error) {
      console.error('[RealCameraViewScreen] Erreur capture photo:', error);
      Alert.alert('Erreur', 'Impossible de capturer la photo');
    }
  }, [recordingState]);

  // Smoke Test Caméra
  const runSmokeTest = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[SmokeTest] Démarrage');
      const perms = await CameraEngine.checkPermissions();
      if (perms.camera !== 'granted' || perms.microphone !== 'granted') {
        await CameraEngine.requestPermissions();
      }
      const devices = await CameraEngine.getAvailableDevices();
      if (!devices || devices.length === 0) {
        throw new Error('Aucune caméra disponible');
      }
      const back = devices.find(d => d.position === 'back') || devices[0];
      await CameraEngine.startCamera(back.id);
      const photo = await CameraEngine.capturePhoto({ quality: 0.8, deviceId: back.id });
      const ok = await CameraEngine.startRecording({ quality: 'high', recordAudio: true, maxDuration: 10, deviceId: back.id });
      if (!ok) throw new Error('Échec startRecording');
      await new Promise(resolve => setTimeout(resolve, 3000));
      const prog = await CameraEngine.getRecordingProgress();
      const video = await CameraEngine.stopRecording();
      Alert.alert(
        'Smoke test Caméra réussi',
        `Photo: ${photo.width}x${photo.height}\nVidéo: ${video.duration.toFixed(1)}s, ${(video.size/1024/1024).toFixed(2)} MB\nProgress ~ ${prog.duration.toFixed(1)}s`
      );
      console.log('[SmokeTest] OK', { photo, video, prog });
    } catch (err: any) {
      console.error('[SmokeTest] Erreur', err);
      Alert.alert('Smoke test Caméra échoué', err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Formater la durée d'enregistrement
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtenir l'icône du flash
  const getFlashIcon = (): string => {
    switch (flashMode) {
      case 'on': return '⚡';
      case 'off': return '⚡̸';
      case 'auto': return '⚡A';
      default: return '⚡';
    }
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
        >
          {/* Overlay de chargement */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Initialisation de la caméra...</Text>
            </View>
          )}

          {/* Timer d'enregistrement */}
          {recordingState === 'recording' && (
            <View style={styles.recordingIndicator}>
              <Animated.View
                style={[
                  styles.recordingDot,
                  {
                    opacity: recordingAnimation,
                  },
                ]}
              />
              <Text style={styles.recordingTime}>
                {formatDuration(recordingDuration)}
              </Text>
            </View>
          )}

          {/* Contrôles supérieurs */}
          {showControls && !isLoading && (
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleFlash}
                disabled={recordingState === 'recording'}
              >
                <Text style={styles.controlIcon}>{getFlashIcon()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCamera}
                disabled={recordingState === 'recording'}
              >
                <Text style={styles.controlIcon}>🔄</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={runSmokeTest}
                disabled={recordingState === 'processing'}
              >
                <Text style={styles.controlIcon}>🧪</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Panneau de statut */}
          {!isLoading && (
            <View style={styles.statusPanel}>
              <Text style={styles.statusText}>Caméra: {engineActive ? 'Active' : 'Inactive'}</Text>
              <Text style={styles.statusText}>Dispositif: {cameraPosition === 'back' ? 'Arrière' : 'Avant'}</Text>
              <Text style={styles.statusText}>Flash: {flashMode.toUpperCase()}</Text>
              {recordingState === 'recording' && (
                <Text style={styles.statusText}>Fichier: {(recordingSize / 1024 / 1024).toFixed(2)} MB</Text>
              )}
            </View>
          )}
        </NativeCamera>
      </View>

      {/* Contrôles inférieurs */}
      {showControls && !isLoading && (
        <View style={styles.bottomControls}>
          {/* Bouton Photo */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              recordingState !== 'idle' && styles.disabledButton,
            ]}
            onPress={takePhoto}
            disabled={recordingState !== 'idle'}
          >
            <Text style={styles.buttonIcon}>📷</Text>
          </TouchableOpacity>

          {/* Bouton Enregistrement */}
          <TouchableOpacity
            style={styles.recordButtonContainer}
            onPress={recordingState === 'idle' ? startRecording : stopRecording}
            disabled={recordingState === 'processing'}
          >
            <View
              style={[
                styles.recordButton,
                recordingState === 'recording' && styles.recordButtonRecording,
                recordingState === 'processing' && styles.recordButtonProcessing,
              ]}
            >
              {recordingState === 'processing' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View
                  style={[
                    styles.recordButtonInner,
                    recordingState === 'recording' && styles.recordButtonInnerRecording,
                  ]}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Bouton Galerie */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !lastVideo && styles.disabledButton,
            ]}
            disabled={!lastVideo}
            onPress={() => lastVideo && console.log('Ouvrir galerie:', lastVideo.uri)}
          >
            <Text style={styles.buttonIcon}>🎬</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Module audio retiré: égaliseur et analyseur de spectre supprimés */}
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
  recordingIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    marginRight: 8,
  },
  recordingTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  buttonIcon: {
    fontSize: 28,
  },
  recordButtonContainer: {
    padding: 4,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  recordButtonRecording: {
    backgroundColor: '#FF0000',
  },
  recordButtonProcessing: {
    backgroundColor: '#666666',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
  },
  recordButtonInnerRecording: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusPanel: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
});