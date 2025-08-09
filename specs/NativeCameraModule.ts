import { TurboModule, TurboModuleRegistry } from 'react-native';

// Types pour les options de capture
export interface PhotoCaptureOptions {
  quality?: number;
  base64?: boolean;
  exif?: boolean;
  skipMetadata?: boolean;
  format?: string; // "JPEG", "PNG", etc.
  deviceId?: string; // optionnel: forcer un device avant capture
}

export interface VideoCaptureOptions {
  quality?: string; // "low", "medium", "high", "max"
  maxDuration?: number;
  maxFileSize?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  recordAudio?: boolean;
  codec?: string; // "H264" | "HEVC" | "Auto"
  container?: 'mp4' | 'mov';
  audioCodec?: string; // "AAC"
  width?: number;
  height?: number;
  fps?: number;
  deviceId?: string; // "front" | "back" ou id natif
  // Ajouts avancés
  orientation?: 'portrait' | 'portraitUpsideDown' | 'landscapeLeft' | 'landscapeRight' | 'auto';
  stabilization?: 'off' | 'standard' | 'cinematic' | 'auto';
  lockAE?: boolean;
  lockAWB?: boolean;
  lockAF?: boolean;
  saveDirectory?: string;
  fileNamePrefix?: string;
}

// Types pour les résultats
export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  exif?: Object;
}

export interface VideoResult {
  uri: string;
  duration: number;
  size: number;
  width: number;
  height: number;
}

// Types pour les dispositifs
export interface CameraDevice {
  id: string;
  name: string;
  position: 'front' | 'back';
  hasFlash: boolean;
}

// Types pour les permissions
export interface PermissionResult {
  camera: string;
  microphone: string;
  storage: string;
}

/**
 * Spécification du Turbo Module Caméra
 * Selon les directives ISO C++20 du projet
 */
export interface Spec extends TurboModule {
  // Gestion des permissions
  readonly checkPermissions: () => PermissionResult;
  readonly requestPermissions: () => PermissionResult;
  
  // Gestion des dispositifs
  readonly getAvailableDevices: () => CameraDevice[];
  readonly getCurrentDevice: () => CameraDevice | null;
  readonly selectDevice: (deviceId: string) => boolean;
  readonly switchDevice: (position: string) => boolean;
  
  // Contrôles de la caméra
  readonly startCamera: (deviceId: string) => boolean;
  readonly stopCamera: () => boolean;
  readonly isActive: () => boolean;
  
  // Capture photo
  readonly capturePhoto: (options: PhotoCaptureOptions) => PhotoResult;
  
  // Enregistrement vidéo
  readonly startRecording: (options: VideoCaptureOptions) => boolean;
  readonly stopRecording: () => VideoResult;
  readonly isRecording: () => boolean;
  readonly getRecordingProgress: () => {duration: number, size: number};
  
  // Contrôles flash/torche
  readonly hasFlash: () => boolean;
  readonly setFlashMode: (mode: string) => boolean;
  readonly setTorchMode: (enabled: boolean) => boolean;
  
  // Contrôles zoom
  readonly getMinZoom: () => number;
  readonly getMaxZoom: () => number;
  readonly setZoom: (level: number) => boolean;
  
  // Utilitaires
  readonly getPreviewSize: () => {width: number, height: number};
  readonly getSupportedFormats: (deviceId: string) => Array<{width: number, height: number, fps: number, pixelFormat: string}>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCameraModule');