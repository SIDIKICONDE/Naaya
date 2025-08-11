import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NumberLineControl from './slider';
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.headerTitle}>Réglages avancés</Text>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>HSL par canal</Text>
            {channels.map((c) => (
              <View key={c} style={styles.channelBlock}>
                <Text style={styles.channelTitle}>{c.toUpperCase()}</Text>

                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Teinte</Text>
                    <Text style={styles.controlValue}>{Math.round(hslHue[c])}</Text>
                  </View>
                  <NumberLineControl
                    value={hslHue[c]}
                    onValueChange={(v: number) => {
                      console.log(`[AdvancedAdjustments] HSL Hue ${c}:`, v);
                      setHslHue((prev) => ({ ...prev, [c]: v }));
                    }}
                    onSlidingComplete={(v: number) => {
                      console.log(`[AdvancedAdjustments] HSL Hue ${c} Complete:`, v);
                      setHslHue((prev) => ({ ...prev, [c]: v }));
                    }}
                    min={-100}
                    max={100}
                    step={1}
                    width={320}
                    color="#9B59B6"
                  />
                </View>

                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Saturation</Text>
                    <Text style={styles.controlValue}>{Math.round(hslSaturation[c])}</Text>
                  </View>
                  <NumberLineControl
                    value={hslSaturation[c]}
                    onValueChange={(v: number) => setHslSaturation((prev) => ({ ...prev, [c]: v }))}
                    onSlidingComplete={(v: number) => setHslSaturation((prev) => ({ ...prev, [c]: v }))}
                    min={-100}
                    max={100}
                    step={1}
                    width={320}
                    color="#2ECC71"
                  />
                </View>

                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Luminance</Text>
                    <Text style={styles.controlValue}>{Math.round(hslLuminance[c])}</Text>
                  </View>
                  <NumberLineControl
                    value={hslLuminance[c]}
                    onValueChange={(v: number) => setHslLuminance((prev) => ({ ...prev, [c]: v }))}
                    onSlidingComplete={(v: number) => setHslLuminance((prev) => ({ ...prev, [c]: v }))}
                    min={-100}
                    max={100}
                    step={1}
                    width={320}
                    color="#F1C40F"
                  />
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>ToneCurve</Text>
            <View style={styles.toneCurveBlock}>
              <View style={styles.controlGroup}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>Point 2 (Y)</Text>
                  <Text style={styles.controlValue}>{Math.round(tcMid1)}</Text>
                </View>
                <NumberLineControl
                  value={tcMid1}
                  onValueChange={setTcMid1}
                  onSlidingComplete={setTcMid1}
                  min={0}
                  max={255}
                  step={1}
                  width={360}
                  color="#3498DB"
                />
              </View>
              <View style={styles.controlGroup}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>Point 3 (Y)</Text>
                  <Text style={styles.controlValue}>{Math.round(tcMid2)}</Text>
                </View>
                <NumberLineControl
                  value={tcMid2}
                  onValueChange={setTcMid2}
                  onSlidingComplete={setTcMid2}
                  min={0}
                  max={255}
                  step={1}
                  width={360}
                  color="#3498DB"
                />
              </View>
              <View style={styles.controlGroup}>
                <View style={styles.controlHeader}>
                  <Text style={styles.controlLabel}>Point 4 (Y)</Text>
                  <Text style={styles.controlValue}>{Math.round(tcMid3)}</Text>
                </View>
                <NumberLineControl
                  value={tcMid3}
                  onValueChange={setTcMid3}
                  onSlidingComplete={setTcMid3}
                  min={0}
                  max={255}
                  step={1}
                  width={360}
                  color="#3498DB"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Split Toning</Text>
            <View style={styles.splitToningBlock}>
              <View style={styles.splitSection}>
                <Text style={styles.splitSectionTitle}>Ombres</Text>
                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Teinte (Hue)</Text>
                    <Text style={styles.controlValue}>{Math.round(stShadowHue)}°</Text>
                  </View>
                  <NumberLineControl
                    value={stShadowHue}
                    onValueChange={setStShadowHue}
                    onSlidingComplete={setStShadowHue}
                    min={0}
                    max={360}
                    step={1}
                    width={320}
                    color="#9B59B6"
                  />
                </View>
                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Saturation</Text>
                    <Text style={styles.controlValue}>{Math.round(stShadowSat)}%</Text>
                  </View>
                  <NumberLineControl
                    value={stShadowSat}
                    onValueChange={setStShadowSat}
                    onSlidingComplete={setStShadowSat}
                    min={0}
                    max={100}
                    step={1}
                    width={320}
                    color="#2ECC71"
                  />
                </View>
              </View>

              <View style={styles.splitSection}>
                <Text style={styles.splitSectionTitle}>Hautes lumières</Text>
                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Teinte (Hue)</Text>
                    <Text style={styles.controlValue}>{Math.round(stHighlightHue)}°</Text>
                  </View>
                  <NumberLineControl
                    value={stHighlightHue}
                    onValueChange={setStHighlightHue}
                    onSlidingComplete={setStHighlightHue}
                    min={0}
                    max={360}
                    step={1}
                    width={320}
                    color="#9B59B6"
                  />
                </View>
                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Saturation</Text>
                    <Text style={styles.controlValue}>{Math.round(stHighlightSat)}%</Text>
                  </View>
                  <NumberLineControl
                    value={stHighlightSat}
                    onValueChange={setStHighlightSat}
                    onSlidingComplete={setStHighlightSat}
                    min={0}
                    max={100}
                    step={1}
                    width={320}
                    color="#2ECC71"
                  />
                </View>
              </View>

              <View style={styles.balanceSection}>
                <Text style={styles.splitSectionTitle}>Balance</Text>
                <View style={styles.controlGroup}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Ombres ↔ Hautes lumières</Text>
                    <Text style={styles.controlValue}>{Math.round(stBalance)}</Text>
                  </View>
                  <NumberLineControl
                    value={stBalance}
                    onValueChange={setStBalance}
                    onSlidingComplete={setStBalance}
                    min={-100}
                    max={100}
                    step={1}
                    width={360}
                    color="#F39C12"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.actionButton, styles.cancel]} onPress={onClose}>
              <Text style={styles.actionText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.apply]}
              onPress={async () => {
                const xmp = buildXmpLike;
                const lutPath = await buildAndSaveLUTCubeFromXMP(xmp, 33);
                await onApplyLUT(lutPath);
                onClose();
              }}
            >
              <Text style={styles.actionText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    backgroundColor: 'rgba(20, 20, 30, 0.98)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 18,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  content: {
    paddingBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  channelBlock: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  channelTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  controlGroup: {
    marginBottom: 10,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  controlLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  controlValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  toneCurveBlock: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  splitToningBlock: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  splitSection: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  splitSectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  balanceSection: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(243, 156, 18, 0.08)',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  apply: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AdvancedAdjustmentsModal;


