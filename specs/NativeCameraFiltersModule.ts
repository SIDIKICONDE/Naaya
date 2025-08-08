import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface FilterState {
  name: string;
  intensity: number; // 0..1
}

export interface Spec extends TurboModule {
  readonly getAvailableFilters: () => string[];
  readonly setFilter: (name: string, intensity: number) => boolean;
  readonly getFilter: () => FilterState | null;
  readonly clearFilter: () => boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCameraFiltersModule');


