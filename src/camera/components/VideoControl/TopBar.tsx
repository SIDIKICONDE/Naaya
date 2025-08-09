import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FlashMode } from './types';

interface TopBarProps {
  flashMode: FlashMode;
  onToggleFlash: () => void;
  onToggleCamera: () => void;
  disabled?: boolean;
}

export const TopBar: React.FC<TopBarProps> = memo(({ flashMode, onToggleFlash, onToggleCamera, disabled }) => {
  const flashIcon = useMemo(() => {
    switch (flashMode) {
      case 'on': return '⚡';
      case 'off': return '⚡̸';
      case 'auto': return '⚡A';
      default: return '⚡';
    }
  }, [flashMode]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onToggleFlash} disabled={disabled}>
        <Text style={styles.icon}>{flashIcon}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onToggleCamera} disabled={disabled}>
        <Text style={styles.icon}>🔄</Text>
      </TouchableOpacity>
    </View>
  );
});

TopBar.displayName = 'TopBar';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    gap: 16,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});

export default TopBar;


