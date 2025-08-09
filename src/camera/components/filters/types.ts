/**
 * Types partagés pour les filtres
 */

export interface FilterInfo {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  hasIntensity: boolean;
  defaultIntensity: number;
  color: string;
}

export interface CompactFilterInfo {
  name: string;
  displayName: string;
  icon: string;
  color: string;
}

export type { AdvancedFilterParams, FilterState } from '../../../../specs/NativeCameraFiltersModule';


