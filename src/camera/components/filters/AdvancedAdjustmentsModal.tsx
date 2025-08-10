import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomSlider from '../../../ui/CustomSlider';
import { buildAndSaveLUTCubeFromXMP } from './utils/xmp';

export type HSLChannel = 'red'|'orange'|'yellow'|'green'|'aqua'|'blue'|'purple'|'magenta';

export interface AdvancedAdjustmentsModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyLUT: (lutPath: string) => Promise<void>;
}

export const AdvancedAdjustmentsModal: React.FC<AdvancedAdjustmentsModalProps> = ({ visible, onClose, onApplyLUT }) => {
  // HSL par canal (stabilisé via useMemo pour éviter de changer à chaque rendu)
  const channels = useMemo<HSLChannel[]>(
    () => ['red','orange','yellow','green','aqua','blue','purple','magenta'],
    []
  );
  const [hslSaturation, setHslSaturation] = useState<Record<HSLChannel, number>>({
    red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0,
  });
  const [hslHue, setHslHue] = useState<Record<HSLChannel, number>>({
    red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0,
  });
  const [hslLuminance, setHslLuminance] = useState<Record<HSLChannel, number>>({
    red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0,
  });

  // ToneCurve: 5 points (x fixes: 0, 64, 128, 192, 255); on édite Y des 3 points centraux
  const [tcMid1, setTcMid1] = useState(64);
  const [tcMid2, setTcMid2] = useState(128);
  const [tcMid3, setTcMid3] = useState(192);

  // Split Toning
  const [stShadowHue, setStShadowHue] = useState(0);
  const [stShadowSat, setStShadowSat] = useState(0);
  const [stHighlightHue, setStHighlightHue] = useState(0);
  const [stHighlightSat, setStHighlightSat] = useState(0);
  const [stBalance, setStBalance] = useState(0);

  const buildXmpLike = useMemo(() => {
    // Construit un faux XMP minimal sous forme de string contenant nos valeurs
    // pour réutiliser le pipeline buildCubeFromXMP existant.
    const lines: string[] = [];
    lines.push('<x:xmpmeta>');
    // HSL
    channels.forEach((c) => {
      const C = c.charAt(0).toUpperCase() + c.slice(1);
      lines.push(`<crs:HueAdjustment${C}>${hslHue[c]}</crs:HueAdjustment${C}>`);
      lines.push(`<crs:SaturationAdjustment${C}>${hslSaturation[c]}</crs:SaturationAdjustment${C}>`);
      lines.push(`<crs:LuminanceAdjustment${C}>${hslLuminance[c]}</crs:LuminanceAdjustment${C}>`);
    });
    // ToneCurve PV2012 (points: 0,0  64,tcMid1  128,tcMid2  192,tcMid3  255,255)
    lines.push(`<crs:ToneCurvePV2012>0,0 ${64},${Math.round(tcMid1)} ${128},${Math.round(tcMid2)} ${192},${Math.round(tcMid3)} 255,255</crs:ToneCurvePV2012>`);
    // Split Toning
    lines.push(`<crs:SplitToningShadowHue>${Math.round(stShadowHue)}</crs:SplitToningShadowHue>`);
    lines.push(`<crs:SplitToningShadowSaturation>${Math.round(stShadowSat)}</crs:SplitToningShadowSaturation>`);
    lines.push(`<crs:SplitToningHighlightHue>${Math.round(stHighlightHue)}</crs:SplitToningHighlightHue>`);
    lines.push(`<crs:SplitToningHighlightSaturation>${Math.round(stHighlightSat)}</crs:SplitToningHighlightSaturation>`);
    lines.push(`<crs:SplitToningBalance>${Math.round(stBalance)}</crs:SplitToningBalance>`);
    lines.push('</x:xmpmeta>');
    return lines.join('\n');
  }, [channels, hslHue, hslSaturation, hslLuminance, tcMid1, tcMid2, tcMid3, stShadowHue, stShadowSat, stHighlightHue, stHighlightSat, stBalance]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Réglages avancés (HSL / ToneCurve / Split Toning)</Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.sectionTitle}>HSL par canal</Text>
            {channels.map((c) => (
              <View key={c} style={styles.channelBlock}>
                <Text style={styles.channelTitle}>{c.toUpperCase()}</Text>
                <View style={styles.sliderGroup}>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Teinte</Text>
                    <CustomSlider
                      value={hslHue[c]}
                      onValueChange={(v) => setHslHue((s) => ({ ...s, [c]: Math.round(v) }))}
                      minimumValue={-100}
                      maximumValue={100}
                      width={200}
                      trackHeight={4}
                      thumbSize={18}
                      activeTrackColor="#9B59B6"
                      inactiveTrackColor="rgba(255,255,255,0.2)"
                      thumbColor="#FFF"
                      accentColor="#9B59B6"
                      showValue
                      valueFormatter={(v) => `${Math.round(v)}`}
                    />
                  </View>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Saturation</Text>
                    <CustomSlider
                      value={hslSaturation[c]}
                      onValueChange={(v) => setHslSaturation((s) => ({ ...s, [c]: Math.round(v) }))}
                      minimumValue={-100}
                      maximumValue={100}
                      width={200}
                      trackHeight={4}
                      thumbSize={18}
                      activeTrackColor="#2ECC71"
                      inactiveTrackColor="rgba(255,255,255,0.2)"
                      thumbColor="#FFF"
                      accentColor="#2ECC71"
                      showValue
                      valueFormatter={(v) => `${Math.round(v)}`}
                    />
                  </View>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Luminance</Text>
                    <CustomSlider
                      value={hslLuminance[c]}
                      onValueChange={(v) => setHslLuminance((s) => ({ ...s, [c]: Math.round(v) }))}
                      minimumValue={-100}
                      maximumValue={100}
                      width={200}
                      trackHeight={4}
                      thumbSize={18}
                      activeTrackColor="#F1C40F"
                      inactiveTrackColor="rgba(255,255,255,0.2)"
                      thumbColor="#FFF"
                      accentColor="#F1C40F"
                      showValue
                      valueFormatter={(v) => `${Math.round(v)}`}
                    />
                  </View>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>ToneCurve</Text>
            <CustomSlider value={tcMid1} onValueChange={setTcMid1} minimumValue={0} maximumValue={255} width={320} trackHeight={3} thumbSize={16} activeTrackColor="#3498DB" inactiveTrackColor="rgba(255,255,255,0.2)" thumbColor="#FFF" accentColor="#3498DB" showValue valueFormatter={(v)=>`P2 Y ${Math.round(v)}`}/>
            <CustomSlider value={tcMid2} onValueChange={setTcMid2} minimumValue={0} maximumValue={255} width={320} trackHeight={3} thumbSize={16} activeTrackColor="#3498DB" inactiveTrackColor="rgba(255,255,255,0.2)" thumbColor="#FFF" accentColor="#3498DB" showValue valueFormatter={(v)=>`P3 Y ${Math.round(v)}`}/>
            <CustomSlider value={tcMid3} onValueChange={setTcMid3} minimumValue={0} maximumValue={255} width={320} trackHeight={3} thumbSize={16} activeTrackColor="#3498DB" inactiveTrackColor="rgba(255,255,255,0.2)" thumbColor="#FFF" accentColor="#3498DB" showValue valueFormatter={(v)=>`P4 Y ${Math.round(v)}`}/>

            <Text style={styles.sectionTitle}>Split Toning</Text>
            <View style={styles.splitToningBlock}>
              <View style={styles.splitSection}>
                <Text style={styles.splitSectionTitle}>Ombres (Shadows)</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Teinte (Hue)</Text>
                  <CustomSlider 
                    value={stShadowHue} 
                    onValueChange={setStShadowHue} 
                    minimumValue={0} 
                    maximumValue={360} 
                    width={280} 
                    trackHeight={4} 
                    thumbSize={18} 
                    activeTrackColor="#9B59B6" 
                    inactiveTrackColor="rgba(255,255,255,0.2)" 
                    thumbColor="#FFF" 
                    accentColor="#9B59B6" 
                    showValue 
                    valueFormatter={(v) => `${Math.round(v)}°`}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Saturation</Text>
                  <CustomSlider 
                    value={stShadowSat} 
                    onValueChange={setStShadowSat} 
                    minimumValue={0} 
                    maximumValue={100} 
                    width={280} 
                    trackHeight={4} 
                    thumbSize={18} 
                    activeTrackColor="#2ECC71" 
                    inactiveTrackColor="rgba(255,255,255,0.2)" 
                    thumbColor="#FFF" 
                    accentColor="#2ECC71" 
                    showValue 
                    valueFormatter={(v) => `${Math.round(v)}%`}
                  />
                </View>
              </View>
              
              <View style={styles.splitSection}>
                <Text style={styles.splitSectionTitle}>Hautes lumières (Highlights)</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Teinte (Hue)</Text>
                  <CustomSlider 
                    value={stHighlightHue} 
                    onValueChange={setStHighlightHue} 
                    minimumValue={0} 
                    maximumValue={360} 
                    width={280} 
                    trackHeight={4} 
                    thumbSize={18} 
                    activeTrackColor="#9B59B6" 
                    inactiveTrackColor="rgba(255,255,255,0.2)" 
                    thumbColor="#FFF" 
                    accentColor="#9B59B6" 
                    showValue 
                    valueFormatter={(v) => `${Math.round(v)}°`}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Saturation</Text>
                  <CustomSlider 
                    value={stHighlightSat} 
                    onValueChange={setStHighlightSat} 
                    minimumValue={0} 
                    maximumValue={100} 
                    width={280} 
                    trackHeight={4} 
                    thumbSize={18} 
                    activeTrackColor="#2ECC71" 
                    inactiveTrackColor="rgba(255,255,255,0.2)" 
                    thumbColor="#FFF" 
                    accentColor="#2ECC71" 
                    showValue 
                    valueFormatter={(v) => `${Math.round(v)}%`}
                  />
                </View>
              </View>
              
              <View style={styles.balanceSection}>
                <Text style={styles.splitSectionTitle}>Balance</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Balance Ombres ↔ Hautes lumières</Text>
                  <CustomSlider 
                    value={stBalance} 
                    onValueChange={setStBalance} 
                    minimumValue={-100} 
                    maximumValue={100} 
                    width={320} 
                    trackHeight={4} 
                    thumbSize={18} 
                    activeTrackColor="#F39C12" 
                    inactiveTrackColor="rgba(255,255,255,0.2)" 
                    thumbColor="#FFF" 
                    accentColor="#F39C12" 
                    showValue 
                    valueFormatter={(v) => `${Math.round(v)}`}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}><Text style={styles.btnText}>Annuler</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.apply]} onPress={async () => {
              const xmp = buildXmpLike;
              const lutPath = await buildAndSaveLUTCubeFromXMP(xmp, 33);
              await onApplyLUT(lutPath);
              onClose();
            }}>
              <Text style={styles.btnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 680, maxHeight: '90%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#333' },
  title: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  channelBlock: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  channelTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  sliderGroup: { gap: 8 },
  sliderContainer: { marginBottom: 6 },
  sliderLabel: { color: '#ccc', fontSize: 11, marginBottom: 4, fontWeight: '500' },
  splitToningBlock: { marginTop: 8, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  splitSection: { marginBottom: 16, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
  splitSectionTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  balanceSection: { padding: 10, backgroundColor: 'rgba(243,156,18,0.1)', borderRadius: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  cancel: { backgroundColor: '#333' },
  apply: { backgroundColor: '#007AFF' },
  btnText: { color: '#fff', fontWeight: '600' },
  scrollContainer: { paddingBottom: 12 },
});

export default AdvancedAdjustmentsModal;


