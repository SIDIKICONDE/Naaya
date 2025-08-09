/**
 * Hook React pour l'égaliseur audio
 * Fournit une interface réactive pour contrôler l'égaliseur
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import EqualizerService from '../services/EqualizerService';
import type { EqualizerState, SpectrumData } from '../types';

export const useEqualizer = () => {
  const [state, setState] = useState<EqualizerState>({
    isEnabled: false,
    currentPreset: 'flat',
    bands: [],
    presets: [],
    spectrumData: null,
    isAnalyzing: false,
    isLoading: true,
    error: null,
  });

  const serviceRef = useRef(EqualizerService);

  // Initialisation
  useEffect(() => {
    const service = serviceRef.current;

    const handleInitialized = () => {
      setState({
        isEnabled: service.getEnabled(),
        currentPreset: service.getCurrentPreset(),
        bands: service.getBands(),
        presets: service.getPresets(),
        spectrumData: null,
        isAnalyzing: false,
        isLoading: false,
        error: null,
      });
    };

    const handleError = (error: Error) => {
      setState(prev => ({ ...prev, error, isLoading: false }));
    };

    const handleEnabledChanged = (enabled: boolean) => {
      setState(prev => ({ ...prev, isEnabled: enabled }));
    };

    const handleBandChanged = ({ bandIndex, gain }: { bandIndex: number; gain: number }) => {
      setState(prev => {
        const newBands = [...prev.bands];
        if (newBands[bandIndex]) {
          newBands[bandIndex] = { ...newBands[bandIndex], gain };
        }
        return { ...prev, bands: newBands };
      });
    };

    const handlePresetChanged = (preset: string) => {
      setState(prev => ({ 
        ...prev, 
        currentPreset: preset,
        bands: service.getBands() // Mettre à jour les bandes avec les nouvelles valeurs
      }));
    };

    const handleSpectrumData = (data: SpectrumData) => {
      setState(prev => ({ ...prev, spectrumData: data }));
    };

    const handleSpectrumAnalysisStarted = () => {
      setState(prev => ({ ...prev, isAnalyzing: true }));
    };

    const handleSpectrumAnalysisStopped = () => {
      setState(prev => ({ ...prev, isAnalyzing: false, spectrumData: null }));
    };

    // Écouter les événements
    service.on('initialized', handleInitialized);
    service.on('error', handleError);
    service.on('enabledChanged', handleEnabledChanged);
    service.on('bandChanged', handleBandChanged);
    service.on('presetChanged', handlePresetChanged);
    service.on('spectrumData', handleSpectrumData);
    service.on('spectrumAnalysisStarted', handleSpectrumAnalysisStarted);
    service.on('spectrumAnalysisStopped', handleSpectrumAnalysisStopped);

    // Si le service est déjà initialisé, mettre à jour l'état
    if (service.getEnabled !== undefined) {
      handleInitialized();
    }

    // Nettoyage
    return () => {
      service.off('initialized', handleInitialized);
      service.off('error', handleError);
      service.off('enabledChanged', handleEnabledChanged);
      service.off('bandChanged', handleBandChanged);
      service.off('presetChanged', handlePresetChanged);
      service.off('spectrumData', handleSpectrumData);
      service.off('spectrumAnalysisStarted', handleSpectrumAnalysisStarted);
      service.off('spectrumAnalysisStopped', handleSpectrumAnalysisStopped);
    };
  }, []);

  // Actions
  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.setEnabled(enabled);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const setBandGain = useCallback(async (bandIndex: number, gain: number) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.setBandGain(bandIndex, gain);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const setPreset = useCallback(async (presetName: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.setPreset(presetName);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const startSpectrumAnalysis = useCallback(async (intervalMs?: number) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.startSpectrumAnalysis(intervalMs);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const stopSpectrumAnalysis = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.stopSpectrumAnalysis();
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.reset();
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const getConfiguration = useCallback(() => {
    return serviceRef.current.getConfiguration();
  }, []);

  const restoreConfiguration = useCallback(async (config: {
    enabled: boolean;
    preset: string;
    bands?: { index: number; gain: number }[];
  }) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await serviceRef.current.restoreConfiguration(config);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  return {
    // État
    ...state,
    
    // Actions
    setEnabled,
    setBandGain,
    setPreset,
    startSpectrumAnalysis,
    stopSpectrumAnalysis,
    reset,
    getConfiguration,
    restoreConfiguration,
  };
};