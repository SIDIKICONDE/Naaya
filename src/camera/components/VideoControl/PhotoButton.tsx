import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface PhotoButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const PhotoButton: React.FC<PhotoButtonProps> = memo(({ onPress, disabled }) => {
  return (
    <TouchableOpacity style={[styles.button, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.icon}>📷</Text>
    </TouchableOpacity>
  );
});

PhotoButton.displayName = 'PhotoButton';

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  icon: {
    fontSize: 28,
  },
});

export default PhotoButton;


