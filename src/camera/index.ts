/**
 * Module Caméra Natif Pur pour Naaya
 * Interface JavaScript du Turbo Module natif C++
 * Performance pure - pas de dépendance vision-camera
 */

import type {
  CameraDevice,
  PermissionResult,
  PhotoCaptureOptions,
  PhotoResult,
  VideoCaptureOptions,
  VideoResult,
} from '../../specs/NativeCameraModule';
import NativeCameraModule from '../../specs/NativeCameraModule';

export type {
  CameraDevice,
  PermissionResult, PhotoCaptureOptions, PhotoResult, VideoCaptureOptions, VideoResult
};

/**
 * Classe principale du moteur caméra natif
 * Remplace complètement react-native-vision-camera
 */

/**
 * Classe wrapper pour le Turbo Module Caméra
 * Fournit une interface TypeScript propre avec gestion d'erreurs
 */
class CameraModule {
  private static instance: CameraModule;
  // État interne pour les retours de secours
  private mockActive: boolean = false;
  
  private constructor() {}
  
  static getInstance(): CameraModule {
    if (!CameraModule.instance) {
      CameraModule.instance = new CameraModule();
    }
    return CameraModule.instance;
  }

  // === GESTION DES PERMISSIONS ===

  /**
   * Vérifie le statut des permissions
   */
  async checkPermissions(): Promise<PermissionResult> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.checkPermissions === 'function') {
        return await native.checkPermissions();
      }
      console.warn('[CameraModule] checkPermissions indisponible sur le module natif — utilisation d\'un fallback');
      // Fallback permissif pour ne pas bloquer l\'UI en dev
      return { camera: 'granted', microphone: 'granted', storage: 'granted' } as PermissionResult;
    } catch (error) {
      console.error('[CameraModule] Erreur vérification permissions:', error);
      throw error;
    }
  }

  /**
   * Demande les permissions nécessaires
   */
  async requestPermissions(): Promise<PermissionResult> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.requestPermissions === 'function') {
        return await native.requestPermissions();
      }
      console.warn('[CameraModule] requestPermissions indisponible — retour de secours granted');
      return { camera: 'granted', microphone: 'granted', storage: 'granted' } as PermissionResult;
    } catch (error) {
      console.error('[CameraModule] Erreur demande permissions:', error);
      throw error;
    }
  }

  // === GESTION DES DISPOSITIFS ===

  /**
   * Récupère la liste des caméras disponibles
   */
  async getAvailableDevices(): Promise<CameraDevice[]> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getAvailableDevices === 'function') {
        return await native.getAvailableDevices();
      }
      console.warn('[CameraModule] getAvailableDevices indisponible — fourniture de dispositifs fictifs');
      return [
        { id: 'sim-back', name: 'Simulateur - Caméra arrière', position: 'back', hasFlash: true },
        { id: 'sim-front', name: 'Simulateur - Caméra avant', position: 'front', hasFlash: false },
      ];
    } catch (error) {
      console.error('[CameraModule] Erreur énumération dispositifs:', error);
      throw error;
    }
  }

  /**
   * Récupère le dispositif actuellement sélectionné
   */
  async getCurrentDevice(): Promise<CameraDevice | null> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getCurrentDevice === 'function') {
        return await native.getCurrentDevice();
      }
      return null;
    } catch (error) {
      console.error('[CameraModule] Erreur récupération dispositif actuel:', error);
      return null;
    }
  }

  /**
   * Change de caméra (avant/arrière)
   */
  async switchDevice(position: 'front' | 'back'): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.switchDevice === 'function') {
        return await native.switchDevice(position);
      }
      console.warn('[CameraModule] switchDevice indisponible — succès simulé');
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur changement dispositif:', error);
      throw error;
    }
  }

  // === CONTRÔLES DE LA CAMÉRA ===

  /**
   * Démarre la caméra avec le dispositif spécifié
   */
  async startCamera(deviceId: string): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.startCamera === 'function') {
        const ok = await native.startCamera(deviceId);
        this.mockActive = ok;
        return ok;
      }
      console.warn('[CameraModule] startCamera indisponible — succès simulé');
      this.mockActive = true;
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur démarrage caméra:', error);
      throw error;
    }
  }

  /**
   * Arrête la caméra
   */
  async stopCamera(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.stopCamera === 'function') {
        const ok = await native.stopCamera();
        if (ok) this.mockActive = false;
        return ok;
      }
      console.warn('[CameraModule] stopCamera indisponible — succès simulé');
      this.mockActive = false;
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur arrêt caméra:', error);
      throw error;
    }
  }

  /**
   * Vérifie si la caméra est active
   */
  async isActive(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.isActive === 'function') {
        return await native.isActive();
      }
      return this.mockActive;
    } catch (error) {
      console.error('[CameraModule] Erreur vérification état caméra:', error);
      return false;
    }
  }

  // === CAPTURE PHOTO ===

  /**
   * Capture une photo avec les options spécifiées
   */
  async capturePhoto(options?: PhotoCaptureOptions): Promise<PhotoResult> {
    try {
      const native: any = NativeCameraModule as any;
      // S'assurer que la caméra est active avant la capture
      try {
        const active = (typeof native.isActive === 'function') ? await native.isActive() : this.mockActive;
        if (!active) {
          const devices = (typeof native.getAvailableDevices === 'function') ? await native.getAvailableDevices() : [];
          const back = devices?.find((d: any) => d.position === 'back') || devices?.[0];
          if (back && typeof native.startCamera === 'function') {
            await native.startCamera(back.id);
          }
        }
      } catch (prepErr) {
        console.warn('[CameraModule] Préparation capture (auto-start) a échoué:', prepErr);
      }

      if (typeof native.capturePhoto === 'function') {
        const res = await native.capturePhoto(options || {});
        // Normaliser un résultat potentiellement vide renvoyé par le natif
        if (!res || !res.uri) {
          console.warn('[CameraModule] capturePhoto a renvoyé un résultat vide, fallback');
          return { uri: '', width: 0, height: 0 } as PhotoResult;
        }
        return res;
      }
      console.warn('[CameraModule] capturePhoto indisponible — retour de secours');
      return { uri: 'ph://mock', width: 0, height: 0 } as PhotoResult;
    } catch (error) {
      console.error('[CameraModule] Erreur capture photo:', error);
      // Ne pas propager pour éviter les "Exception in HostFunction" côté UI
      return { uri: '', width: 0, height: 0 } as PhotoResult;
    }
  }

  // === ENREGISTREMENT VIDÉO ===

  /**
   * Démarre l'enregistrement vidéo
   */
  async startRecording(options?: VideoCaptureOptions): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.startRecording === 'function') {
        return await native.startRecording(options || {});
      }
      console.warn('[CameraModule] startRecording indisponible — succès simulé');
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur démarrage enregistrement:', error);
      throw error;
    }
  }

  /**
   * Arrête l'enregistrement vidéo
   */
  async stopRecording(): Promise<VideoResult> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.stopRecording === 'function') {
        return await native.stopRecording();
      }
      console.warn('[CameraModule] stopRecording indisponible — retour de secours');
      return { uri: 'file://mock.mov', duration: 0, size: 0, width: 0, height: 0 } as VideoResult;
    } catch (error) {
      console.error('[CameraModule] Erreur arrêt enregistrement:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un enregistrement est en cours
   */
  async isRecording(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.isRecording === 'function') {
        return await native.isRecording();
      }
      return false;
    } catch (error) {
      console.error('[CameraModule] Erreur vérification enregistrement:', error);
      return false;
    }
  }

  /**
   * Progression de l'enregistrement (durée/size)
   */
  async getRecordingProgress(): Promise<{duration: number; size: number}> {
    try {
      // @ts-ignore - exposé par le TurboModule
      return await (NativeCameraModule as any).getRecordingProgress();
    } catch (error) {
      console.error('[CameraModule] Erreur progression enregistrement:', error);
      return { duration: 0, size: 0 };
    }
  }

  /**
   * Met en pause l'enregistrement en cours (si supporté)
   */
  async pauseRecording(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.pauseRecording === 'function') {
        return await native.pauseRecording();
      }
      console.warn('[CameraModule] pauseRecording indisponible');
      return false;
    } catch (error) {
      console.error('[CameraModule] Erreur pause enregistrement:', error);
      return false;
    }
  }

  /**
   * Reprend l'enregistrement après une pause (si supporté)
   */
  async resumeRecording(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.resumeRecording === 'function') {
        return await native.resumeRecording();
      }
      console.warn('[CameraModule] resumeRecording indisponible');
      return false;
    } catch (error) {
      console.error('[CameraModule] Erreur reprise enregistrement:', error);
      return false;
    }
  }

  /**
   * Indique si l'enregistrement est actuellement en pause
   */
  async isPaused(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.isPaused === 'function') {
        return await native.isPaused();
      }
      return false;
    } catch (error) {
      console.error('[CameraModule] Erreur statut pause:', error);
      return false;
    }
  }

  // === CONTRÔLES FLASH/TORCHE ===

  /**
   * Vérifie si le dispositif actuel a un flash
   */
  async hasFlash(): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.hasFlash === 'function') {
        return await native.hasFlash();
      }
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur vérification flash:', error);
      return false;
    }
  }

  /**
   * Configure le mode flash
   */
  async setFlashMode(mode: 'on' | 'off' | 'auto'): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.setFlashMode === 'function') {
        return await native.setFlashMode(mode);
      }
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur configuration flash:', error);
      throw error;
    }
  }

  /**
   * Active/désactive la torche
   */
  async setTorchMode(enabled: boolean): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.setTorchMode === 'function') {
        return await native.setTorchMode(enabled);
      }
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur configuration torche:', error);
      throw error;
    }
  }

  // === CONTRÔLES ZOOM ===

  /**
   * Récupère le niveau de zoom minimum
   */
  async getMinZoom(): Promise<number> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getMinZoom === 'function') {
        return await native.getMinZoom();
      }
      return 1.0;
    } catch (error) {
      console.error('[CameraModule] Erreur récupération zoom min:', error);
      return 1.0;
    }
  }

  /**
   * Récupère le niveau de zoom maximum
   */
  async getMaxZoom(): Promise<number> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getMaxZoom === 'function') {
        return await native.getMaxZoom();
      }
      return 10.0;
    } catch (error) {
      console.error('[CameraModule] Erreur récupération zoom max:', error);
      return 10.0;
    }
  }

  /**
   * Définit le niveau de zoom
   */
  async setZoom(level: number): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.setZoom === 'function') {
        return await native.setZoom(level);
      }
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur configuration zoom:', error);
      throw error;
    }
  }

  // === CONTRÔLES TIMER ===
  /** Définit le timer (en secondes) */
  async setTimer(seconds: number): Promise<boolean> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.setTimer === 'function') {
        return await native.setTimer(seconds);
      }
      return true;
    } catch (error) {
      console.error('[CameraModule] Erreur configuration timer:', error);
      throw error;
    }
  }

  /** Récupère le timer courant (en secondes) */
  async getTimer(): Promise<number> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getTimer === 'function') {
        return await native.getTimer();
      }
      return 0;
    } catch (error) {
      console.error('[CameraModule] Erreur récupération timer:', error);
      return 0;
    }
  }

  // === UTILITAIRES ===

  /**
   * Récupère la taille de prévisualisation
   */
  async getPreviewSize(): Promise<{width: number; height: number}> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getPreviewSize === 'function') {
        return await native.getPreviewSize();
      }
      return { width: 1920, height: 1080 };
    } catch (error) {
      console.error('[CameraModule] Erreur récupération taille prévisualisation:', error);
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * Récupère les formats supportés par un dispositif
   */
  async getSupportedFormats(deviceId: string): Promise<Array<{width: number; height: number; fps: number; pixelFormat: string}>> {
    try {
      const native: any = NativeCameraModule as any;
      if (typeof native.getSupportedFormats === 'function') {
        return await native.getSupportedFormats(deviceId);
      }
      return [] as Array<{width: number; height: number; fps: number; pixelFormat: string}>;
    } catch (error) {
      console.error('[CameraModule] Erreur récupération formats:', error);
      return [] as Array<{width: number; height: number; fps: number; pixelFormat: string}>;
    }
  }
}

// Export de l'instance singleton
export const NativeCameraEngine = CameraModule.getInstance();

// Export par défaut du moteur
export default NativeCameraEngine;

// Export des composants React
export { AdvancedCameraControls } from './components/AdvancedCameraControls';
export { NativeCamera } from './components/NativeCamera';
export { useNativeCamera } from './hooks/useNativeCamera';
export { useNativeCameraCapture } from './hooks/useNativeCameraCapture';

