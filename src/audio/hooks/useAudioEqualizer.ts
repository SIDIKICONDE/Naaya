/**
 * Hook principal pour l'égaliseur audio
 * Version simplifiée sans module natif pour l'instant
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EqualizerState, SpectrumData } from '../types';

// Mock du module natif pour l'instant
const MockAudioEqualizer = {
  setEQEnabled: async (enabled: boolean) => {
    console.log('Mock: setEQEnabled', enabled);
    return Promise.resolve();
  },
  getEQEnabled: async () => {
    console.log('Mock: getEQEnabled');
    return Promise.resolve(false);
  },
  setBandGain: async (bandIndex: number, gain: number) => {
    console.log('Mock: setBandGain', bandIndex, gain);
    return Promise.resolve();
  },
  getBandGain: async (bandIndex: number) => {
    console.log('Mock: getBandGain', bandIndex);
    return Promise.resolve(0);
  },
  setPreset: async (presetName: string) => {
    console.log('Mock: setPreset', presetName);
    return Promise.resolve();
  },
  getCurrentPreset: async () => {
    console.log('Mock: getCurrentPreset');
    return Promise.resolve('flat');
  },
  startSpectrumAnalysis: async () => {
    console.log('Mock: startSpectrumAnalysis');
    return Promise.resolve();
  },
  stopSpectrumAnalysis: async () => {
    console.log('Mock: stopSpectrumAnalysis');
    return Promise.resolve();
  },
  getSpectrumData: async () => {
    console.log('Mock: getSpectrumData');
    return Promise.resolve(new Array(10).fill(0).map(() => Math.random() * 0.5));
  },
};

export interface UseAudioEqualizerOptions {
  autoStart?: boolean;
  enableSpectrum?: boolean;
}

export const useAudioEqualizer = (options: UseAudioEqualizerOptions = {}) => {
  const { autoStart = false, enableSpectrum = false } = options;
  
  const [state, setState] = useState<EqualizerState>({
    isEnabled: false,
    currentPreset: 'flat',
    bands: [
      { index: 0, frequency: 32, gain: 0, label: '32 Hz' },
      { index: 1, frequency: 64, gain: 0, label: '64 Hz' },
      { index: 2, frequency: 125, gain: 0, label: '125 Hz' },
      { index: 3, frequency: 250, gain: 0, label: '250 Hz' },
      { index: 4, frequency: 500, gain: 0, label: '500 Hz' },
      { index: 5, frequency: 1000, gain: 0, label: '1 kHz' },
      { index: 6, frequency: 2000, gain: 0, label: '2 kHz' },
      { index: 7, frequency: 4000, gain: 0, label: '4 kHz' },
      { index: 8, frequency: 8000, gain: 0, label: '8 kHz' },
      { index: 9, frequency: 16000, gain: 0, label: '16 kHz' },
    ],
    spectrumData: null,
    presets: [],
    isAnalyzing: false,
    isLoading: false,
    error: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const spectrumCallbackRef = useRef<((data: SpectrumData) => void) | null>(null);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        const enabled = await MockAudioEqualizer.getEQEnabled();
        const currentPreset = await MockAudioEqualizer.getCurrentPreset();
        
        setState(prev => ({
          ...prev,
          isEnabled: enabled,
          currentPreset,
        }));
        
        if (autoStart && !enabled) {
          await MockAudioEqualizer.setEQEnabled(true);
          setState(prev => ({ ...prev, isEnabled: true }));
        }
        
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Erreur d\'initialisation de l\'égaliseur:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, [autoStart]);

  // Gestion du spectre
  useEffect(() => {
    if (enableSpectrum && state.isEnabled) {
      spectrumCallbackRef.current = (data: SpectrumData) => {
        setState(prev => ({ ...prev, spectrumData: data }));
      };
      
      MockAudioEqualizer.startSpectrumAnalysis();
      
      return () => {
        if (spectrumCallbackRef.current) {
          MockAudioEqualizer.stopSpectrumAnalysis();
        }
      };
    }
  }, [enableSpectrum, state.isEnabled]);

  // Activer/Désactiver l'égaliseur
  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      await MockAudioEqualizer.setEQEnabled(enabled);
      setState(prev => ({ ...prev, isEnabled: enabled }));
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Modifier le gain d'une bande
  const setBandGain = useCallback(async (bandId: string, gain: number) => {
    try {
      await MockAudioEqualizer.setBandGain(Number(bandId), gain);
      
      setState(prev => ({
        ...prev,
        bands: prev.bands.map(band =>
          band.index === Number(bandId) ? { ...band, gain } : band
        ), 
        currentPreset: '', // Réinitialise le préréglage lors d'une modification manuelle
      }));
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Appliquer un préréglage
  const applyPreset = useCallback(async (presetId: string) => {
    try {
      await MockAudioEqualizer.setPreset(presetId);
      
      setState(prev => ({
        ...prev,
        currentPreset: presetId,
      }));
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Réinitialiser l'égaliseur
  const reset = useCallback(async () => {
    try {
      await MockAudioEqualizer.setPreset('flat');
      
      setState(prev => ({
        ...prev,
        currentPreset: 'flat',
        bands: prev.bands.map(band => ({ ...band, gain: 0 })),
      }));
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Rafraîchir l'état
  const refresh = useCallback(async () => {
    try {
      const [enabled, currentPreset] = await Promise.all([
        MockAudioEqualizer.getEQEnabled(),
        MockAudioEqualizer.getCurrentPreset(),
      ]);
      
      setState(prev => ({
        ...prev,
        isEnabled: enabled,
        currentPreset,
      }));
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    // État
    ...state,
    loading,
    error,
    
    // Actions
    setEnabled,
    setBandGain,
    applyPreset,
    reset,
    refresh,
  };
};