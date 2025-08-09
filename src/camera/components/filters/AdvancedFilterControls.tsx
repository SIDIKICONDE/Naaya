/**
 * Contrôles avancés des filtres avec paramètres détaillés
 * Pour les filtres de type COLOR_CONTROLS et personnalisés
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { AdvancedFilterParams, FilterState } from '../../../../specs/NativeCameraFiltersModule';
import { DEFAULT_FILTER_PARAMS } from './constants';

export interface AdvancedFilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  disabled?: boolean;
  visible?: boolean;
}

/**
 * Composant de contrôle individuel avec boutons + et -
 */
const ParameterControl: React.FC<{
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
}> = memo(({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit = '', 
  color = '#007AFF',
  onValueChange, 
  onSlidingComplete: _onSlidingComplete,
  disabled 
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleValueChange = useCallback((newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));
    setLocalValue(clampedValue);
    onValueChange(clampedValue);
  }, [onValueChange, min, max]);

  // Note: pas de slider, on ne déclenche pas d'événement de fin indépendant

  const increment = useCallback(() => {
    handleValueChange(localValue + step);
  }, [localValue, step, handleValueChange]);

  const decrement = useCallback(() => {
    handleValueChange(localValue - step);
  }, [localValue, step, handleValueChange]);

  const displayValue = useMemo(() => {
    if (unit === '%') {
      return Math.round(value * 100);
    }
    return Math.round(value * 100) / 100;
  }, [value, unit]);

  return (
    <View style={styles.parameterContainer}>
      <View style={styles.parameterHeader}>
        <Text style={styles.parameterLabel}>{label}</Text>
        <Text style={styles.parameterValue}>
          {displayValue}{unit}
        </Text>
      </View>
      
      <View style={styles.parameterControls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: color }]}
          onPress={decrement}
          disabled={disabled || localValue <= min}
          activeOpacity={0.7}
        >
          <Text style={styles.controlButtonText}>-</Text>
        </TouchableOpacity>
        
        <View style={styles.valueDisplay}>
          <Text style={[styles.valueText, { color }]}>
            {displayValue}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: color }]}
          onPress={increment}
          disabled={disabled || localValue >= max}
          activeOpacity={0.7}
        >
          <Text style={styles.controlButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

/**
 * Section de paramètres groupés
 */
const ParameterSection: React.FC<{
  title: string;
  children: React.ReactNode;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}> = memo(({ title, children, expanded = true, onToggleExpanded }) => {
  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggleExpanded}
        disabled={!onToggleExpanded}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {onToggleExpanded && (
          <Text style={styles.sectionToggle}>
            {expanded ? '▼' : '▶'}
          </Text>
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
});

/**
 * Presets prédéfinis pour accès rapide
 */
const FilterPresets: React.FC<{
  onPresetSelect: (params: AdvancedFilterParams) => void;
  disabled?: boolean;
}> = memo(({ onPresetSelect, disabled }) => {
  const presets = useMemo(() => [
    {
      name: 'Reset',
      icon: '🔄',
      params: DEFAULT_FILTER_PARAMS,
    },
    {
      name: 'Vivid',
      icon: '🌈',
      params: {
        ...DEFAULT_FILTER_PARAMS,
        contrast: 1.2,
        saturation: 1.3,
        exposure: 0.1,
      },
    },
    {
      name: 'Film',
      icon: '🎞️',
      params: {
        ...DEFAULT_FILTER_PARAMS,
        contrast: 0.9,
        saturation: 0.8,
        warmth: 0.2,
        grain: 0.1,
      },
    },
    {
      name: 'Portrait',
      icon: '👤',
      params: {
        ...DEFAULT_FILTER_PARAMS,
        exposure: 0.1,
        shadows: 0.2,
        highlights: -0.1,
        warmth: 0.1,
      },
    },
    {
      name: 'Dramatic',
      icon: '⚡',
      params: {
        ...DEFAULT_FILTER_PARAMS,
        contrast: 1.4,
        shadows: -0.3,
        highlights: -0.2,
        vignette: 0.3,
      },
    },
  ], []);

  return (
    <View style={styles.presetsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsList}
      >
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            style={styles.presetButton}
            onPress={() => onPresetSelect(preset.params)}
            disabled={disabled}
          >
            <Text style={styles.presetIcon}>{preset.icon}</Text>
            <Text style={styles.presetName}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
});

/**
 * Composant principal des contrôles avancés de filtres
 */
export const AdvancedFilterControls: React.FC<AdvancedFilterControlsProps> = memo(({
  currentFilter,
  onFilterChange,
  disabled = false,
  visible = true,
}) => {
  const [params, setParams] = useState<AdvancedFilterParams>(DEFAULT_FILTER_PARAMS);
  const [expandedSections, setExpandedSections] = useState({
    exposure: true,
    color: true,
    effects: false,
  });

  // Vérifier si les contrôles avancés sont disponibles
  const isAdvancedFilterActive = useMemo(() => {
    console.log('[AdvancedFilterControls] currentFilter:', currentFilter);
    const isActive = currentFilter?.name === 'color_controls' || 
           currentFilter?.name === 'custom';
    console.log('[AdvancedFilterControls] isAdvancedFilterActive:', isActive);
    return isActive;
  }, [currentFilter]);

  // Gestion du changement de paramètre
  const handleParameterChange = useCallback((
    paramName: keyof AdvancedFilterParams,
    value: number
  ) => {
    const newParams = { ...params, [paramName]: value };
    setParams(newParams);
  }, [params]);

  // Application des paramètres (avec debounce)
  const handleParameterComplete = useCallback(async (
    paramName: keyof AdvancedFilterParams,
    value: number
  ) => {
    if (!currentFilter || disabled) return;

    try {
      const newParams = { ...params, [paramName]: value };
      setParams(newParams);
      await onFilterChange(currentFilter.name, currentFilter.intensity, newParams);
    } catch (error) {
      console.error('[AdvancedFilterControls] Erreur paramètre:', error);
    }
  }, [currentFilter, params, onFilterChange, disabled]);

  // Gestion des presets
  const handlePresetSelect = useCallback(async (presetParams: AdvancedFilterParams) => {
    if (!currentFilter || disabled) return;

    try {
      setParams(presetParams);
      await onFilterChange(currentFilter.name, currentFilter.intensity, presetParams);
    } catch (error) {
      console.error('[AdvancedFilterControls] Erreur preset:', error);
    }
  }, [currentFilter, onFilterChange, disabled]);

  // Gestion de l'expansion des sections
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  if (!visible || !isAdvancedFilterActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contrôles Avancés</Text>
      
      {/* Presets rapides */}
      <FilterPresets onPresetSelect={handlePresetSelect} disabled={disabled} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section Exposition */}
        <ParameterSection
          title="Exposition"
          expanded={expandedSections.exposure}
          onToggleExpanded={() => toggleSection('exposure')}
        >
          <ParameterControl
            label="Exposition"
            value={params.exposure}
            min={-2.0}
            max={2.0}
            step={0.1}
            color="#FFD700"
            onValueChange={(value) => handleParameterChange('exposure', value)}
            onSlidingComplete={(value) => handleParameterComplete('exposure', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Ombres"
            value={params.shadows}
            min={-1.0}
            max={1.0}
            step={0.05}
            color="#8B4513"
            onValueChange={(value) => handleParameterChange('shadows', value)}
            onSlidingComplete={(value) => handleParameterComplete('shadows', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Hautes lumières"
            value={params.highlights}
            min={-1.0}
            max={1.0}
            step={0.05}
            color="#F0F8FF"
            onValueChange={(value) => handleParameterChange('highlights', value)}
            onSlidingComplete={(value) => handleParameterComplete('highlights', value)}
            disabled={disabled}
          />
        </ParameterSection>

        {/* Section Couleur */}
        <ParameterSection
          title="Couleur"
          expanded={expandedSections.color}
          onToggleExpanded={() => toggleSection('color')}
        >
          <ParameterControl
            label="Luminosité"
            value={params.brightness}
            min={-1.0}
            max={1.0}
            step={0.05}
            color="#FFFF00"
            onValueChange={(value) => handleParameterChange('brightness', value)}
            onSlidingComplete={(value) => handleParameterComplete('brightness', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Contraste"
            value={params.contrast}
            min={0.0}
            max={2.0}
            step={0.05}
            color="#808080"
            onValueChange={(value) => handleParameterChange('contrast', value)}
            onSlidingComplete={(value) => handleParameterComplete('contrast', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Saturation"
            value={params.saturation}
            min={0.0}
            max={2.0}
            step={0.05}
            unit="%"
            color="#FF69B4"
            onValueChange={(value) => handleParameterChange('saturation', value)}
            onSlidingComplete={(value) => handleParameterComplete('saturation', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Teinte"
            value={params.hue}
            min={-180}
            max={180}
            step={5}
            unit="°"
            color="#9400D3"
            onValueChange={(value) => handleParameterChange('hue', value)}
            onSlidingComplete={(value) => handleParameterComplete('hue', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Chaleur"
            value={params.warmth}
            min={-1.0}
            max={1.0}
            step={0.05}
            color="#FF4500"
            onValueChange={(value) => handleParameterChange('warmth', value)}
            onSlidingComplete={(value) => handleParameterComplete('warmth', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Teinte colorimétrique"
            value={params.tint}
            min={-1.0}
            max={1.0}
            step={0.05}
            color="#32CD32"
            onValueChange={(value) => handleParameterChange('tint', value)}
            onSlidingComplete={(value) => handleParameterComplete('tint', value)}
            disabled={disabled}
          />
        </ParameterSection>

        {/* Section Effets */}
        <ParameterSection
          title="Effets"
          expanded={expandedSections.effects}
          onToggleExpanded={() => toggleSection('effects')}
        >
          <ParameterControl
            label="Gamma"
            value={params.gamma}
            min={0.1}
            max={3.0}
            step={0.1}
            color="#DAA520"
            onValueChange={(value) => handleParameterChange('gamma', value)}
            onSlidingComplete={(value) => handleParameterComplete('gamma', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Vignettage"
            value={params.vignette}
            min={0.0}
            max={1.0}
            step={0.05}
            unit="%"
            color="#2F4F4F"
            onValueChange={(value) => handleParameterChange('vignette', value)}
            onSlidingComplete={(value) => handleParameterComplete('vignette', value)}
            disabled={disabled}
          />
          
          <ParameterControl
            label="Grain"
            value={params.grain}
            min={0.0}
            max={1.0}
            step={0.05}
            unit="%"
            color="#696969"
            onValueChange={(value) => handleParameterChange('grain', value)}
            onSlidingComplete={(value) => handleParameterComplete('grain', value)}
            disabled={disabled}
          />
        </ParameterSection>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetsList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  presetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#333333',
  },
  presetIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  presetName: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  sectionToggle: {
    fontSize: 12,
    color: '#888888',
  },
  sectionContent: {
    paddingTop: 12,
  },
  parameterContainer: {
    marginBottom: 16,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  parameterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  controlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  controlButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  valueDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdvancedFilterControls;


