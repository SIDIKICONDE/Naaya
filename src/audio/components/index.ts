/**
 * Export des composants audio
 */

// Composants existants (legacy)
export { AudioEqualizer } from './AudioEqualizer';
export { EqualizerButton } from './EqualizerButton';
export { EqualizerControl } from './EqualizerControl';
export { PresetSelector } from './PresetSelector';
export { SpectrumAnalyzer } from './SpectrumAnalyzer';

// Nouveaux composants modernes
export { ModernAudioEqualizer } from './ModernAudioEqualizer';
export { ModernFrequencyBand } from './ModernFrequencyBand';
export { ModernPresetSelector } from './ModernPresetSelector';
export { 
  ModernSpectrumVisualizer,
  ModernSpectrumVisualizerFallback 
} from './ModernSpectrumVisualizer';

// Export par défaut du composant moderne
export { ModernAudioEqualizer as default } from './ModernAudioEqualizer';