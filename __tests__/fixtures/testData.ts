// Données de test partagées
import type {
    CameraDevice,
    PermissionResult,
    PhotoCaptureOptions,
    PhotoResult,
    VideoCaptureOptions,
    VideoResult,
} from '../../specs/NativeCameraModule';

import type {
    AdvancedFilterParams,
    FilterState,
} from '../../specs/NativeCameraFiltersModule';

// Devices de test
export const mockDevices: CameraDevice[] = [
  {
    id: 'back-camera',
    name: 'Back Camera',
    position: 'back',
    hasFlash: true,
  },
  {
    id: 'front-camera',
    name: 'Front Camera',
    position: 'front',
    hasFlash: false,
  },
];

// Permissions de test
export const mockPermissionsGranted: PermissionResult = {
  camera: 'granted',
  microphone: 'granted',
  storage: 'granted',
};

export const mockPermissionsDenied: PermissionResult = {
  camera: 'denied',
  microphone: 'denied',
  storage: 'denied',
};

export const mockPermissionsPartial: PermissionResult = {
  camera: 'granted',
  microphone: 'denied',
  storage: 'granted',
};

// Résultats photo de test
export const mockPhotoResult: PhotoResult = {
  uri: 'file:///mock/photo.jpg',
  width: 1920,
  height: 1080,
  base64: 'mockBase64String',
  exif: {
    Make: 'Mock',
    Model: 'Test Camera',
    DateTime: '2024:01:01 12:00:00',
  },
};

// Résultats vidéo de test
export const mockVideoResult: VideoResult = {
  uri: 'file:///mock/video.mp4',
  duration: 10.5,
  size: 1048576,
  width: 1920,
  height: 1080,
};

// Options de capture photo
export const mockPhotoCaptureOptions: PhotoCaptureOptions = {
  quality: 0.8,
  base64: true,
  exif: true,
  skipMetadata: false,
  format: 'JPEG',
  deviceId: 'back-camera',
};

// Options de capture vidéo
export const mockVideoCaptureOptions: VideoCaptureOptions = {
  quality: 'high',
  maxDuration: 30,
  maxFileSize: 10485760,
  videoBitrate: 5000000,
  audioBitrate: 128000,
  recordAudio: true,
  codec: 'H264',
  container: 'mp4',
  audioCodec: 'AAC',
  width: 1920,
  height: 1080,
  fps: 30,
  deviceId: 'back-camera',
  orientation: 'portrait',
  stabilization: 'standard',
  lockAE: false,
  lockAWB: false,
  lockAF: false,
};

// États de filtre
export const mockFilterState: FilterState = {
  name: 'vintage',
  intensity: 0.75,
};

// Paramètres de filtre avancés
export const mockAdvancedFilterParams: AdvancedFilterParams = {
  brightness: 0.1,
  contrast: 1.2,
  saturation: 1.1,
  hue: 0,
  gamma: 1.0,
  warmth: 0.2,
  tint: 0,
  exposure: 0.3,
  shadows: -0.1,
  highlights: 0.1,
  vignette: 0.2,
  grain: 0.1,
};

// Filtres disponibles
export const mockAvailableFilters = [
  'none',
  'vintage',
  'sepia',
  'blackwhite',
  'cool',
  'warm',
  'dramatic',
  'filmic',
  'lut3d',
];

// Presets d'égaliseur
export const mockEQPresets = [
  'Flat',
  'Rock',
  'Pop',
  'Jazz',
  'Classical',
  'Dance',
  'Bass Boost',
  'Treble Boost',
  'Vocal',
  'Custom',
];

// Configuration de réduction de bruit
export const mockNoiseReductionConfig = {
  highPassEnabled: true,
  highPassHz: 80,
  thresholdDb: -45,
  ratio: 2.5,
  floorDb: -18,
  attackMs: 3,
  releaseMs: 80,
};

// Rapport de sécurité audio
export const mockAudioSafetyReport = {
  peak: 0.95,
  rms: 0.7,
  dcOffset: 0.001,
  clippedSamples: 0,
  feedbackScore: 0.1,
  overload: false,
};

// Données spectrales
export const mockSpectrumData = [
  0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.6, 0.4, 0.3, 0.2,
  0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.55, 0.45, 0.35, 0.25,
  0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.52, 0.42, 0.32, 0.22,
];

// Formats supportés
export const mockSupportedFormats = [
  { width: 640, height: 480, fps: 30, pixelFormat: 'YUV420' },
  { width: 1280, height: 720, fps: 30, pixelFormat: 'YUV420' },
  { width: 1920, height: 1080, fps: 30, pixelFormat: 'YUV420' },
  { width: 3840, height: 2160, fps: 30, pixelFormat: 'YUV420' },
  { width: 1920, height: 1080, fps: 60, pixelFormat: 'YUV420' },
];

// Balance des blancs
export const mockWhiteBalanceModes = [
  'auto',
  'incandescent',
  'fluorescent',
  'daylight',
  'cloudy',
  'shade',
  'manual',
];

export const mockWhiteBalanceGains = {
  red: 1.2,
  green: 1.0,
  blue: 0.8,
};

export const mockWhiteBalanceRange = {
  min: 2000,
  max: 8000,
};
