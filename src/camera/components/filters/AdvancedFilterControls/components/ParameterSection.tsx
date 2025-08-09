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
  onToggleExpanded 
}) => {
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

const styles = StyleSheet.create({
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
});
