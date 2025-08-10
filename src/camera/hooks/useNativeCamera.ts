/**
 * Hook natif pour la gestion de la caméra
 * Performance pure - utilise directement le moteur C++ Naaya
 */

import { useCallback, useEffect, useState } from 'react';
import type { AdvancedFilterParams, FilterState } from '../../../specs/NativeCameraFiltersModule';
import CameraFilters from '../../../specs/NativeCameraFiltersModule';
import type { CameraDevice, PermissionResult } from '../../../specs/NativeCameraModule';
import { NativeCameraEngine } from '../index';

export type { AdvancedFilterParams };

export interface UseNativeCameraReturn {
  // État
  devices: CameraDevice[];
  currentDevice: CameraDevice | null;
  isReady: boolean;
  isActive: boolean;
  permissions: PermissionResult | null;
  error: Error | null;

  // Actions
  requestPermissions: () => Promise<void>;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => Promise<void>;
  switchDevice: (position: 'front' | 'back') => Promise<void>;
  refresh: () => Promise<void>;
  
  // Filtres
  availableFilters: string[];
  currentFilter: FilterState | null;
  setFilter: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  /**
   * Définit une LUT 3D (.cube) comme filtre courant.
   * Passez un chemin absolu vers un fichier .cube
   */
  setLUT: (cubeAbsolutePath: string, intensity: number) => Promise<boolean>;
  clearFilter: () => Promise<boolean>;
}

/**
 * Hook principal pour la caméra native
 */
export function useNativeCamera(): UseNativeCameraReturn {
  // État local
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [currentDevice, setCurrentDevice] = useState<CameraDevice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [permissions, setPermissions] = useState<PermissionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // État des filtres
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterState | null>(null);

  /**
   * Charge la liste des dispositifs caméra
   */
  const loadDevices = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Chargement des dispositifs...');
      const availableDevices = await NativeCameraEngine.getAvailableDevices();
      console.log('[useNativeCamera] Dispositifs trouvés:', availableDevices.length);
      
      setDevices(availableDevices);
      
      // Sélectionner le dispositif par défaut (arrière d'abord)
      if (availableDevices.length > 0) {
        const backDevice = availableDevices.find(device => device.position === 'back');
        const defaultDevice = backDevice || availableDevices[0];
        if (defaultDevice) {
          setCurrentDevice(defaultDevice);
          console.log('[useNativeCamera] Dispositif par défaut:', defaultDevice.name);
          setIsReady(true);
        }
      }
    } catch (err) {
      console.error('[useNativeCamera] Erreur chargement dispositifs:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Vérifie et met à jour les permissions
   */
  const checkPermissions = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Vérification des permissions...');
      const perms = await NativeCameraEngine.checkPermissions();
      setPermissions(perms);
      return perms;
    } catch (err) {
      console.error('[useNativeCamera] Erreur permissions:', err);
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Demande les permissions caméra
   */
  const requestPermissions = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Demande de permissions...');
      const perms = await NativeCameraEngine.requestPermissions();
      setPermissions(perms);
      
      // Si permissions accordées, initialiser les dispositifs
      if (perms.camera === 'granted') {
        await loadDevices();
      }
    } catch (err) {
      console.error('[useNativeCamera] Erreur demande permissions:', err);
      setError(err as Error);
      throw err;
    }
  }, [loadDevices]);

  /**
   * Démarre la caméra avec le dispositif spécifié
   */
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      const targetDeviceId = deviceId || currentDevice?.id;
      if (!targetDeviceId) {
        throw new Error('Aucun dispositif disponible');
      }

      console.log('[useNativeCamera] Démarrage caméra:', targetDeviceId);
      
      // Vérifier toujours les permissions (le natif gère simulateur)
      const perms = await NativeCameraEngine.checkPermissions();
      if (perms.camera !== 'granted') {
        throw new Error('Permission caméra non accordée');
      }
      
      // Vérifier que le dispositif existe toujours
      const availableDevices = await NativeCameraEngine.getAvailableDevices();
      const deviceExists = availableDevices.some(d => d.id === targetDeviceId);
      if (!deviceExists) {
        throw new Error('Dispositif caméra non disponible');
      }
      
      const success = await NativeCameraEngine.startCamera(targetDeviceId);
      
      if (success) {
        setIsActive(true);
        console.log('[useNativeCamera] Caméra démarrée avec succès');
      } else {
        throw new Error('Échec du démarrage de la caméra - vérifiez l\'espace de stockage et redémarrez l\'app');
      }
    } catch (err) {
      console.error('[useNativeCamera] Erreur démarrage caméra:', err);
      setError(err as Error);
      throw err;
    }
  }, [currentDevice]);

  /**
   * Arrête la caméra
   */
  const stopCamera = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Arrêt caméra...');
      const success = await NativeCameraEngine.stopCamera();
      
      if (success) {
        setIsActive(false);
        console.log('[useNativeCamera] Caméra arrêtée');
      }
    } catch (err) {
      console.error('[useNativeCamera] Erreur arrêt caméra:', err);
      setError(err as Error);
    }
  }, []);

  /**
   * Change de dispositif (avant/arrière)
   * Implémentation optimisée selon les directives C++20
   */
  const switchDevice = useCallback(async (position: 'front' | 'back') => {
    try {
      console.log('[useNativeCamera] Changement vers:', position);
      
      // Validation pré-conditions
      if (!devices || devices.length === 0) {
        throw new Error('Aucun dispositif caméra disponible');
      }
      
      // Vérifier que le dispositif cible existe
      const targetDevice = devices.find(device => device.position === position);
      if (!targetDevice) {
        const availablePositions = devices.map(d => d.position).join(', ');
        throw new Error(`Dispositif ${position} non disponible. Disponibles: ${availablePositions}`);
      }

      // Éviter un switch inutile vers le même dispositif
      if (currentDevice?.position === position) {
        console.log('[useNativeCamera] Dispositif déjà sélectionné:', position);
        return;
      }

      console.log(`[useNativeCamera] Basculement ${currentDevice?.position || 'inconnu'} → ${position}`);
      
      // Approche optimisée : switch direct sans arrêt/redémarrage
      const success = await NativeCameraEngine.switchDevice(position);
      if (!success) {
        throw new Error(`Échec du basculement vers ${position}`);
      }
      
      // Mettre à jour l'état local uniquement après succès
      setCurrentDevice(targetDevice);
      console.log('[useNativeCamera] Basculement réussi vers:', targetDevice.name);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[useNativeCamera] Erreur changement dispositif:', errorMsg);
      setError(new Error(`Basculement échoué: ${errorMsg}`));
      throw err;
    }
  }, [devices, currentDevice]);

  /**
   * Charge les filtres disponibles
   */
  const loadFilters = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Chargement des filtres...');
      const filters = await CameraFilters.getAvailableFilters();
      setAvailableFilters(filters);
      console.log('[useNativeCamera] Filtres disponibles:', filters);
    } catch (err) {
      console.error('[useNativeCamera] Erreur chargement filtres:', err);
    }
  }, []);

  /**
   * Applique un filtre
   */
  const setFilter = useCallback(async (name: string, intensity: number, params?: AdvancedFilterParams) => {
    try {
      console.log('[useNativeCamera] Application filtre:', name, 'intensité:', intensity);
      const success = params
        ? await CameraFilters.setFilterWithParams(name, intensity, params)
        : await CameraFilters.setFilter(name, intensity);
      if (success) {
        const filter = await CameraFilters.getFilter();
        setCurrentFilter(filter);
        console.log('[useNativeCamera] Filtre appliqué:', filter);
      }
      return success;
    } catch (err) {
      console.error('[useNativeCamera] Erreur application filtre:', err);
      return false;
    }
  }, []);

  /**
   * Applique une LUT .cube via le moteur caméra
   * Convention: nom de filtre "lut3d:/abs/path.cube"
   */
  const setLUT = useCallback(async (cubeAbsolutePath: string, intensity: number) => {
    const name = `lut3d:${cubeAbsolutePath}`;
    return setFilter(name, intensity);
  }, [setFilter]);

  /**
   * Supprime le filtre actuel
   */
  const clearFilter = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Suppression du filtre...');
      const success = await CameraFilters.clearFilter();
      if (success) {
        setCurrentFilter(null);
        console.log('[useNativeCamera] Filtre supprimé');
      }
      return success;
    } catch (err) {
      console.error('[useNativeCamera] Erreur suppression filtre:', err);
      return false;
    }
  }, []);

  /**
   * Rafraîchit la liste des dispositifs
   */
  const refresh = useCallback(async () => {
    try {
      console.log('[useNativeCamera] Rafraîchissement...');
      setError(null);
      const perms = await checkPermissions();
      if (perms.camera === 'not-determined') {
        // Demander automatiquement la permission lors du premier lancement
        await requestPermissions();
      } else {
        await loadDevices();
      }
      // Charger aussi les filtres
      await loadFilters();
    } catch (err) {
      console.error('[useNativeCamera] Erreur rafraîchissement:', err);
      setError(err as Error);
    }
  }, [checkPermissions, loadDevices, requestPermissions, loadFilters]);

  // Initialisation au montage
  useEffect(() => {
    console.log('[useNativeCamera] Initialisation...');
    // Appel initial sans dépendances pour éviter la boucle infinie
    checkPermissions().then(perms => {
      if (perms?.camera === 'not-determined') {
        requestPermissions();
      } else if (perms?.camera === 'granted') {
        loadDevices();
      }
      loadFilters();
    }).catch(err => {
      console.error('[useNativeCamera] Erreur initialisation:', err);
      setError(err as Error);
    });
    
    // Nettoyage au démontage
    return () => {
      console.log('[useNativeCamera] Nettoyage...');
      // Utilisation directe de l'API pour éviter les dépendances
      NativeCameraEngine.stopCamera().catch(console.error);
    };
  }, []); // Dépendances vides pour exécuter seulement au montage/démontage

  return {
    // État
    devices,
    currentDevice,
    isReady,
    isActive,
    permissions,
    error,

    // Actions
    requestPermissions,
    startCamera,
    stopCamera,
    switchDevice,
    refresh,
    
    // Filtres
    availableFilters,
    currentFilter,
    setFilter,
    setLUT,
    clearFilter,
  };
}
