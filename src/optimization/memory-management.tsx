/**
 * Système de gestion de la mémoire pour React Native
 * Détection et prévention des fuites mémoire
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';

/**
 * Hook pour nettoyer automatiquement les event listeners
 */
export const useAutoCleanup = () => {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []);
  
  return registerCleanup;
};

/**
 * Hook pour gérer les abonnements avec nettoyage automatique
 */
export const useSubscription = <T>(
  subscribe: (callback: (data: T) => void) => () => void,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    const unsubscribe = subscribe(callback);
    return unsubscribe;
  }, deps);
};

/**
 * Hook pour gérer les timers avec nettoyage automatique
 */
export const useSafeTimer = () => {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  
  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = global.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);
  
  const setInterval = useCallback((callback: () => void, delay: number) => {
    const timer = global.setInterval(callback, delay);
    timers.current.add(timer);
    return timer;
  }, []);
  
  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    global.clearTimeout(timer);
    global.clearInterval(timer);
    timers.current.delete(timer);
  }, []);
  
  useEffect(() => {
    return () => {
      timers.current.forEach(timer => {
        global.clearTimeout(timer);
        global.clearInterval(timer);
      });
      timers.current.clear();
    };
  }, []);
  
  return { setTimeout, setInterval, clearTimer };
};

/**
 * Hook pour libérer la mémoire quand l'app passe en arrière-plan
 */
export const useMemoryOptimization = (onMemoryWarning?: () => void) => {
  const previousState = useRef<AppStateStatus>(AppState.currentState);
  
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        previousState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App passe en arrière-plan - libérer la mémoire
        if (__DEV__) {
          console.log('[Memory] App backgrounded - releasing memory');
        }
        
        // Forcer le garbage collection si disponible
        if (global.gc) {
          global.gc();
        }
      }
      
      previousState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Écouter les avertissements mémoire
    const memoryWarningSubscription = DeviceEventEmitter.addListener(
      'memoryWarning',
      () => {
        if (__DEV__) {
          console.warn('[Memory] Memory warning received!');
        }
        onMemoryWarning?.();
      }
    );
    
    return () => {
      subscription.remove();
      memoryWarningSubscription.remove();
    };
  }, [onMemoryWarning]);
};

/**
 * Hook pour tracker l'utilisation mémoire d'un composant
 */
export const useMemoryTracker = (componentName: string) => {
  const mounted = useRef(true);
  const allocations = useRef<any[]>([]);
  
  useEffect(() => {
    if (__DEV__) {
      console.log(`[Memory] ${componentName} mounted`);
    }
    
    return () => {
      mounted.current = false;
      
      if (__DEV__) {
        console.log(`[Memory] ${componentName} unmounted - ${allocations.current.length} allocations`);
        
        // Vérifier les fuites potentielles
        setTimeout(() => {
          if (allocations.current.length > 0) {
            console.warn(`[Memory] Potential leak in ${componentName}: ${allocations.current.length} unreleased allocations`);
          }
        }, 1000);
      }
      
      allocations.current = [];
    };
  }, [componentName]);
  
  const track = useCallback((allocation: any) => {
    if (mounted.current) {
      allocations.current.push(allocation);
    }
  }, []);
  
  const untrack = useCallback((allocation: any) => {
    const index = allocations.current.indexOf(allocation);
    if (index > -1) {
      allocations.current.splice(index, 1);
    }
  }, []);
  
  return { track, untrack };
};

/**
 * Wrapper pour les ressources qui doivent être libérées
 */
export class DisposableResource<T> {
  private resource: T | null;
  private disposeCallback: ((resource: T) => void) | null;
  
  constructor(resource: T, disposeCallback: (resource: T) => void) {
    this.resource = resource;
    this.disposeCallback = disposeCallback;
  }
  
  get(): T | null {
    return this.resource;
  }
  
  dispose(): void {
    if (this.resource && this.disposeCallback) {
      this.disposeCallback(this.resource);
      this.resource = null;
      this.disposeCallback = null;
    }
  }
}

/**
 * Hook pour gérer les ressources disposables
 */
export const useDisposable = <T>(
  factory: () => DisposableResource<T>,
  deps: React.DependencyList = []
) => {
  const resourceRef = useRef<DisposableResource<T> | null>(null);
  
  useEffect(() => {
    resourceRef.current = factory();
    
    return () => {
      resourceRef.current?.dispose();
      resourceRef.current = null;
    };
  }, deps);
  
  return resourceRef.current?.get() ?? null;
};

/**
 * Hook pour éviter les fuites avec les callbacks asynchrones
 */
export const useMountedState = () => {
  const mountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const isMounted = useCallback(() => mountedRef.current, []);
  
  return isMounted;
};

/**
 * Wrapper pour les opérations asynchrones sécurisées
 */
export const useSafeAsync = () => {
  const isMounted = useMountedState();
  
  const safeAsync = useCallback(
    async <T,>(asyncOperation: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await asyncOperation();
        if (isMounted()) {
          return result;
        }
        return null;
      } catch (error) {
        if (isMounted()) {
          throw error;
        }
        return null;
      }
    },
    [isMounted]
  );
  
  return safeAsync;
};