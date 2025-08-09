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
  View,
} from 'react-native';
import type { NativeCameraRef } from 'system@components/NativeCamera';
import { NativeCamera } from 'system@components/NativeCamera';
import { VideoControl } from 'system@components/VideoControl';
import type { VideoResult } from '../../specs/NativeCameraModule';
import { videoLibrary } from '../videoLibrary/services/VideoLibrary';

export const RealCameraViewScreen: React.FC = () => {
  // Refs
  const cameraRef = useRef<NativeCameraRef>(null);

  // État
  const [isLoading, setIsLoading] = useState(true);
  

  // Nettoyage à la fermeture de l'écran
  useEffect(() => {
    return () => {
      cameraRef.current?.stopCamera().catch(() => {});
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

  // Réception du résultat vidéo pour archivage
  const handleRecordingStop = useCallback(async (result?: VideoResult) => {
    if (!result) return;
    try {
      await videoLibrary.addVideo(result);
    } catch (e) {
      console.warn('[RealCameraViewScreen] Impossible d\'ajouter la vidéo à la bibliothèque:', e);
    }
    Alert.alert(
      'Vidéo enregistrée',
      `Durée: ${result.duration}s\nTaille: ${(result.size / 1024 / 1024).toFixed(2)} MB`,
      [{ text: 'OK' }]
    );
  }, []);

  

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

          {/* Contrôles centralisés */}
          {!isLoading && (
            <VideoControl 
              cameraRef={cameraRef}
              onRecordingStop={handleRecordingStop}
            />
          )}
        </NativeCamera>
      </View>
      {/* Contrôles avancés gérés dans <VideoControl /> */}
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
});