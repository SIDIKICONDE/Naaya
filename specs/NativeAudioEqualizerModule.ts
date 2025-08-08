import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  // Contrôle de l'égaliseur
  readonly setEQEnabled: (enabled: boolean) => void;
  readonly getEQEnabled: () => boolean;
  
  // Gestion des bandes de fréquence
  readonly setBandGain: (bandIndex: number, gain: number) => void;
  readonly getBandGain: (bandIndex: number) => number;
  
  // Préréglages
  readonly setPreset: (presetName: string) => void;
  readonly getCurrentPreset: () => string;
  
  // Analyse spectrale
  readonly getSpectrumData: () => number[];
  readonly startSpectrumAnalysis: () => void;
  readonly stopSpectrumAnalysis: () => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAudioEqualizerModule');
