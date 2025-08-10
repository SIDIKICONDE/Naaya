/**
 * Composant de contrôle professionnel avec slider
 */

import React, { memo, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SLIDER_WIDTH } from '../constants';
import type { ParameterControlProps } from '../types';
import NumberLineControl from './NumberLineControl';

export const ParameterControl: React.FC<ParameterControlProps> = memo(({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit = '', 
  color = '#007AFF',
  onValueChange, 
  onSlidingComplete,
  disabled 
}) => {
  const displayValue = useMemo(() => {
    if (unit === '%') {
      return Math.round(value * 100);
    }
    return Math.round(value * 100) / 100;
  }, [value, unit]);

  // Supprimé: valueFormatter non utilisé (simplification UI performante)

  return (
    <View style={[styles.parameterContainer, disabled && styles.parameterDisabled]}>
      <View style={styles.parameterHeader}>
        <Text style={[styles.parameterLabel, disabled && styles.textDisabled]}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.parameterValue, { color }, disabled && styles.textDisabled]}>
            {displayValue}{unit}
          </Text>
        </View>
      </View>
      
      <NumberLineControl
        value={value}
        min={min}
        max={max}
        step={step}
        width={SLIDER_WIDTH}
        color={color}
        disabled={disabled}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  parameterContainer: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  parameterDisabled: {
    opacity: 0.5,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
    letterSpacing: 0.2,
  },
  valueContainer: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  parameterValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#666666',
  },
  sliderStyle: {
    marginTop: 6,
  },
});
