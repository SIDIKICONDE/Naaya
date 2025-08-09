import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AUDIO_BITRATE_PRESETS,
  CONTAINER_OPTIONS,
  FILE_PREFIX_OPTIONS,
  ORIENTATION_OPTIONS,
  RESOLUTIONS,
  STABILIZATION_OPTIONS,
  SUPPORTED_CODECS,
  VIDEO_BITRATE_PRESETS,
} from './advanced/constants';
import type { AdvancedRecordingOptions } from './types';

interface AdvancedControlsProps {
  value: AdvancedRecordingOptions;
  onChange: (value: AdvancedRecordingOptions) => void;
  onApply?: () => void;
}

const Row: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.row, style]}>{children}</View>
);

const Pill: React.FC<{ selected?: boolean; onPress: () => void; children: React.ReactNode }>
  = ({ selected, onPress, children }) => (
  <TouchableOpacity style={[styles.pill, selected && styles.pillSelected]} onPress={onPress}>
    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{children}</Text>
  </TouchableOpacity>
);

export const AdvancedControls: React.FC<AdvancedControlsProps> = memo(({ value, onChange, onApply }) => {
  const set = useCallback((patch: Partial<AdvancedRecordingOptions>) => onChange({ ...value, ...patch }), [value, onChange]);

  const supportedCodecs = SUPPORTED_CODECS;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contrôles avancés</Text>
      
      <Row style={styles.section}>
        <Text style={styles.label}>Audio</Text>
        <Pill selected={value.recordAudio} onPress={() => set({ recordAudio: true })}>On</Pill>
        <Pill selected={!value.recordAudio} onPress={() => set({ recordAudio: false })}>Off</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Conteneur</Text>
        {CONTAINER_OPTIONS.map(opt => (
          <Pill key={opt.value} selected={value.container === opt.value} onPress={() => set({ container: opt.value })}>{opt.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Codec</Text>
        {supportedCodecs.map((c) => (
          <Pill key={c.value} selected={value.codec === c.value} onPress={() => set({ codec: c.value })}>{c.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Vidéo bitrate</Text>
        {VIDEO_BITRATE_PRESETS.map(opt => (
          <Pill key={String(opt.value)} selected={(value as any).videoBitrate === opt.value} onPress={() => set({ videoBitrate: opt.value } as any)}>{opt.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Audio bitrate</Text>
        {AUDIO_BITRATE_PRESETS.map(opt => (
          <Pill key={String(opt.value)} selected={(value as any).audioBitrate === opt.value} onPress={() => set({ audioBitrate: opt.value } as any)}>{opt.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Orientation</Text>
        {ORIENTATION_OPTIONS.map(opt => (
          <Pill key={opt.value} selected={value.orientation === opt.value} onPress={() => set({ orientation: opt.value })}>{opt.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Stabilisation</Text>
        {STABILIZATION_OPTIONS.map(opt => (
          <Pill key={opt.value} selected={value.stabilization === opt.value} onPress={() => set({ stabilization: opt.value })}>{opt.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Résolution</Text>
        {RESOLUTIONS.map(r => (
          <Pill key={r.label} selected={value.width === r.width && value.height === r.height} onPress={() => set({ width: r.width, height: r.height })}>{r.label}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>FPS</Text>
        <Pill selected={value.fps === 24} onPress={() => set({ fps: 24 })}>24</Pill>
        <Pill selected={value.fps === 30} onPress={() => set({ fps: 30 })}>30</Pill>
        <Pill selected={value.fps === 60} onPress={() => set({ fps: 60 })}>60</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Verrouillages</Text>
        <Pill selected={!!value.lockAE} onPress={() => set({ lockAE: !value.lockAE })}>AE</Pill>
        <Pill selected={!!value.lockAWB} onPress={() => set({ lockAWB: !value.lockAWB })}>AWB</Pill>
        <Pill selected={!!value.lockAF} onPress={() => set({ lockAF: !value.lockAF })}>AF</Pill>
      </Row>



      <Row style={styles.section}>
        <Text style={styles.label}>Préfixe</Text>
        {FILE_PREFIX_OPTIONS.map(opt => (
          <Pill key={opt.value} selected={value.fileNamePrefix === opt.value} onPress={() => set({ fileNamePrefix: opt.value })}>{opt.label}</Pill>
        ))}
      </Row>

      <TouchableOpacity style={styles.apply} onPress={onApply}>
        <Text style={styles.applyText}>Appliquer</Text>
      </TouchableOpacity>
    </View>
  );
});

AdvancedControls.displayName = 'AdvancedControls';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.94)',
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    marginTop: 12,
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  label: {
    color: '#AAA',
    width: 98,
    fontSize: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pillSelected: {
    backgroundColor: '#007AFF',
  },
  pillText: {
    color: '#EEE',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#FFF',
  },
  apply: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#00C853',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AdvancedControls;


