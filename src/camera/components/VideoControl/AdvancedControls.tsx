import React, { memo, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const supportedCodecs = useMemo(() => {
    if (Platform.OS === 'ios') return ['hevc', 'h264'] as const;
    return ['h264', 'hevc'] as const; // Android favorise h264 mais hevc possible
  }, []);

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
        <Pill selected={value.container === 'mp4'} onPress={() => set({ container: 'mp4' })}>MP4</Pill>
        <Pill selected={value.container === 'mov'} onPress={() => set({ container: 'mov' })}>MOV</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Codec</Text>
        {supportedCodecs.map((c) => (
          <Pill key={c} selected={value.codec === c} onPress={() => set({ codec: c })}>{c.toUpperCase()}</Pill>
        ))}
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Vidéo bitrate</Text>
        <Pill selected={!value || !(value as any).videoBitrate} onPress={() => set({ videoBitrate: undefined } as any)}>Auto</Pill>
        <Pill selected={(value as any).videoBitrate === 8_000_000} onPress={() => set({ videoBitrate: 8_000_000 } as any)}>8 Mbps</Pill>
        <Pill selected={(value as any).videoBitrate === 12_000_000} onPress={() => set({ videoBitrate: 12_000_000 } as any)}>12 Mbps</Pill>
        <Pill selected={(value as any).videoBitrate === 20_000_000} onPress={() => set({ videoBitrate: 20_000_000 } as any)}>20 Mbps</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Audio bitrate</Text>
        <Pill selected={!value || !(value as any).audioBitrate} onPress={() => set({ audioBitrate: undefined } as any)}>Auto</Pill>
        <Pill selected={(value as any).audioBitrate === 96_000} onPress={() => set({ audioBitrate: 96_000 } as any)}>96 kbps</Pill>
        <Pill selected={(value as any).audioBitrate === 128_000} onPress={() => set({ audioBitrate: 128_000 } as any)}>128 kbps</Pill>
        <Pill selected={(value as any).audioBitrate === 192_000} onPress={() => set({ audioBitrate: 192_000 } as any)}>192 kbps</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Orientation</Text>
        <Pill selected={value.orientation === 'auto'} onPress={() => set({ orientation: 'auto' })}>Auto</Pill>
        <Pill selected={value.orientation === 'portrait'} onPress={() => set({ orientation: 'portrait' })}>Portrait</Pill>
        <Pill selected={value.orientation === 'landscapeLeft'} onPress={() => set({ orientation: 'landscapeLeft' })}>Paysage G</Pill>
        <Pill selected={value.orientation === 'landscapeRight'} onPress={() => set({ orientation: 'landscapeRight' })}>Paysage D</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Stabilisation</Text>
        <Pill selected={value.stabilization === 'off'} onPress={() => set({ stabilization: 'off' })}>Off</Pill>
        <Pill selected={value.stabilization === 'standard'} onPress={() => set({ stabilization: 'standard' })}>Standard</Pill>
        <Pill selected={value.stabilization === 'cinematic'} onPress={() => set({ stabilization: 'cinematic' })}>Cinématique</Pill>
        <Pill selected={value.stabilization === 'auto'} onPress={() => set({ stabilization: 'auto' })}>Auto</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Résolution</Text>
        <Pill selected={value.width === 1920 && value.height === 1080} onPress={() => set({ width: 1920, height: 1080 })}>1080p</Pill>
        <Pill selected={value.width === 1280 && value.height === 720} onPress={() => set({ width: 1280, height: 720 })}>720p</Pill>
        <Pill selected={value.width === 3840 && value.height === 2160} onPress={() => set({ width: 3840, height: 2160 })}>4K</Pill>
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
        <Text style={styles.label}>Dossier</Text>
        <Pill selected={!value.saveDirectory} onPress={() => set({ saveDirectory: undefined })}>Défaut</Pill>
        <Pill selected={value.saveDirectory === '/storage/emulated/0/Naaya/videos'} onPress={() => set({ saveDirectory: '/storage/emulated/0/Naaya/videos' })}>Public</Pill>
      </Row>

      <Row style={styles.section}>
        <Text style={styles.label}>Préfixe</Text>
        <Pill selected={!value.fileNamePrefix || value.fileNamePrefix === 'video'} onPress={() => set({ fileNamePrefix: 'video' })}>video</Pill>
        <Pill selected={value.fileNamePrefix === 'clip'} onPress={() => set({ fileNamePrefix: 'clip' })}>clip</Pill>
        <Pill selected={value.fileNamePrefix === 'rec'} onPress={() => set({ fileNamePrefix: 'rec' })}>rec</Pill>
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


