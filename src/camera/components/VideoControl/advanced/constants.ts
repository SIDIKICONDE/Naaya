import { Platform } from 'react-native';
import type { AdvancedRecordingOptions } from '../types';
import type { Option, ResolutionOption } from './types';

export const CONTAINER_OPTIONS: ReadonlyArray<Option<AdvancedRecordingOptions['container']>> = [
  { label: 'MP4', value: 'mp4' },
  { label: 'MOV', value: 'mov' },
];

export const SUPPORTED_CODECS: ReadonlyArray<Option<AdvancedRecordingOptions['codec']>> =
  Platform.OS === 'ios'
    ? [
        { label: 'HEVC', value: 'hevc' },
        { label: 'H.264', value: 'h264' },
      ]
    : [
        { label: 'H.264', value: 'h264' },
        { label: 'HEVC', value: 'hevc' },
      ];

export const VIDEO_BITRATE_PRESETS: ReadonlyArray<Option<number | undefined>> = [
  { label: 'Auto', value: undefined },
  { label: '8 Mbps', value: 8_000_000 },
  { label: '12 Mbps', value: 12_000_000 },
  { label: '20 Mbps', value: 20_000_000 },
];

export const AUDIO_BITRATE_PRESETS: ReadonlyArray<Option<number | undefined>> = [
  { label: 'Auto', value: undefined },
  { label: '96 kbps', value: 96_000 },
  { label: '128 kbps', value: 128_000 },
  { label: '192 kbps', value: 192_000 },
];

export const ORIENTATION_OPTIONS: ReadonlyArray<Option<NonNullable<AdvancedRecordingOptions['orientation']>>> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Horizontal', value: 'horizontal' as any },
  { label: 'Paysage', value: 'paysage' as any },
];

export const STABILIZATION_OPTIONS: ReadonlyArray<Option<NonNullable<AdvancedRecordingOptions['stabilization']>>> = [
  { label: 'Off', value: 'off' },
  { label: 'Standard', value: 'standard' },
  { label: 'Cinématique', value: 'cinematic' },
  { label: 'Auto', value: 'auto' },
];

export const RESOLUTIONS: ReadonlyArray<ResolutionOption> = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '4K', width: 3840, height: 2160 },
];

export const FILE_PREFIX_OPTIONS: ReadonlyArray<Option<string>> = [
  { label: 'video', value: 'video' },
  { label: 'clip', value: 'clip' },
  { label: 'rec', value: 'rec' },
];

// Répertoires de sauvegarde proposés par l'UI.
// La valeur 'undefined' signifie « laisser le moteur choisir le répertoire par défaut ».
export const SAVE_DIRECTORIES: ReadonlyArray<Option<string | undefined>> = [
  { label: 'Par défaut (app)', value: undefined },
];




