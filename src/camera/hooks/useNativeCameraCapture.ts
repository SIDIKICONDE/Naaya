/**
 * Hook natif pour la capture photo/vidéo
 * Performance pure - utilise directement le moteur C++ Naaya
 */

import { useState, useCallback } from 'react';
import { NativeCameraEngine } from '../index';
import type { 
  PhotoCaptureOptions, 
  VideoCaptureOptions, 
  PhotoResult, 
  VideoResult 
} from '../../../specs/NativeCameraModule';

export interface UseNativeCameraCaptureReturn {
  // État
  isCapturing: boolean;
  isRecording: boolean;
  flashMode: 'on' | 'off' | 'auto';
  torchEnabled: boolean;
  zoomLevel: number;

  // Actions photo
  capturePhoto: (options?: PhotoCaptureOptions) => Promise<PhotoResult>;

  // Actions vidéo
  startRecording: (options?: VideoCaptureOptions) => Promise<void>;
  stopRecording: () => Promise<VideoResult>;

  // Contrôles
  setFlashMode: (mode: 'on' | 'off' | 'auto') => Promise<void>;
  toggleFlash: () => Promise<void>;
  setTorchMode: (enabled: boolean) => Promise<void>;
  toggleTorch: () => Promise<void>;
  setZoomLevel: (level: number) => Promise<void>;

  // Utilitaires
  hasFlash: () => Promise<boolean>;
  getMinZoom: () => Promise<number>;
  getMaxZoom: () => Promise<number>;
}

/**
 * Hook pour la capture avec le moteur natif
 */
export function useNativeCameraCapture(): UseNativeCameraCaptureReturn {
  // État local
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [flashMode, setFlashModeState] = useState<'on' | 'off' | 'auto'>('auto');
  const [torchEnabled, setTorchEnabledState] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState(1.0);

  /**
   * Capture une photo
   */
  const capturePhoto = useCallback(async (options?: PhotoCaptureOptions): Promise<PhotoResult> => {
    try {
      console.log('[useNativeCameraCapture] Capture photo:', options);
      setIsCapturing(true);

      const result = await NativeCameraEngine.capturePhoto(options);
      console.log('[useNativeCameraCapture] Photo capturée:', result.uri);
      
      return result;
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur capture photo:', err);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  /**
   * Démarre l'enregistrement vidéo
   */
  const startRecording = useCallback(async (options?: VideoCaptureOptions): Promise<void> => {
    try {
      console.log('[useNativeCameraCapture] Démarrage enregistrement:', options);
      
      const success = await NativeCameraEngine.startRecording(options);
      if (success) {
        setIsRecording(true);
        console.log('[useNativeCameraCapture] Enregistrement démarré');
      } else {
        throw new Error('Échec du démarrage de l\'enregistrement');
      }
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur démarrage enregistrement:', err);
      throw err;
    }
  }, []);

  /**
   * Arrête l'enregistrement vidéo
   */
  const stopRecording = useCallback(async (): Promise<VideoResult> => {
    try {
      console.log('[useNativeCameraCapture] Arrêt enregistrement...');
      
      const result = await NativeCameraEngine.stopRecording();
      setIsRecording(false);
      console.log('[useNativeCameraCapture] Enregistrement arrêté:', result.uri);
      
      return result;
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur arrêt enregistrement:', err);
      setIsRecording(false);
      throw err;
    }
  }, []);

  /**
   * Configure le mode flash
   */
  const setFlashMode = useCallback(async (mode: 'on' | 'off' | 'auto'): Promise<void> => {
    try {
      console.log('[useNativeCameraCapture] Configuration flash:', mode);
      
      const success = await NativeCameraEngine.setFlashMode(mode);
      if (success) {
        setFlashModeState(mode);
        console.log('[useNativeCameraCapture] Flash configuré:', mode);
      }
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur configuration flash:', err);
      throw err;
    }
  }, []);

  /**
   * Alterne le mode flash (auto -> on -> off -> auto)
   */
  const toggleFlash = useCallback(async (): Promise<void> => {
    const nextMode = flashMode === 'auto' ? 'on' : 
                    flashMode === 'on' ? 'off' : 'auto';
    await setFlashMode(nextMode);
  }, [flashMode, setFlashMode]);

  /**
   * Active/désactive la torche
   */
  const setTorchMode = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      console.log('[useNativeCameraCapture] Configuration torche:', enabled);
      
      const success = await NativeCameraEngine.setTorchMode(enabled);
      if (success) {
        setTorchEnabledState(enabled);
        console.log('[useNativeCameraCapture] Torche configurée:', enabled);
      }
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur configuration torche:', err);
      throw err;
    }
  }, []);

  /**
   * Alterne la torche
   */
  const toggleTorch = useCallback(async (): Promise<void> => {
    await setTorchMode(!torchEnabled);
  }, [torchEnabled, setTorchMode]);

  /**
   * Configure le niveau de zoom
   */
  const setZoomLevel = useCallback(async (level: number): Promise<void> => {
    try {
      console.log('[useNativeCameraCapture] Configuration zoom:', level);
      
      const success = await NativeCameraEngine.setZoom(level);
      if (success) {
        setZoomLevelState(level);
        console.log('[useNativeCameraCapture] Zoom configuré:', level);
      }
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur configuration zoom:', err);
      throw err;
    }
  }, []);

  /**
   * Vérifie si le dispositif actuel a un flash
   */
  const hasFlash = useCallback(async (): Promise<boolean> => {
    try {
      return await NativeCameraEngine.hasFlash();
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur vérification flash:', err);
      return false;
    }
  }, []);

  /**
   * Récupère le zoom minimum
   */
  const getMinZoom = useCallback(async (): Promise<number> => {
    try {
      return await NativeCameraEngine.getMinZoom();
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur récupération zoom min:', err);
      return 1.0;
    }
  }, []);

  /**
   * Récupère le zoom maximum
   */
  const getMaxZoom = useCallback(async (): Promise<number> => {
    try {
      return await NativeCameraEngine.getMaxZoom();
    } catch (err) {
      console.error('[useNativeCameraCapture] Erreur récupération zoom max:', err);
      return 10.0;
    }
  }, []);

  return {
    // État
    isCapturing,
    isRecording,
    flashMode,
    torchEnabled,
    zoomLevel,

    // Actions photo
    capturePhoto,

    // Actions vidéo
    startRecording,
    stopRecording,

    // Contrôles
    setFlashMode,
    toggleFlash,
    setTorchMode,
    toggleTorch,
    setZoomLevel,

    // Utilitaires
    hasFlash,
    getMinZoom,
    getMaxZoom,
  };
}
