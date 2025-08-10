/**
 * Hooks personnalisés optimisés pour les filtres
 * Utilise memoization et lazy loading pour maximiser les performances
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useFilterState, useFilterActions } from '../context/FilterContext';
import type { 
  FilterParams, 
  FilterPreset, 
  FilterChangeCallback,
  FilterIntensityCallback 
} from '../types';
import { DEFAULT_FILTER_PARAMS } from '../types';

/**
 * Hook pour gérer les changements de paramètres avec debounce
 */
export const useFilterParams = (debounceMs: number = 16) => {
  const { state } = useFilterState();
  const { updateParams } = useFilterActions();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<Partial<FilterParams>>({});

  const debouncedUpdate = useCallback((params: Partial<FilterParams>) => {
    // Accumuler les changements
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...params };

    // Clear timeout existant
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Débouncer l'update
    timeoutRef.current = setTimeout(() => {
      updateParams(pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
    }, debounceMs);
  }, [updateParams, debounceMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    params: state.params,
    updateParams: debouncedUpdate,
    immediateUpdate: updateParams
  };
};

/**
 * Hook pour gérer l'intensité du filtre avec optimisation
 */
export const useFilterIntensity = () => {
  const { state } = useFilterState();
  const { setIntensity } = useFilterActions();
  const lastIntensityRef = useRef(state.intensity);

  const optimizedSetIntensity = useCallback<FilterIntensityCallback>((intensity: number) => {
    // Éviter les updates inutiles
    if (Math.abs(lastIntensityRef.current - intensity) < 0.001) {
      return;
    }
    
    lastIntensityRef.current = intensity;
    setIntensity(intensity);
  }, [setIntensity]);

  return {
    intensity: state.intensity,
    setIntensity: optimizedSetIntensity
  };
};

/**
 * Hook pour gérer les presets avec lazy loading
 */
export const useFilterPresets = () => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { loadPreset } = useFilterActions();
  const presetsCache = useRef<Map<string, FilterPreset>>(new Map());

  // Charger les presets de manière asynchrone
  const loadPresets = useCallback(async () => {
    if (presets.length > 0) return; // Déjà chargés

    setIsLoading(true);
    setError(null);

    try {
      // Lazy load les presets
      const presetsModule = await import('../presets');
      const loadedPresets = presetsModule.default;
      
      // Mettre en cache
      loadedPresets.forEach(preset => {
        presetsCache.current.set(preset.id, preset);
      });

      setPresets(loadedPresets);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [presets.length]);

  // Appliquer un preset avec cache
  const applyPreset = useCallback((presetId: string) => {
    const preset = presetsCache.current.get(presetId);
    if (preset) {
      loadPreset(preset);
    }
  }, [loadPreset]);

  return {
    presets,
    isLoading,
    error,
    loadPresets,
    applyPreset
  };
};

/**
 * Hook pour interpoler entre deux états de filtres (pour les animations)
 */
export const useFilterInterpolation = (
  fromParams: FilterParams,
  toParams: FilterParams,
  duration: number = 300
) => {
  const [interpolatedParams, setInterpolatedParams] = useState(fromParams);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  const interpolate = useCallback(() => {
    setIsAnimating(true);
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpoler chaque paramètre
      const interpolated: FilterParams = {} as FilterParams;
      
      (Object.keys(fromParams) as Array<keyof FilterParams>).forEach(key => {
        const from = fromParams[key];
        const to = toParams[key];
        
        if (typeof from === 'number' && typeof to === 'number') {
          interpolated[key] = (from + (to - from) * eased) as any;
        } else {
          interpolated[key] = progress >= 0.5 ? to : from as any;
        }
      });

      setInterpolatedParams(interpolated);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [fromParams, toParams, duration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    interpolatedParams,
    isAnimating,
    startInterpolation: interpolate
  };
};

/**
 * Hook pour gérer les comparaisons avant/après
 */
export const useFilterComparison = () => {
  const { state } = useFilterState();
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'split' | 'toggle'>('split');
  const originalParamsRef = useRef<FilterParams>(DEFAULT_FILTER_PARAMS);

  const startComparison = useCallback(() => {
    originalParamsRef.current = { ...state.params };
    setIsComparing(true);
  }, [state.params]);

  const stopComparison = useCallback(() => {
    setIsComparing(false);
  }, []);

  const toggleComparison = useCallback(() => {
    setIsComparing(prev => !prev);
  }, []);

  return {
    isComparing,
    comparisonMode,
    originalParams: originalParamsRef.current,
    currentParams: state.params,
    startComparison,
    stopComparison,
    toggleComparison,
    setComparisonMode
  };
};

/**
 * Hook pour détecter les changements de filtres
 */
export const useFilterChange = (
  callback: FilterChangeCallback,
  deps: Array<keyof FilterParams> = []
) => {
  const { state } = useFilterState();
  const prevParamsRef = useRef(state.params);

  useEffect(() => {
    const hasChanged = deps.length === 0
      ? JSON.stringify(prevParamsRef.current) !== JSON.stringify(state.params)
      : deps.some(dep => prevParamsRef.current[dep] !== state.params[dep]);

    if (hasChanged) {
      callback(state.params);
      prevParamsRef.current = state.params;
    }
  }, [state.params, callback, deps]);
};

/**
 * Hook pour le profiling des performances
 */
export const useFilterPerformance = () => {
  const { metrics } = useFilterState();
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return {
    fps,
    renderTime: metrics?.renderTime || 0,
    processingTime: metrics?.processingTime || 0,
    memoryUsage: metrics?.memoryUsage || 0
  };
};

/**
 * Hook pour gérer les raccourcis clavier
 */
export const useFilterKeyboardShortcuts = () => {
  const { undo, redo, resetFilter } = useFilterActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z : Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Cmd/Ctrl + Shift + Z : Redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
      
      // Cmd/Ctrl + R : Reset
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        resetFilter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, resetFilter]);
};