/**
 * Composant Camera Natif Pur
 * Performance pure - utilise directement le moteur C++ Naaya
 * Remplace complètement react-native-vision-camera
 */

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Alert, Linking, StyleSheet, Text, View, requireNativeComponent } from 'react-native';
import type { CameraDevice } from '../../../specs/NativeCameraModule';
import { useNativeCamera } from '../hooks/useNativeCamera';
import { useNativeCameraCapture } from '../hooks/useNativeCameraCapture';

// Types pour les props du composant
export interface NativeCameraProps {
  style?: any;
  onCameraReady?: () => void;
  onError?: (error: Error) => void;
  onDeviceChanged?: (device: CameraDevice | null) => void;
  enablePreview?: boolean;
  autoStart?: boolean;
  showDebug?: boolean;
  children?: React.ReactNode;
}

// Interface pour la ref exposée
export interface NativeCameraRef {
  // Actions caméra
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => Promise<void>;
  switchDevice: (position: 'front' | 'back') => Promise<void>;
  refresh: () => Promise<void>;

  // Actions capture
  capturePhoto: ReturnType<typeof useNativeCameraCapture>['capturePhoto'];
  startRecording: ReturnType<typeof useNativeCameraCapture>['startRecording'];
  stopRecording: ReturnType<typeof useNativeCameraCapture>['stopRecording'];

  // Contrôles
  setFlashMode: ReturnType<typeof useNativeCameraCapture>['setFlashMode'];
  toggleFlash: ReturnType<typeof useNativeCameraCapture>['toggleFlash'];
  setTorchMode: ReturnType<typeof useNativeCameraCapture>['setTorchMode'];
  toggleTorch: ReturnType<typeof useNativeCameraCapture>['toggleTorch'];
  setZoomLevel: ReturnType<typeof useNativeCameraCapture>['setZoomLevel'];

  // État
  isReady: boolean;
  isActive: boolean;
  isCapturing: boolean;
  isRecording: boolean;
  currentDevice: CameraDevice | null;
  devices: CameraDevice[];
}

/**
 * Composant NativeCamera - Performance Pure
 */
export const NativeCamera = forwardRef<NativeCameraRef, NativeCameraProps>(({
  style,
  onCameraReady,
  onError,
  onDeviceChanged,
  enablePreview = true,
  autoStart = true,
  showDebug = __DEV__,
  children,
}, ref) => {
  // Hooks natifs
  const camera = useNativeCamera();
  const capture = useNativeCameraCapture();

  // Refs pour éviter les re-renders
  const onErrorRef = useRef(onError);
  const onCameraReadyRef = useRef(onCameraReady);
  const onDeviceChangedRef = useRef(onDeviceChanged);

  // Mettre à jour les refs
  useEffect(() => {
    onErrorRef.current = onError;
    onCameraReadyRef.current = onCameraReady;
    onDeviceChangedRef.current = onDeviceChanged;
  });

  // Exposer l'interface via ref
  useImperativeHandle(ref, () => ({
    // Actions caméra
    startCamera: camera.startCamera,
    stopCamera: camera.stopCamera,
    switchDevice: camera.switchDevice,
    refresh: camera.refresh,

    // Actions capture
    capturePhoto: capture.capturePhoto,
    startRecording: capture.startRecording,
    stopRecording: capture.stopRecording,

    // Contrôles
    setFlashMode: capture.setFlashMode,
    toggleFlash: capture.toggleFlash,
    setTorchMode: capture.setTorchMode,
    toggleTorch: capture.toggleTorch,
    setZoomLevel: capture.setZoomLevel,

    // État
    isReady: camera.isReady,
    isActive: camera.isActive,
    isCapturing: capture.isCapturing,
    isRecording: capture.isRecording,
    currentDevice: camera.currentDevice,
    devices: camera.devices,
  }), [camera, capture]);

  // Gestion des erreurs
  useEffect(() => {
    if (camera.error) {
      console.error('[NativeCamera] Erreur caméra:', camera.error);
      onErrorRef.current?.(camera.error);
    }
  }, [camera.error]);

  // Notification de changement de dispositif
  useEffect(() => {
    onDeviceChangedRef.current?.(camera.currentDevice);
  }, [camera.currentDevice]);

  // Notification quand la caméra est prête
  useEffect(() => {
    if (camera.isReady && camera.permissions?.camera === 'granted') {
      console.log('[NativeCamera] Caméra prête !');
      onCameraReadyRef.current?.();

      // Démarrage automatique si activé
      if (autoStart && !camera.isActive && camera.currentDevice) {
        console.log('[NativeCamera] Démarrage automatique...');
        camera.startCamera().catch(console.error);
      }
    }
  }, [camera, autoStart]);

  // Gestion des permissions manquantes
  useEffect(() => {
    if (camera.permissions?.camera === 'denied') {
      Alert.alert(
        'Permission requise',
        'L\'accès à la caméra est nécessaire pour utiliser cette fonctionnalité.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Réessayer',
            onPress: () => camera.requestPermissions().catch(console.error)
          },
        ]
      );
    }
  }, [camera]);

  // Rendu en cas d'erreur
  if (camera.error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>
          Erreur caméra: {camera.error.message}
        </Text>
        <Text style={styles.retryText} onPress={camera.refresh}>
          Toucher pour réessayer
        </Text>
      </View>
    );
  }

  // Rendu en cours de chargement (attendre au moins les permissions)
  if (!camera.permissions) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>Initialisation de la caméra...</Text>
        {camera.devices.length > 0 && (
          <Text style={styles.devicesText}>
            {camera.devices.length} dispositif(s) détecté(s)
          </Text>
        )}
      </View>
    );
  }

  // Rendu permissions refusées
  if (camera.permissions.camera !== 'granted') {
    return (
      <View style={[styles.container, styles.permissionContainer, style]}>
        <Text style={styles.permissionText}>
          Permission caméra requise
        </Text>
        <Text style={styles.retryText} onPress={camera.requestPermissions}>
          Toucher pour autoriser
        </Text>
        {camera.permissions.camera === 'denied' && (
          <Text
            style={[styles.retryText, styles.openSettings]}
            onPress={() => Linking.openSettings().catch(() => {})}
          >
            Ouvrir Réglages
          </Text>
        )}
      </View>
    );
  }

  // Rendu principal
  return (
    <View style={[styles.container, style]}>
      {enablePreview ? (
        <NativeCameraPreview 
          isActive={camera.isActive}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.noPreviewContainer]}>
          <Text style={styles.noPreviewText}>Prévisualisation désactivée</Text>
          <Text style={styles.deviceText}>
            {camera.currentDevice?.name || 'Aucun dispositif'}
          </Text>
        </View>
      )}

      {/* Informations de debug (optionnel) */}
      {showDebug && (
        <View style={styles.debugInfo} pointerEvents="none">
          <Text style={styles.debugText}>
            {camera.currentDevice?.name} | {camera.devices.length} devices
          </Text>
          <Text style={styles.debugText}>
            Active: {camera.isActive ? 'OUI' : 'NON'} | 
            Zoom: {capture.zoomLevel.toFixed(1)}x
          </Text>
        </View>
      )}

      {/* Overlay pour les contrôles et autres éléments */}
      <View style={styles.overlay} pointerEvents="box-none">
        {children}
      </View>

      {/* Indicateurs d'état */}
      {capture.isCapturing && (
        <View style={styles.captureIndicator}>
          <View style={styles.captureCircle} />
        </View>
      )}

      {capture.isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
        </View>
      )}
    </View>
  );
});

/**
 * Composant de prévisualisation natif
 * Pour l'instant, un placeholder - à implémenter avec votre moteur C++
 */
interface NativeCameraPreviewProps {
  isActive: boolean;
  style?: any;
}

type NaayaPreviewNativeProps = {
  style?: StyleProp<ViewStyle>;
};

const RCTNaayaPreview = requireNativeComponent<NaayaPreviewNativeProps>('NaayaPreview');

const NativeCameraPreview: React.FC<NativeCameraPreviewProps> = ({ isActive, style }) => {
  return (
    <View style={[style, styles.previewContainer]}>
      {isActive ? (
        <RCTNaayaPreview style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={styles.inactivePreview}>
          <Text style={styles.inactiveText}>Caméra inactive</Text>
        </View>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999,
  },

  // États d'erreur/chargement
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noPreviewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },

  // Textes d'état
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  devicesText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
  },
  openSettings: {
    marginTop: 8,
  },
  noPreviewText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  deviceText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  // Prévisualisation
  previewContainer: {
    backgroundColor: 'black',
  },
  activePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#003300', // Vert foncé pour indiquer l'activité
  },
  inactivePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#330000', // Rouge foncé pour inactif
  },
  previewText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  previewDeviceText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  inactiveText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },

  // Indicateurs
  captureIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  captureCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4444',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Debug
  debugInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: 'yellow',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

// Nom d'affichage pour le debug
NativeCamera.displayName = 'NativeCamera';

export default NativeCamera;
