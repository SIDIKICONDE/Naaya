/**
 * Hooks et composants optimisés pour la performance React Native
 */

import React, { useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Hook pour différer les opérations lourdes après les interactions
 */
export const useAfterInteractions = (callback: () => void, deps: React.DependencyList = []) => {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      callback();
    });
    
    return () => task.cancel();
  }, deps);
};

/**
 * Hook pour debounce les valeurs (éviter les re-rendus excessifs)
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Hook pour throttle les callbacks (limiter la fréquence d'exécution)
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  ) as T;
};

/**
 * HOC pour mémoriser les composants avec comparaison personnalisée
 */
export const memoWithCompare = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, areEqual);
};

/**
 * Hook pour mesurer les performances des rendus
 */
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (__DEV__) {
      console.log(`[Performance] ${componentName} rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
};

/**
 * Hook pour lazy loading des données
 */
export const useLazyLoad = <T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loader();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, deps);
  
  return { data, loading, error, load };
};

/**
 * Composant optimisé pour les images avec lazy loading
 */
interface OptimizedImageProps {
  source: { uri: string };
  style?: any;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  source,
  style,
  placeholder,
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);
  
  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);
  
  if (error) {
    return placeholder || null;
  }
  
  return (
    <>
      {!loaded && placeholder}
      <Image
        source={source}
        style={[style, !loaded && { position: 'absolute', opacity: 0 }]}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
});

/**
 * Hook pour gérer efficacement les listes longues
 */
export const useVirtualizedList = <T>(
  data: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);
  
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [data, visibleRange]);
  
  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: any) => setScrollTop(e.nativeEvent.contentOffset.y),
  };
};

// Imports manquants
import { Image } from 'react-native';