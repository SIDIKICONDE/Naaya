import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { TINT_PRESETS } from '@teleprompter/constants';

export interface ColorPickerModalProps {
  visible: boolean;
  initialHex: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-fA-F]{6})$/.test(normalized)) return null;
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = memo(({ visible, initialHex, onChange, onClose }) => {
  const initialRgb = useMemo(() => hexToRgb(initialHex) ?? { r: 255, g: 255, b: 255 }, [initialHex]);
  const [r, setR] = useState<number>(initialRgb.r);
  const [g, setG] = useState<number>(initialRgb.g);
  const [b, setB] = useState<number>(initialRgb.b);
  const [hexInput, setHexInput] = useState<string>(initialHex.toUpperCase());

  useEffect(() => {
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
  }, [r, g, b]);

  useEffect(() => {
    if (!visible) return;
    const parsed = hexToRgb(initialHex);
    if (parsed) {
      setR(parsed.r); setG(parsed.g); setB(parsed.b);
      setHexInput(initialHex.toUpperCase());
    }
  }, [visible, initialHex]);

  const handleHexSubmit = useCallback(() => {
    const parsed = hexToRgb(hexInput);
    if (parsed) {
      setR(parsed.r); setG(parsed.g); setB(parsed.b);
    } else {
      setHexInput(rgbToHex(r, g, b));
    }
  }, [hexInput, r, g, b]);

  const handlePreset = useCallback((hex: string) => {
    const parsed = hexToRgb(hex);
    if (parsed) {
      setR(parsed.r); setG(parsed.g); setB(parsed.b);
      setHexInput(hex.toUpperCase());
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onChange(rgbToHex(r, g, b));
    onClose();
  }, [r, g, b, onChange, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sélecteur de couleur</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewRow}>
          <View style={[styles.preview, { backgroundColor: rgbToHex(r, g, b) }]} />
          <TextInput
            style={styles.hexInput}
            value={hexInput}
            onChangeText={setHexInput}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            onEndEditing={handleHexSubmit}
          />
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.label}>Rouge: {Math.round(r)}</Text>
          <Slider minimumValue={0} maximumValue={255} step={1} value={r} onValueChange={setR}
                  minimumTrackTintColor="#FF3B30" maximumTrackTintColor="#cccccc" thumbTintColor="#FF3B30" />

          <Text style={styles.label}>Vert: {Math.round(g)}</Text>
          <Slider minimumValue={0} maximumValue={255} step={1} value={g} onValueChange={setG}
                  minimumTrackTintColor="#34C759" maximumTrackTintColor="#cccccc" thumbTintColor="#34C759" />

          <Text style={styles.label}>Bleu: {Math.round(b)}</Text>
          <Slider minimumValue={0} maximumValue={255} step={1} value={b} onValueChange={setB}
                  minimumTrackTintColor="#007AFF" maximumTrackTintColor="#cccccc" thumbTintColor="#007AFF" />
        </View>

        <View style={styles.swatches}>
          {TINT_PRESETS.map((hex) => (
            <TouchableOpacity key={hex} style={[styles.swatch, { backgroundColor: hex }]}
                              onPress={() => handlePreset(hex)} />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
            <Text style={styles.buttonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.confirm]} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

ColorPickerModal.displayName = 'ColorPickerModal';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  close: { color: '#bbb', fontSize: 22 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  preview: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  hexInput: { flex: 1, height: 44, borderRadius: 8, backgroundColor: '#1C1C1E', paddingHorizontal: 12, color: '#fff' },
  sliderGroup: { paddingHorizontal: 16, gap: 6 },
  label: { color: '#fff', marginTop: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancel: { backgroundColor: '#333' },
  confirm: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default ColorPickerModal;


