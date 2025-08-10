/**
 * Types TypeScript pour l'égaliseur professionnel
 */

export interface EqualiserBand {
  id: string;
  index: number;
  frequency: number;
  gain: number;
  q: number;
  type: 'lowshelf' | 'highshelf' | 'peaking' | 'lowpass' | 'highpass' | 'notch';
  label: string;
  color?: string;
}

export interface EqualiserPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'music' | 'voice' | 'instrument' | 'custom' | 'genre';
  bands: Record<string, number>;
  metadata?: {
    author?: string;
    tags?: string[];
    created?: Date;
    modified?: Date;
  };
}

export interface SpectrumAnalyserData {
  frequencies: number[];
  magnitudes: number[];
  peaks: number[];
  timestamp: number;
}

export interface EqualiserState {
  enabled: boolean;
  bypassed: boolean;
  currentPreset: string | null;
  bands: EqualiserBand[];
  outputGain: number;
  inputGain: number;
  analysisEnabled: boolean;
  spectrumData: SpectrumAnalyserData | null;
  compareMode: boolean;
  soloedBand: string | null;
}

export interface EqualiserConfig {
  bands: EqualiserBand[];
  preset: string | null;
  enabled: boolean;
  outputGain: number;
  inputGain: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  oversamplingRate: 1 | 2 | 4 | 8;
}

export interface AudioAnalysis {
  rms: number;
  peak: number;
  lufs: number;
  correlation: number;
  spectralCentroid: number;
  spectralSpread: number;
}

export interface EqualiserTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
  warning: string;
  success: string;
  grid: string;
  spectrum: {
    gradient: string[];
    peakColor: string;
  };
}

export type FilterType = 
  | 'bell'
  | 'lowShelf'
  | 'highShelf'
  | 'lowPass'
  | 'highPass'
  | 'bandPass'
  | 'notch'
  | 'allPass';

export interface TouchGesture {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  timestamp: number;
}

export interface AutomationPoint {
  time: number;
  value: number;
  curve: 'linear' | 'exponential' | 'logarithmic' | 'ease';
}

export interface BandAutomation {
  bandId: string;
  parameter: 'gain' | 'frequency' | 'q';
  points: AutomationPoint[];
  enabled: boolean;
}
