/**
 * Types pour le système d'égaliseur audio
 */

// Bande de fréquence de l'égaliseur
export interface EqualizerBand {
  index: number;
  frequency: number;
  gain: number;
  label: string;
}

// Préréglage d'égaliseur
export interface EqualizerPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  bands: Record<string, number>;
}

// Données d'analyse spectrale
export type SpectrumData = number[];

// Configuration de l'égaliseur
export interface EqualizerConfig {
  enabled: boolean;
  preset: string;
  bands: EqualizerBand[];
}

// Événements de l'égaliseur
export interface EqualizerEvents {
  initialized: void;
  error: Error;
  enabledChanged: boolean;
  bandChanged: { bandIndex: number; gain: number };
  presetChanged: string;
  spectrumData: SpectrumData;
  spectrumAnalysisStarted: void;
  spectrumAnalysisStopped: void;
  reset: void;
  configurationRestored: EqualizerConfig;
}

// État de l'égaliseur pour les composants React
export interface EqualizerState {
  isEnabled: boolean;
  currentPreset: string;
  bands: EqualizerBand[];
  presets: EqualizerPreset[];
  spectrumData: SpectrumData | null;
  isAnalyzing: boolean;
  isLoading: boolean;
  error: Error | null;
}