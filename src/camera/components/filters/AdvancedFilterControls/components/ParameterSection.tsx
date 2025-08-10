/**
 * Section de paramètres groupés
 */

import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import type { ParameterSectionProps } from '../types';

export const ParameterSection: React.FC<ParameterSectionProps> = memo(({ 
  title, 
  children, 
  expanded = true, 
  onToggle 
}) => {
  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        disabled={!onToggle}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {onToggle && (
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

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  sectionToggle: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  sectionContent: {
    paddingTop: 8,
  },
});
