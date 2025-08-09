/**
 * Contrôles avancés des filtres avec paramètres détaillés
 * Pour les filtres de type COLOR_CONTROLS et personnalisés
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  View
} from 'react-native';
import type { AdvancedFilterParams } from '../../../../../specs/NativeCameraFiltersModule';
import { FilterPresets } from './components/FilterPresets';
import { ParameterControl } from './components/ParameterControl';
import { ParameterSection } from './components/ParameterSection';
import { DEFAULT_EXPANDED_SECTIONS, DEFAULT_FILTER_PARAMS } from './constants';
import { styles } from './styles';
import type { AdvancedFilterControlsProps, ExpandedSections } from './types';

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
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(DEFAULT_EXPANDED_SECTIONS);

  // Les contrôles avancés sont toujours actifs maintenant
  const isAdvancedFilterActive = useMemo(() => {
    return true; // Toujours actifs par défaut
  }, []);

  // Activer automatiquement le filtre color_controls si aucun filtre n'est actif
  useEffect(() => {
    if (!currentFilter && !disabled) {
      console.log('[AdvancedFilterControls] Activation automatique du filtre color_controls');
      // Utiliser l'intensité par défaut du filtre color_controls (0.5)
      onFilterChange('color_controls', 0.5, DEFAULT_FILTER_PARAMS).catch(error => {
        console.error('[AdvancedFilterControls] Erreur activation automatique:', error);
      });
    }
  }, [currentFilter, disabled, onFilterChange]);

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
    if (disabled) return;

    try {
      const newParams = { ...params, [paramName]: value };
      setParams(newParams);
      
      // Utiliser color_controls par défaut si aucun filtre n'est actif
      const filterName = currentFilter?.name || 'color_controls';
      const intensity = currentFilter?.intensity || 0.5;
      
      await onFilterChange(filterName, intensity, newParams);
    } catch (error) {
      console.error('[AdvancedFilterControls] Erreur paramètre:', error);
    }
  }, [currentFilter, params, onFilterChange, disabled]);

  // Gestion des presets
  const handlePresetSelect = useCallback(async (presetParams: AdvancedFilterParams) => {
    if (disabled) return;

    try {
      setParams(presetParams);
      
      // Utiliser color_controls par défaut si aucun filtre n'est actif
      const filterName = currentFilter?.name || 'color_controls';
      const intensity = currentFilter?.intensity || 0.5;
      
      await onFilterChange(filterName, intensity, presetParams);
    } catch (error) {
      console.error('[AdvancedFilterControls] Erreur preset:', error);
    }
  }, [currentFilter, onFilterChange, disabled]);

  // Gestion de l'expansion des sections
  const toggleSection = useCallback((section: keyof ExpandedSections) => {
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

export default AdvancedFilterControls;
