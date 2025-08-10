/**
 * Contrôles avancés des filtres avec paramètres détaillés
 * Pour les filtres de type COLOR_CONTROLS et personnalisés
 */

import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Text, View } from 'react-native';
import type { AdvancedFilterParams } from '../../../../../specs/NativeCameraFiltersModule';
import { FilterPresets } from './components/FilterPresets';
import { ParameterControl } from './components/ParameterControl';
import { ParameterSection } from './components/ParameterSection';
import { DEFAULT_EXPANDED_SECTIONS, DEFAULT_FILTER_PARAMS } from './constants';

import { styles } from './styles';
import type { AdvancedFilterControlsProps, ExpandedSections } from './types';

// Compat ScrollView pour contourner des problèmes de types éventuels
const ScrollViewCompat: any = (require('react-native') as any).ScrollView;

/**
 * Composant principal des contrôles avancés de filtres
 */
export const AdvancedFilterControls: React.FC<AdvancedFilterControlsProps> = memo(({
  currentFilter,
  onFilterChange,
  disabled = false,
  visible = true,
  autoActivateOnEmpty = true,
}) => {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(DEFAULT_EXPANDED_SECTIONS);

  // État local des paramètres avec optimisations
  const [params, setParams] = useState<AdvancedFilterParams>(DEFAULT_FILTER_PARAMS);
  const [isUpdating, setIsUpdating] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fonction de mise à jour d'un paramètre avec debounce
  const updateParam = useCallback((
    paramName: keyof AdvancedFilterParams,
    value: number,
    immediate: boolean = false
  ) => {
    if (disabled) return;

    // Mettre à jour l'état local immédiatement
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));

    if (immediate) {
      // Annuler le timer de debounce existant
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Appliquer immédiatement
      const newParams = { ...params, [paramName]: value };
      setIsUpdating(true);
      onFilterChange('color_controls', currentFilter?.intensity || 0.5, newParams)
        .finally(() => setIsUpdating(false))
        .catch(error => {
          console.error('[AdvancedFilterControls] Erreur application paramètres:', error);
        });
    } else {
      // Annuler le timer de debounce existant
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Créer un nouveau timer de debounce
      debounceTimerRef.current = setTimeout(() => {
        setIsUpdating(true);
        onFilterChange('color_controls', currentFilter?.intensity || 0.5, params)
          .finally(() => setIsUpdating(false))
          .catch(error => {
            console.error('[AdvancedFilterControls] Erreur application paramètres:', error);
          });
        debounceTimerRef.current = null;
      }, 150);
    }
  }, [params, currentFilter?.intensity, onFilterChange, disabled]);

  // Fonction de réinitialisation des paramètres
  const resetParams = useCallback((newParams?: AdvancedFilterParams) => {
    const targetParams = newParams || DEFAULT_FILTER_PARAMS;
    setParams(targetParams);
    
    // Annuler le timer de debounce existant
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Appliquer immédiatement
    setIsUpdating(true);
    onFilterChange('color_controls', currentFilter?.intensity || 0.5, targetParams)
      .finally(() => setIsUpdating(false))
      .catch(error => {
        console.error('[AdvancedFilterControls] Erreur application paramètres:', error);
      });
  }, [currentFilter?.intensity, onFilterChange]);

  // Nettoyer le timer lors du démontage
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Les contrôles avancés sont toujours actifs
  const isAdvancedFilterActive = useMemo(() => true, []);

  // Activer automatiquement le filtre color_controls si aucun filtre n'est actif (optionnel)
  useEffect(() => {
    if (autoActivateOnEmpty && !currentFilter && !disabled) {
      console.log('[AdvancedFilterControls] Activation automatique du filtre color_controls');
      onFilterChange('color_controls', 0.5, DEFAULT_FILTER_PARAMS).catch(error => {
        console.error('[AdvancedFilterControls] Erreur activation automatique:', error);
      });
    }
  }, [autoActivateOnEmpty, currentFilter, disabled, onFilterChange]);

  // Gestion du changement de paramètre (optimisé)
  const handleParameterChange = useCallback((
    paramName: keyof AdvancedFilterParams,
    value: number
  ) => {
    updateParam(paramName, value, false); // Avec debounce
  }, [updateParam]);

  // Application immédiate des paramètres (sans debounce)
  const handleParameterComplete = useCallback((
    paramName: keyof AdvancedFilterParams,
    value: number
  ) => {
    updateParam(paramName, value, true); // Immédiat
  }, [updateParam]);

  // Gestion des presets
  const handlePresetSelect = useCallback(async (presetParams: AdvancedFilterParams) => {
    if (disabled) return;

    try {
      resetParams(presetParams);
      // Les paramètres seront appliqués automatiquement via le hook
    } catch (error) {
      console.error('[AdvancedFilterControls] Erreur preset:', error);
    }
  }, [disabled, resetParams]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Réglages avancés</Text>
        {isUpdating && (
          <View style={styles.updatingIndicator}>
            <Text style={styles.updatingText}>●</Text>
          </View>
        )}
      </View>

      <ScrollViewCompat style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Presets de filtres */}
        <FilterPresets
          onPresetSelect={handlePresetSelect}
          disabled={disabled}
        />

        {/* Sections de paramètres */}
        <ParameterSection
          title="Luminosité et contraste"
          expanded={expandedSections.brightness}
          onToggle={() => toggleSection('brightness')}
        >
          <ParameterControl
            label="Luminosité"
            value={params.brightness}
            min={-1.0}
            max={1.0}
            step={0.01}
            unit=""
            color="#FFD700"
            onValueChange={(value) => handleParameterChange('brightness', value)}
            onSlidingComplete={(value) => handleParameterComplete('brightness', value)}
            disabled={disabled}
          />
          <ParameterControl
            label="Contraste"
            value={params.contrast}
            min={0.0}
            max={2.0}
            step={0.01}
            unit=""
            color="#FF6B6B"
            onValueChange={(value) => handleParameterChange('contrast', value)}
            onSlidingComplete={(value) => handleParameterComplete('contrast', value)}
            disabled={disabled}
          />
        </ParameterSection>

        <ParameterSection
          title="Couleurs"
          expanded={expandedSections.colors}
          onToggle={() => toggleSection('colors')}
        >
          <ParameterControl
            label="Saturation"
            value={params.saturation}
            min={0.0}
            max={2.0}
            step={0.01}
            unit=""
            color="#4ECDC4"
            onValueChange={(value) => handleParameterChange('saturation', value)}
            onSlidingComplete={(value) => handleParameterComplete('saturation', value)}
            disabled={disabled}
          />
          <ParameterControl
            label="Teinte"
            value={params.hue}
            min={-0.5}
            max={0.5}
            step={0.01}
            unit=""
            color="#9B59B6"
            onValueChange={(value) => handleParameterChange('hue', value)}
            onSlidingComplete={(value) => handleParameterComplete('hue', value)}
            disabled={disabled}
          />
        </ParameterSection>

        <ParameterSection
          title="Tons"
          expanded={expandedSections.tones}
          onToggle={() => toggleSection('tones')}
        >
          <ParameterControl
            label="Ombres"
            value={params.shadows}
            min={-1.0}
            max={1.0}
            step={0.01}
            unit=""
            color="#2C3E50"
            onValueChange={(value) => handleParameterChange('shadows', value)}
            onSlidingComplete={(value) => handleParameterComplete('shadows', value)}
            disabled={disabled}
          />
          <ParameterControl
            label="Hautes lumières"
            value={params.highlights}
            min={-1.0}
            max={1.0}
            step={0.01}
            unit=""
            color="#F1C40F"
            onValueChange={(value) => handleParameterChange('highlights', value)}
            onSlidingComplete={(value) => handleParameterComplete('highlights', value)}
            disabled={disabled}
          />
        </ParameterSection>
      </ScrollViewCompat>
    </View>
  );
});

export default AdvancedFilterControls;
