/**
 * Contrôles Avancés Redesignés - Interface Moderne
 * Design épuré avec sections organisées et animations fluides
 */

import React, { memo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AUDIO_BITRATE_PRESETS,
  CONTAINER_OPTIONS,
  FILE_PREFIX_OPTIONS,
  ORIENTATION_OPTIONS,
  RESOLUTIONS,
  SAVE_DIRECTORIES,
  STABILIZATION_OPTIONS,
  SUPPORTED_CODECS,
  VIDEO_BITRATE_PRESETS,
} from './advanced/constants';
import type { AdvancedRecordingOptions } from './types';

interface ModernAdvancedControlsProps {
  value: AdvancedRecordingOptions;
  onChange: (value: AdvancedRecordingOptions) => void;
  onApply?: () => void;
  onClose?: () => void;
}

// const { width: screenWidth } = Dimensions.get('window');

// Composants modernes
const ModernToggle: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.toggleContainer}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </TouchableOpacity>
  </View>
);

const ModernSelector: React.FC<{
  label: string;
  options: readonly { label: string; value: any }[];
  value: any;
  onChange: (value: any) => void;
}> = ({ label, options, value, onChange }) => (
  <View style={styles.selectorContainer}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <View style={styles.optionsRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={(typeof option.value === 'string' || typeof option.value === 'number') ? String(option.value) : String(option.label)}
          style={[
            styles.modernOption,
            value === option.value && styles.modernOptionActive
          ]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.modernOptionText,
            value === option.value && styles.modernOptionTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const ModernSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

export const ModernAdvancedControls: React.FC<ModernAdvancedControlsProps> = memo(({
  value,
  onChange,
  onApply,
  onClose
}) => {
  // const [activeSection, setActiveSection] = useState<string | null>(null);

  const set = useCallback(
    (patch: Partial<AdvancedRecordingOptions>) => 
      onChange({ ...value, ...patch }),
    [value, onChange]
  );

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleApply = useCallback(() => {
    onApply?.();
  }, [onApply]);

  return (
    <View style={styles.container}>
      {/* Header moderne */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres Avancés</Text>
        <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
          <Text style={styles.applyText}>Appliquer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Audio */}
        <ModernSection title="Audio" icon="🎵">
          <ModernToggle
            label="Enregistrer l'audio"
            value={value.recordAudio}
            onChange={(recordAudio) => set({ recordAudio })}
          />
          
          <ModernSelector
            label="Qualité Audio"
            options={AUDIO_BITRATE_PRESETS}
            value={value.audioBitrate}
            onChange={(audioBitrate) => set({ audioBitrate })}
          />
        </ModernSection>

        {/* Section Vidéo */}
        <ModernSection title="Vidéo" icon="🎬">
          <View style={styles.compactRow}>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="Résolution"
                options={RESOLUTIONS.map(r => ({ label: r.label, value: r }))}
                value={RESOLUTIONS.find(r => r.width === value.width && r.height === value.height)}
                onChange={(resolution) => set({ 
                  width: resolution.width, 
                  height: resolution.height 
                })}
              />
            </View>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="FPS"
                options={[
                  { label: '24', value: 24 },
                  { label: '30', value: 30 },
                  { label: '60', value: 60 }
                ]}
                value={value.fps}
                onChange={(fps) => set({ fps })}
              />
            </View>
          </View>

          <ModernSelector
            label="Qualité Vidéo"
            options={VIDEO_BITRATE_PRESETS}
            value={value.videoBitrate}
            onChange={(videoBitrate) => set({ videoBitrate })}
          />
        </ModernSection>

        {/* Section Format & Orientation */}
        <ModernSection title="Format & Orientation" icon="📦">
          <View style={styles.compactRow}>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="Conteneur"
                options={CONTAINER_OPTIONS}
                value={value.container}
                onChange={(container) => set({ container })}
              />
            </View>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="Codec"
                options={SUPPORTED_CODECS}
                value={value.codec}
                onChange={(codec) => set({ codec })}
              />
            </View>
          </View>

          <View style={styles.compactRow}>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="Orientation"
                options={ORIENTATION_OPTIONS.map(opt => ({
                  ...opt,
                  label: opt.label.length > 8 ? opt.label.substring(0, 6) + '…' : opt.label
                }))}
                value={value.orientation}
                onChange={(orientation) => set({ orientation })}
              />
            </View>
            <View style={styles.compactHalf}>
              <ModernSelector
                label="Stabilisation"
                options={STABILIZATION_OPTIONS.map(opt => ({
                  ...opt,
                  label: opt.label.length > 8 ? opt.label.substring(0, 6) + '…' : opt.label
                }))}
                value={value.stabilization}
                onChange={(stabilization) => set({ stabilization })}
              />
            </View>
          </View>
        </ModernSection>

        {/* Section Verrouillages */}
        <ModernSection title="Verrouillages Caméra" icon="🔒">
          <View style={styles.lockContainer}>
            <ModernToggle
              label="Exposition (AE)"
              value={!!value.lockAE}
              onChange={(lockAE) => set({ lockAE })}
            />
            <ModernToggle
              label="Balance Blancs (AWB)"
              value={!!value.lockAWB}
              onChange={(lockAWB) => set({ lockAWB })}
            />
            <ModernToggle
              label="Mise au Point (AF)"
              value={!!value.lockAF}
              onChange={(lockAF) => set({ lockAF })}
            />
          </View>
        </ModernSection>

        {/* Section Sauvegarde */}
        <ModernSection title="Sauvegarde" icon="💾">
          <ModernSelector
            label="Dossier de destination"
            options={SAVE_DIRECTORIES}
            value={value.saveDirectory}
            onChange={(saveDirectory) => set({ saveDirectory })}
          />

          <ModernSelector
            label="Préfixe des fichiers"
            options={FILE_PREFIX_OPTIONS}
            value={value.fileNamePrefix}
            onChange={(fileNamePrefix) => set({ fileNamePrefix })}
          />
        </ModernSection>

      </ScrollView>
    </View>
  );
});

ModernAdvancedControls.displayName = 'ModernAdvancedControls';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectorContainer: {
    marginBottom: 14,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modernOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 70,
    alignItems: 'center',
  },
  modernOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    transform: [{ scale: 1.02 }],
  },
  modernOptionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  modernOptionTextActive: {
    opacity: 1,
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: 0,
  },
  toggleThumbActive: {
    marginLeft: 20,
  },
  lockContainer: {
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  compactHalf: {
    flex: 1,
  },
});

export default ModernAdvancedControls;
