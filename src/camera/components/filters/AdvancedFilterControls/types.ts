/**
 * Types et interfaces pour les contrôles avancés de filtres
 */

import type { AdvancedFilterParams, FilterState } from '../../../../../specs/NativeCameraFiltersModule';

export interface AdvancedFilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  disabled?: boolean;
  visible?: boolean;
}

export interface ParameterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  color?: string;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  disabled?: boolean;
}

export interface ParameterSectionProps {
  title: string;
  children: React.ReactNode;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export interface FilterPresetsProps {
  onPresetSelect: (params: AdvancedFilterParams) => void;
  disabled?: boolean;
}

export interface FilterPreset {
  name: string;
  icon: string;
  params: AdvancedFilterParams;
}

export interface ExpandedSections {
  exposure: boolean;
  color: boolean;
  effects: boolean;
}
