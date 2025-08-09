import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { RecordingState } from './types';

interface RecordButtonProps {
  state: RecordingState;
  onPress: () => void;
  disabled?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = memo(({ state, onPress, disabled }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={disabled}>
      <View style={[styles.button, state === 'recording' && styles.buttonRecording, state === 'processing' && styles.buttonProcessing]}>
        {state === 'processing' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={[styles.inner, state === 'recording' && styles.innerRecording]} />
        )}
      </View>
    </TouchableOpacity>
  );
});

RecordButton.displayName = 'RecordButton';

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  buttonRecording: {
    backgroundColor: '#FF0000',
  },
  buttonProcessing: {
    backgroundColor: '#666666',
  },
  inner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
  },
  innerRecording: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});

export default RecordButton;


