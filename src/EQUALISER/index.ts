/**
 * Point d'entrée principal pour l'égaliseur professionnel
 */

// Composants (export individuels pour éviter les cycles)
export { ConfigurationModal } from './components/ConfigurationModal';
export { EqualiserControls } from './components/EqualiserControls';
export { EqualiserMain } from './components/EqualiserMain';
export { FrequencyBandSlider } from './components/FrequencyBandSlider';
export { FrequencyResponseGraph } from './components/FrequencyResponseGraph';
export { PresetManager } from './components/PresetManager';
export { SpectrumAnalyser } from './components/SpectrumAnalyser';

// Hooks
export {
  useEqualiser, useEqualiserPresets, useEqualiserSpectrum
} from './hooks/useEqualiser';

// Services
export { EqualiserService } from './services/EqualiserService';

// Types
export type {
  AudioAnalysis, BandAutomation, EqualiserBand, EqualiserConfig, EqualiserPreset,
  EqualiserState, EqualiserTheme, FilterType, SpectrumAnalyserData
} from './types';

// Constantes
export {
  EQUALISER_LIMITS, EQUALISER_THEMES, HELP_MESSAGES, PROFESSIONAL_PRESETS, SIMPLE_FREQUENCY_BANDS
} from './constants';

