export type RecordingState = 'idle' | 'recording' | 'processing';

export type FlashMode = 'on' | 'off' | 'auto';

export type CameraPosition = 'front' | 'back';

import type { NativeCameraRef } from '../NativeCamera';

export interface VideoControlProps {
  cameraRef: React.RefObject<NativeCameraRef | null>;
  style?: any;
  disabled?: boolean;
  showTopControls?: boolean;
  showBottomControls?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (result?: any) => void;
  onPhotoCaptured?: (result?: any) => void;
  initialFlashMode?: FlashMode;
  initialCameraPosition?: CameraPosition;
}

export interface AdvancedRecordingOptions {
  recordAudio: boolean;
  container: 'mp4' | 'mov';
  codec: 'h264' | 'hevc';
  audioCodec?: 'aac';
  width?: number;
  height?: number;
  fps?: number;
  // nouveaux
  orientation?: 'portrait' | 'portraitUpsideDown' | 'landscapeLeft' | 'landscapeRight' | 'auto';
  stabilization?: 'off' | 'standard' | 'cinematic' | 'auto';
  lockAE?: boolean;
  lockAWB?: boolean;
  lockAF?: boolean;
  fileNamePrefix?: string;
  videoBitrate?: number;
  audioBitrate?: number;
  saveDirectory?: string;
}


