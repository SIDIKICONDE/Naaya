/**
 * Composant de contrôle professionnel avec slider
 */

import React, { memo, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';
import CustomSlider from '../../../../../ui/CustomSlider';
import { SLIDER_WIDTH } from '../constants';
import type { ParameterControlProps } from '../types';

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

  const valueFormatter = useMemo(() => {
    return (val: number) => {
      if (unit === '%') {
        return `${Math.round(val * 100)}%`;
      }
      return `${Math.round(val * 100) / 100}${unit}`;
    };
  }, [unit]);

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
      
      <CustomSlider
        value={value}
        onValueChange={onValueChange}
        onSlidingComplete={onSlidingComplete}
        minimumValue={min}
        maximumValue={max}
        step={step}
        width={SLIDER_WIDTH}
        trackHeight={4}
        thumbSize={20}
        activeTrackColor={color}
        inactiveTrackColor="rgba(255, 255, 255, 0.2)"
        thumbColor="#FFFFFF"
        accentColor={color}
        showValue={false}
        valueFormatter={valueFormatter}
        disabled={disabled}
        style={styles.sliderStyle}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  parameterContainer: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  parameterDisabled: {
    opacity: 0.5,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parameterLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  valueContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  parameterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#666666',
  },
  sliderStyle: {
    marginTop: 8,
  },
});
