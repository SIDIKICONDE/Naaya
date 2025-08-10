/**
 * Hook React pour l'égaliseur professionnel
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { PROFESSIONAL_PRESETS } from '../constants';
import { EqualiserService } from '../services/EqualiserService';
import NativeEQBridge from '../services/equaliser/NativeEQBridge';
import {
  EqualiserPreset,
  EqualiserState,
  SpectrumAnalyserData,
} from '../types';

interface UseEqualiserOptions {
  enableSpectrum?: boolean;
  spectrumUpdateInterval?: number;
  autoSave?: boolean;
  debounceDelay?: number;
}

interface UseEqualiserReturn extends EqualiserState {
  // Actions
  setEnabled: (enabled: boolean) => Promise<void>;
  setBypass: (bypassed: boolean) => Promise<void>;
  setBandGain: (bandId: string, gain: number) => void;
  setBandParameters: (bandId: string, params: { gain?: number; frequency?: number; q?: number }) => Promise<void>;
  setSoloBand: (bandId: string | null) => Promise<void>;
  setPreset: (presetId: string) => Promise<void>;
  resetAllBands: () => Promise<void>;
  setInputGain: (gain: number) => Promise<void>;
  setOutputGain: (gain: number) => Promise<void>;
  
  // Analyse
  startAnalysis: () => Promise<void>;
  stopAnalysis: () => Promise<void>;
  
  // Configuration
  exportConfig: () => string;
  importConfig: (json: string) => Promise<void>;
  
  // Données
  presets: EqualiserPreset[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'SET_STATE'; payload: Partial<EqualiserState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_SPECTRUM_DATA'; payload: SpectrumAnalyserData | null };

interface State extends EqualiserState {
  isLoading: boolean;
  error: Error | null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SPECTRUM_DATA':
      return { ...state, spectrumData: action.payload };
    default:
      return state;
  }
}

export function useEqualiser(options: UseEqualiserOptions = {}): UseEqualiserReturn {
  const {
    enableSpectrum = true,
    spectrumUpdateInterval = 50,
    autoSave = true,
    debounceDelay = 100,
  } = options;

  // État initial
  const initialState: State = {
    ...EqualiserService.getState(),
    isLoading: true,
    error: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Synchroniser avec le service
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // S'abonner aux changements d'état
    unsubscribers.push(
      EqualiserService.on('stateChanged', (newState) => {
        if (isMountedRef.current) {
          dispatch({ type: 'SET_STATE', payload: newState });
        }
      })
    );

    // S'abonner aux données du spectre
    if (enableSpectrum) {
      unsubscribers.push(
        EqualiserService.on('spectrumData', (data) => {
          if (isMountedRef.current) {
            dispatch({ type: 'SET_SPECTRUM_DATA', payload: data });
          }
        })
      );
    }

    // S'abonner aux erreurs
    unsubscribers.push(
      EqualiserService.on('error', (error) => {
        if (isMountedRef.current) {
          dispatch({ type: 'SET_ERROR', payload: error });
        }
      })
    );

    // Charger l'état initial
    dispatch({ type: 'SET_STATE', payload: EqualiserService.getState() });
    dispatch({ type: 'SET_LOADING', payload: false });

    // Démarrer l'analyse si activée et non bypass
    if (enableSpectrum && state.enabled && !state.bypassed) {
      EqualiserService.startSpectrumAnalysis(spectrumUpdateInterval).catch(() => {});
    }

    // Nettoyage
    return () => {
      isMountedRef.current = false;
      // Clear debounce timer on cleanup
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      unsubscribers.forEach(unsub => unsub());
      if (enableSpectrum) {
        EqualiserService.stopSpectrumAnalysis().catch(() => {});
      }
    };
  }, [enableSpectrum, spectrumUpdateInterval, state.enabled, state.bypassed]);

  // Actions avec gestion d'erreur
  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        dispatch({ type: 'SET_ERROR', payload: null });
        return await fn(...args);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error as Error });
        throw error;
      }
    };
  }, []);

  // Actions debounced pour les changements fréquents
  const setBandGain = useCallback((bandId: string, gain: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Mise à jour optimiste immédiate
    const updatedBands = state.bands.map(band =>
      band.id === bandId ? { ...band, gain } : band
    );
    dispatch({ type: 'SET_STATE', payload: { bands: updatedBands } });

    // Debounce l'appel au service
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      EqualiserService.setBandGain(bandId, gain).catch(error => {
        dispatch({ type: 'SET_ERROR', payload: error });
      });
    }, debounceDelay);
  }, [state.bands, debounceDelay]);

  // Actions d'analyse
  const startAnalysis = useCallback(async () => {
    if (!state.analysisEnabled) {
      await EqualiserService.startSpectrumAnalysis(spectrumUpdateInterval);
    }
  }, [state.analysisEnabled, spectrumUpdateInterval]);

  const stopAnalysis = useCallback(async () => {
    if (state.analysisEnabled) {
      await EqualiserService.stopSpectrumAnalysis();
    }
  }, [state.analysisEnabled]);

  // Configuration
  const exportConfig = useCallback(() => {
    const config = EqualiserService.exportConfiguration();
    return JSON.stringify(config, null, 2);
  }, []);

  const importConfig = useCallback(async (json: string) => {
    try {
      const config = JSON.parse(json);
      await EqualiserService.importConfiguration(config);
      if (autoSave) {
        // Sauvegarder la configuration si l'auto-save est activé
        AsyncStorage.setItem('equaliser-config', json).catch(error => {
          console.warn('Erreur sauvegarde égaliseur:', error);
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [autoSave]);

  // Auto-save
  useEffect(() => {
    if (autoSave && !state.isLoading) {
      const config = exportConfig();
      AsyncStorage.setItem('equaliser-config', config).catch(error => {
        console.warn('Erreur sauvegarde égaliseur:', error);
      });
    }
  }, [autoSave, state.bands, state.currentPreset, state.enabled, exportConfig, state.isLoading]);

  // Filtrer les presets UI pour ne montrer que ceux supportés nativement (mêmes noms)
  const uiPresets = React.useMemo(() => {
    try {
      const native = NativeEQBridge.getAvailablePresets().map(n => n.toLowerCase());
      if (native.length === 0) return PROFESSIONAL_PRESETS; // fallback: tout afficher
      return PROFESSIONAL_PRESETS.filter(p => native.includes(p.name.toLowerCase()));
    } catch {
      return PROFESSIONAL_PRESETS;
    }
  }, []);

  return {
    // État
    ...state,
    
    // Actions
    setEnabled: wrapAsync(EqualiserService.setEnabled.bind(EqualiserService)),
    setBypass: wrapAsync(EqualiserService.setBypass.bind(EqualiserService)),
    setBandGain,
    setBandParameters: wrapAsync(EqualiserService.setBandParameters.bind(EqualiserService)),
    setSoloBand: wrapAsync(EqualiserService.setSoloBand.bind(EqualiserService)),
    setPreset: wrapAsync(EqualiserService.setPreset.bind(EqualiserService)),
    resetAllBands: wrapAsync(EqualiserService.resetAllBands.bind(EqualiserService)),
    setInputGain: wrapAsync(EqualiserService.setInputGain.bind(EqualiserService)),
    setOutputGain: wrapAsync(EqualiserService.setOutputGain.bind(EqualiserService)),
    
    // Analyse
    startAnalysis,
    stopAnalysis,
    
    // Configuration
    exportConfig,
    importConfig,
    
    // Données
    presets: uiPresets,
  };
}

// Hook pour utiliser uniquement le spectre
export function useEqualiserSpectrum() {
  const { spectrumData, analysisEnabled, startAnalysis, stopAnalysis } = useEqualiser({
    enableSpectrum: true,
    spectrumUpdateInterval: 33, // ~30 FPS
  });

  return {
    data: spectrumData,
    isActive: analysisEnabled,
    start: startAnalysis,
    stop: stopAnalysis,
  };
}

// Hook pour les préréglages
export function useEqualiserPresets() {
  const { currentPreset, setPreset, presets } = useEqualiser({
    enableSpectrum: false,
  });

  const customPresets = presets.filter(p => p.category === 'custom');
  const genrePresets = presets.filter(p => p.category === 'genre');
  const voicePresets = presets.filter(p => p.category === 'voice');
  const instrumentPresets = presets.filter(p => p.category === 'instrument');

  return {
    current: currentPreset,
    setPreset,
    all: presets,
    byCategory: {
      custom: customPresets,
      genre: genrePresets,
      voice: voicePresets,
      instrument: instrumentPresets,
    },
  };
}
