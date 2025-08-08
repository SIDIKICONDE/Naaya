import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Pressable, Animated, Easing, PanResponder, PanResponderInstance, Vibration, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { TINT_PRESETS } from '@teleprompter/constants';

export interface ColorPickerPopoverProps {
  visible: boolean;
  initialHex: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  onOpenRequest?: () => void;
  showOpenHandle?: boolean;
  hapticEnabled?: boolean;
  hapticDurationMs?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^([0-9a-fA-F]{6})$/.test(normalized)) return null;
  const num = parseInt(normalized, 16);
  const r = Math.floor(num / 0x10000) % 0x100;
  const g = Math.floor(num / 0x100) % 0x100;
  const b = num % 0x100;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = memo(({ visible, initialHex, onChange, onClose, onOpenRequest, showOpenHandle = true, hapticEnabled = true, hapticDurationMs = 12 }) => {
  const initialRgb = useMemo(() => hexToRgb(initialHex) ?? { r: 255, g: 255, b: 255 }, [initialHex]);
  const [r, setR] = useState<number>(initialRgb.r);
  const [g, setG] = useState<number>(initialRgb.g);
  const [b, setB] = useState<number>(initialRgb.b);
  const [hexInput, setHexInput] = useState<string>(initialHex.toUpperCase());
  const [render, setRender] = useState<boolean>(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const panRef = useRef<PanResponderInstance | null>(null);
  const openPanRef = useRef<PanResponderInstance | null>(null);
  const [sheetHeight, setSheetHeight] = useState<number>(300);
  const closeHapticFiredRef = useRef<boolean>(false);
  const openHapticFiredRef = useRef<boolean>(false);

  const triggerHaptic = useCallback(() => {
    if (!hapticEnabled) return;
    // Haptique léger via Vibration (fallback RN sans dépendance externe)
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Vibration.vibrate(Math.max(0, Math.min(50, Math.round(hapticDurationMs))));
    }
  }, [hapticEnabled, hapticDurationMs]);

  useEffect(() => {
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
  }, [r, g, b]);

  useEffect(() => {
    if (visible) {
      setRender(true);
      const parsed = hexToRgb(initialHex);
      if (parsed) {
        setR(parsed.r); setG(parsed.g); setB(parsed.b);
        setHexInput(initialHex.toUpperCase());
      }
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRender(false);
      });
    }
  }, [visible, initialHex, anim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(dragY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setRender(false);
      onClose();
    });
  }, [anim, dragY, onClose]);

  if (!panRef.current) {
    panRef.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        dragY.setValue(0);
        closeHapticFiredRef.current = false;
      },
      onPanResponderMove: (_evt, gesture) => {
        const dy = gesture.dy;
        dragY.setValue(dy > 0 ? dy : 0);
        const dynamicThreshold = Math.max(96, Math.min(200, sheetHeight * 0.2));
        if (dy > dynamicThreshold && !closeHapticFiredRef.current) {
          triggerHaptic();
          closeHapticFiredRef.current = true;
        } else if (dy <= dynamicThreshold && closeHapticFiredRef.current) {
          closeHapticFiredRef.current = false;
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        const dynamicThreshold = Math.max(96, Math.min(200, sheetHeight * 0.2));
        const shouldClose = gesture.dy > dynamicThreshold || gesture.vy > 1.2;
        if (shouldClose) {
          handleClose();
        } else {
          Animated.timing(dragY, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        }
      },
    });
  }

  if (!openPanRef.current) {
    openPanRef.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        openHapticFiredRef.current = false;
      },
      onPanResponderMove: (_evt, gesture) => {
        const openThreshold = -40;
        if (gesture.dy < openThreshold && !openHapticFiredRef.current) {
          triggerHaptic();
          openHapticFiredRef.current = true;
        } else if (gesture.dy >= openThreshold && openHapticFiredRef.current) {
          openHapticFiredRef.current = false;
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        const openThreshold = -40;
        if (gesture.dy < openThreshold || gesture.vy < -1.1) {
          onOpenRequest?.();
        }
      },
    });
  }

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

  if (!render) {
    if (showOpenHandle) {
      return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
          <View style={styles.handleWrapper} {...(openPanRef.current?.panHandlers ?? {})}>
            <View style={styles.handle} />
          </View>
        </View>
      );
    }
    return null;
  }

  const baseTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const sheetTranslateY = Animated.add(baseTranslateY, dragY);

  return (
    <Animated.View style={[styles.backdrop, { opacity: anim }] }>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      <Animated.View style={[
        styles.sheet,
        { transform: [{ translateY: sheetTranslateY }] },
      ]} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        <View style={styles.handleWrapper} {...(panRef.current?.panHandlers ?? {})}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Sélecteur de couleur</Text>
          <TouchableOpacity onPress={handleClose}>
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
      </Animated.View>
    </Animated.View>
  );
});

ColorPickerPopover.displayName = 'ColorPickerPopover';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#0B0B0C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#222',
    paddingBottom: 20,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
  cancel: { backgroundColor: '#333' },
  confirm: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default ColorPickerPopover;


