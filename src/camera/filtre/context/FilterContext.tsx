/**
 * Contexte optimisé pour la gestion des filtres
 * Utilise des techniques de memoization et de séparation des concerns
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import type { 
  FilterState, 
  FilterParams, 
  FilterPreset, 
  FilterAction as FilterActionType,
  FilterHistoryEntry,
  FilterPerformanceMetrics
} from '../types';
import { DEFAULT_FILTER_STATE, DEFAULT_FILTER_PARAMS } from '../types';

// Actions du reducer
enum ActionType {
  SET_FILTER = 'SET_FILTER',
  UPDATE_PARAMS = 'UPDATE_PARAMS',
  SET_INTENSITY = 'SET_INTENSITY',
  RESET_FILTER = 'RESET_FILTER',
  LOAD_PRESET = 'LOAD_PRESET',
  SET_PROCESSING = 'SET_PROCESSING',
  BATCH_UPDATE = 'BATCH_UPDATE',
  UNDO = 'UNDO',
  REDO = 'REDO'
}

interface Action {
  type: ActionType;
  payload?: any;
}

// Contexte séparé pour les valeurs et les actions (évite les re-rendus)
interface FilterContextValue {
  state: FilterState;
  history: FilterHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  metrics: FilterPerformanceMetrics | null;
}

interface FilterContextActions {
  setFilter: (filterId: string) => void;
  updateParams: (params: Partial<FilterParams>) => void;
  setIntensity: (intensity: number) => void;
  resetFilter: () => void;
  loadPreset: (preset: FilterPreset) => void;
  batchUpdate: (updates: Partial<FilterState>) => void;
  undo: () => void;
  redo: () => void;
}

const FilterValueContext = createContext<FilterContextValue | undefined>(undefined);
const FilterActionsContext = createContext<FilterContextActions | undefined>(undefined);

// Reducer optimisé avec immer-like immutability
function filterReducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case ActionType.SET_FILTER:
      if (state.activeFilter === action.payload) return state;
      return {
        ...state,
        activeFilter: action.payload,
        isDirty: true
      };

    case ActionType.UPDATE_PARAMS:
      // Vérifier si les params ont vraiment changé
      const newParams = { ...state.params, ...action.payload };
      const hasChanged = Object.keys(action.payload).some(
        key => state.params[key as keyof FilterParams] !== action.payload[key]
      );
      if (!hasChanged) return state;
      
      return {
        ...state,
        params: newParams,
        isDirty: true
      };

    case ActionType.SET_INTENSITY:
      if (state.intensity === action.payload) return state;
      return {
        ...state,
        intensity: Math.max(0, Math.min(1, action.payload)),
        isDirty: true
      };

    case ActionType.RESET_FILTER:
      return DEFAULT_FILTER_STATE;

    case ActionType.LOAD_PRESET:
      const preset = action.payload as FilterPreset;
      return {
        ...state,
        activeFilter: preset.id,
        params: preset.params,
        intensity: 1.0,
        isDirty: true
      };

    case ActionType.SET_PROCESSING:
      if (state.isProcessing === action.payload) return state;
      return {
        ...state,
        isProcessing: action.payload
      };

    case ActionType.BATCH_UPDATE:
      return {
        ...state,
        ...action.payload,
        isDirty: true
      };

    default:
      return state;
  }
}

interface FilterProviderProps {
  children: React.ReactNode;
  initialState?: Partial<FilterState>;
  maxHistorySize?: number;
  enableProfiling?: boolean;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ 
  children, 
  initialState,
  maxHistorySize = 20,
  enableProfiling = false
}) => {
  const [state, dispatch] = useReducer(
    filterReducer, 
    { ...DEFAULT_FILTER_STATE, ...initialState }
  );

  // Historique avec useRef pour éviter les re-rendus
  const historyRef = useRef<FilterHistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const metricsRef = useRef<FilterPerformanceMetrics | null>(null);

  // Ajouter à l'historique (optimisé avec debounce)
  const addToHistory = useCallback((action: FilterActionType) => {
    const entry: FilterHistoryEntry = {
      timestamp: Date.now(),
      state: { ...state },
      action
    };

    // Supprimer les entrées futures si on est au milieu de l'historique
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    historyRef.current.push(entry);
    
    // Limiter la taille de l'historique
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, [state, maxHistorySize]);

  // Actions mémorisées avec useCallback
  const setFilter = useCallback((filterId: string) => {
    dispatch({ type: ActionType.SET_FILTER, payload: filterId });
    addToHistory(FilterActionType.APPLY);
  }, [addToHistory]);

  const updateParams = useCallback((params: Partial<FilterParams>) => {
    dispatch({ type: ActionType.UPDATE_PARAMS, payload: params });
    addToHistory(FilterActionType.ADJUST);
  }, [addToHistory]);

  const setIntensity = useCallback((intensity: number) => {
    dispatch({ type: ActionType.SET_INTENSITY, payload: intensity });
    addToHistory(FilterActionType.ADJUST);
  }, [addToHistory]);

  const resetFilter = useCallback(() => {
    dispatch({ type: ActionType.RESET_FILTER });
    addToHistory(FilterActionType.RESET);
  }, [addToHistory]);

  const loadPreset = useCallback((preset: FilterPreset) => {
    dispatch({ type: ActionType.LOAD_PRESET, payload: preset });
    addToHistory(FilterActionType.LOAD_PRESET);
  }, [addToHistory]);

  const batchUpdate = useCallback((updates: Partial<FilterState>) => {
    dispatch({ type: ActionType.BATCH_UPDATE, payload: updates });
    addToHistory(FilterActionType.ADJUST);
  }, [addToHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: ActionType.BATCH_UPDATE, payload: entry.state });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const entry = historyRef.current[historyIndexRef.current];
      dispatch({ type: ActionType.BATCH_UPDATE, payload: entry.state });
    }
  }, []);

  // Profiling des performances
  useEffect(() => {
    if (!enableProfiling) return;

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      metricsRef.current = {
        renderTime: endTime - startTime,
        processingTime: 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        frameRate: 60 // À calculer avec requestAnimationFrame
      };
    };
  });

  // Valeurs mémorisées
  const contextValue = useMemo<FilterContextValue>(() => ({
    state,
    history: historyRef.current,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    metrics: metricsRef.current
  }), [state]);

  const contextActions = useMemo<FilterContextActions>(() => ({
    setFilter,
    updateParams,
    setIntensity,
    resetFilter,
    loadPreset,
    batchUpdate,
    undo,
    redo
  }), [setFilter, updateParams, setIntensity, resetFilter, loadPreset, batchUpdate, undo, redo]);

  return (
    <FilterValueContext.Provider value={contextValue}>
      <FilterActionsContext.Provider value={contextActions}>
        {children}
      </FilterActionsContext.Provider>
    </FilterValueContext.Provider>
  );
};

// Hooks personnalisés pour accéder au contexte
export const useFilterState = () => {
  const context = useContext(FilterValueContext);
  if (!context) {
    throw new Error('useFilterState must be used within FilterProvider');
  }
  return context;
};

export const useFilterActions = () => {
  const context = useContext(FilterActionsContext);
  if (!context) {
    throw new Error('useFilterActions must be used within FilterProvider');
  }
  return context;
};

// Hook combiné pour la compatibilité
export const useFilter = () => {
  const state = useFilterState();
  const actions = useFilterActions();
  return { ...state, ...actions };
};