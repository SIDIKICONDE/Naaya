import { useState, useEffect, useCallback } from 'react';
import NativeCameraModule from '../../../specs/NativeCameraModule';
import type { 
  CameraDevice, 
  PermissionResult, 
  PhotoCaptureOptions, 
  VideoCaptureOptions
} from '../../../specs/NativeCameraModule';

export interface CameraState {
  isActive: boolean;
  isRecording: boolean;
  currentDevice: CameraDevice | null;
  availableDevices: CameraDevice[];
  permissions: PermissionResult | null;
  hasFlash: boolean;
  minZoom: number;
  maxZoom: number;
  currentZoom: number;
}

export const useCameraModule = () => {
  const [state, setState] = useState<CameraState>({
    isActive: false,
    isRecording: false,
    currentDevice: null,
    availableDevices: [],
    permissions: null,
    hasFlash: false,
    minZoom: 1.0,
    maxZoom: 10.0,
    currentZoom: 1.0,
  });

  const [error, setError] = useState<string | null>(null);

  // Vérifier les permissions
  const checkPermissions = useCallback(async () => {
    try {
      const permissions = await NativeCameraModule.checkPermissions();
      setState(prev => ({ ...prev, permissions }));
      return permissions;
    } catch (err) {
      setError(`Erreur vérification permissions: ${err}`);
      return null;
    }
  }, []);

  // Demander les permissions
  const requestPermissions = useCallback(async () => {
    try {
      const permissions = await NativeCameraModule.requestPermissions();
      setState(prev => ({ ...prev, permissions }));
      return permissions;
    } catch (err) {
      setError(`Erreur demande permissions: ${err}`);
      return null;
    }
  }, []);

  // Obtenir les appareils disponibles
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await NativeCameraModule.getAvailableDevices();
      setState(prev => ({ ...prev, availableDevices: devices }));
      return devices;
    } catch (err) {
      setError(`Erreur récupération appareils: ${err}`);
      return [];
    }
  }, []);

  // Démarrer la caméra
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      const targetDeviceId = deviceId || state.availableDevices[0]?.id;
      if (!targetDeviceId) {
        throw new Error('Aucun appareil caméra disponible');
      }

      const success = await NativeCameraModule.startCamera(targetDeviceId);
      if (success) {
        const currentDevice = await NativeCameraModule.getCurrentDevice();
        const hasFlash = await NativeCameraModule.hasFlash();
        const minZoom = await NativeCameraModule.getMinZoom();
        const maxZoom = await NativeCameraModule.getMaxZoom();

        setState(prev => ({
          ...prev,
          isActive: true,
          currentDevice,
          hasFlash,
          minZoom,
          maxZoom,
          currentZoom: minZoom,
        }));
      }
      return success;
    } catch (err) {
      setError(`Erreur démarrage caméra: ${err}`);
      return false;
    }
  }, [state.availableDevices]);

  // Arrêter la caméra
  const stopCamera = useCallback(async () => {
    try {
      const success = await NativeCameraModule.stopCamera();
      if (success) {
        setState(prev => ({
          ...prev,
          isActive: false,
          isRecording: false,
          currentDevice: null,
        }));
      }
      return success;
    } catch (err) {
      setError(`Erreur arrêt caméra: ${err}`);
      return false;
    }
  }, []);

  // Changer d'appareil
  const switchDevice = useCallback(async (position: 'front' | 'back') => {
    try {
      const success = await NativeCameraModule.switchDevice(position);
      if (success) {
        const currentDevice = await NativeCameraModule.getCurrentDevice();
        setState(prev => ({ ...prev, currentDevice }));
      }
      return success;
    } catch (err) {
      setError(`Erreur changement appareil: ${err}`);
      return false;
    }
  }, []);

  // Capturer une photo
  const capturePhoto = useCallback(async (options: PhotoCaptureOptions = {}) => {
    try {
      const result = await NativeCameraModule.capturePhoto(options);
      return result;
    } catch (err) {
      setError(`Erreur capture photo: ${err}`);
      return null;
    }
  }, []);

  // Démarrer l'enregistrement vidéo
  const startRecording = useCallback(async (options: VideoCaptureOptions = {}) => {
    try {
      const success = await NativeCameraModule.startRecording(options);
      if (success) {
        setState(prev => ({ ...prev, isRecording: true }));
      }
      return success;
    } catch (err) {
      setError(`Erreur démarrage enregistrement: ${err}`);
      return false;
    }
  }, []);

  // Arrêter l'enregistrement vidéo
  const stopRecording = useCallback(async () => {
    try {
      const result = await NativeCameraModule.stopRecording();
      setState(prev => ({ ...prev, isRecording: false }));
      return result;
    } catch (err) {
      setError(`Erreur arrêt enregistrement: ${err}`);
      return null;
    }
  }, []);

  // Contrôler le flash
  const setFlashMode = useCallback(async (mode: 'auto' | 'on' | 'off') => {
    try {
      const success = await NativeCameraModule.setFlashMode(mode);
      return success;
    } catch (err) {
      setError(`Erreur mode flash: ${err}`);
      return false;
    }
  }, []);

  // Contrôler la torche
  const setTorchMode = useCallback(async (enabled: boolean) => {
    try {
      const success = await NativeCameraModule.setTorchMode(enabled);
      return success;
    } catch (err) {
      setError(`Erreur mode torche: ${err}`);
      return false;
    }
  }, []);

  // Contrôler le zoom
  const setZoom = useCallback(async (level: number) => {
    try {
      const clampedLevel = Math.max(state.minZoom, Math.min(state.maxZoom, level));
      const success = await NativeCameraModule.setZoom(clampedLevel);
      if (success) {
        setState(prev => ({ ...prev, currentZoom: clampedLevel }));
      }
      return success;
    } catch (err) {
      setError(`Erreur niveau zoom: ${err}`);
      return false;
    }
  }, [state.minZoom, state.maxZoom]);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      await checkPermissions();
      await getAvailableDevices();
    };
    initialize();
  }, [checkPermissions, getAvailableDevices]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (state.isActive) {
        stopCamera();
      }
    };
  }, [state.isActive, stopCamera]);

  return {
    // État
    ...state,
    error,
    
    // Actions
    checkPermissions,
    requestPermissions,
    getAvailableDevices,
    startCamera,
    stopCamera,
    switchDevice,
    capturePhoto,
    startRecording,
    stopRecording,
    setFlashMode,
    setTorchMode,
    setZoom,
    
    // Utilitaires
    clearError: () => setError(null),
  };
};
