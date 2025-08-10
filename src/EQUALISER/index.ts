/**
 * Point d'entrée principal pour l'égaliseur professionnel
 */

// Composants
export {
  ConfigurationModal, EqualiserControls, EqualiserMain,
  FrequencyBandSlider, FrequencyResponseGraph, PresetManager,
  SpectrumAnalyser
} from './components';

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
  EQUALISER_LIMITS, EQUALISER_THEMES, HELP_MESSAGES, PROFESSIONAL_FREQUENCY_BANDS, PROFESSIONAL_PRESETS, SIMPLE_FREQUENCY_BANDS
} from './constants';

