import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Contrôle de l'égaliseur
  readonly setEQEnabled: (enabled: boolean) => void;
  readonly getEQEnabled: () => boolean;
  readonly setMasterGain: (gainDb: number) => void;
  readonly getMasterGain: () => number;
  
  // Gestion des bandes de fréquence
  readonly setBandGain: (bandIndex: number, gain: number) => void;
  readonly getBandGain: (bandIndex: number) => number;
  
  // Préréglages
  readonly setPreset: (presetName: string) => void;
  readonly getCurrentPreset: () => string;
  readonly getAvailablePresets: () => string[];
  
  // Analyse spectrale
  readonly getSpectrumData: () => number[];
  readonly startSpectrumAnalysis: () => void;
  readonly stopSpectrumAnalysis: () => void;

  // Batching (optionnel)
  readonly beginBatch?: () => void;
  readonly endBatch?: () => void;

  // Noise Reduction (NR)
  readonly nrSetEnabled: (enabled: boolean) => void;
  readonly nrGetEnabled: () => boolean;
  readonly nrSetConfig: (
    highPassEnabled: boolean,
    highPassHz: number,
    thresholdDb: number,
    ratio: number,
    floorDb: number,
    attackMs: number,
    releaseMs: number,
  ) => void;
  readonly nrGetConfig: () => {
    highPassEnabled: boolean;
    highPassHz: number;
    thresholdDb: number;
    ratio: number;
    floorDb: number;
    attackMs: number;
    releaseMs: number;
  };

  // Audio Safety
  readonly safetySetConfig: (
    enabled: boolean,
    dcRemovalEnabled: boolean,
    dcThreshold: number,
    limiterEnabled: boolean,
    limiterThresholdDb: number,
    softKneeLimiter: boolean,
    kneeWidthDb: number,
    feedbackDetectEnabled: boolean,
    feedbackCorrThreshold: number,
  ) => void;
  readonly safetyGetReport: () => {
    peak: number;
    rms: number;
    dcOffset: number;
    clippedSamples: number;
    feedbackScore: number;
    overload: boolean;
  };

  // Effets créatifs (FX)
  readonly fxSetEnabled: (enabled: boolean) => void;
  readonly fxGetEnabled: () => boolean;
  readonly fxSetCompressor: (
    thresholdDb: number,
    ratio: number,
    attackMs: number,
    releaseMs: number,
    makeupDb: number,
  ) => void;
  readonly fxSetDelay: (
    delayMs: number,
    feedback: number,
    mix: number,
  ) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAudioEqualizerModule');
