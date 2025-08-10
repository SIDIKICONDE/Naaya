/**
 * Interface de contrôle des filtres caméra
 * Intégration native avec l'engine FFmpeg Naaya
 */
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import type { AdvancedFilterParams, FilterState } from '../../../../specs/NativeCameraFiltersModule';
import CustomSlider from '../../../ui/CustomSlider';
import AdvancedAdjustmentsModal from './AdvancedAdjustmentsModal';
import { AVAILABLE_FILTERS } from './constants';
import type { FilterInfo } from './types';
import { buildAndSaveLUTCubeFromXMP, parseLightroomXMPDetailed, processXMPToFilter } from './utils/xmp';

export interface FilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  onClose?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const FilterButton: React.FC<{ filter: FilterInfo; isSelected: boolean; onPress: () => void; disabled?: boolean; }> = memo(({ filter, isSelected, onPress, disabled }) => {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  
  React.useEffect(() => {
    return () => {
      // Nettoyer les animations en cours lors du démontage
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);
  
  const handlePressIn = useCallback(() => { 
    if (animationRef.current) animationRef.current.stop();
    animationRef.current = Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animationRef.current.start(); 
  }, [scaleAnim]);
  
  const handlePressOut = useCallback(() => { 
    if (animationRef.current) animationRef.current.stop();
    animationRef.current = Animated.timing(scaleAnim, { toValue: 1, duration: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animationRef.current.start(); 
  }, [scaleAnim]);
  
  const handlePress = useCallback(() => { if (!disabled) onPress(); }, [onPress, disabled]);
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.filterButton, isSelected && styles.filterButtonSelected, { borderColor: filter.color }, isSelected && { backgroundColor: filter.color + '20' }, disabled && styles.filterButtonDisabled]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>{filter.icon}</Text>
        <Text style={[styles.filterName, isSelected && styles.filterNameSelected, disabled && styles.filterNameDisabled]}>{filter.displayName}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const FilterControls: React.FC<FilterControlsProps> = memo(({ currentFilter, onFilterChange, onClearFilter, onClose, disabled = false, compact = false }) => {
  const [localIntensity, setLocalIntensity] = useState(currentFilter?.intensity ?? 1.0);
  const [lutModalVisible, setLutModalVisible] = useState(false);
  const [lutPath, setLutPath] = useState('');
  const [pendingLUTIntensity, setPendingLUTIntensity] = useState(1.0);
  const [xmpModalVisible, setXmpModalVisible] = useState(false);
  const [xmpText, setXmpText] = useState('');
  const [advancedVisible, setAdvancedVisible] = useState(false);

  const xmpPreview = useMemo(() => {
    const src = xmpText.trim();
    if (!src) return null;
    try {
      return parseLightroomXMPDetailed(src);
    } catch {
      return null;
    }
  }, [xmpText]);
  
  const selectedFilter = useMemo(() => { 
    console.log('[FilterControls] currentFilter:', currentFilter);
    if (!currentFilter) {
      console.log('[FilterControls] Pas de filtre actuel, retour AVAILABLE_FILTERS[0]:', AVAILABLE_FILTERS[0]);
      return AVAILABLE_FILTERS[0];
    }
    // Mapper les noms dynamiques (ex: 'lut3d:/abs/path.cube?interp=...') vers leur base ('lut3d')
    const baseName = currentFilter.name.startsWith('lut3d:') ? 'lut3d' : currentFilter.name;
    const found = AVAILABLE_FILTERS.find(f => f.name === baseName) || AVAILABLE_FILTERS[0];
    console.log('[FilterControls] selectedFilter trouvé:', found);
    return found;
  }, [currentFilter]);
  const handleFilterSelect = useCallback(async (filter: FilterInfo) => {
    if (disabled) return;
    console.log('[FilterControls] handleFilterSelect appelé avec:', filter.name);
    try {
      if (filter.name === 'none') { 
        console.log('[FilterControls] Appel de onClearFilter()');
        const result = await onClearFilter(); 
        console.log('[FilterControls] Résultat onClearFilter:', result);
      }
      else if (filter.name === 'lut3d') {
        const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0;
        setLocalIntensity(intensity);
        setPendingLUTIntensity(intensity);
        setLutModalVisible(true);
      } else if (filter.name === 'xmp') {
        const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0;
        setLocalIntensity(intensity);
        setXmpModalVisible(true);
      } else { 
        const intensity = filter.hasIntensity ? filter.defaultIntensity : 1.0; 
        setLocalIntensity(intensity); 
        console.log('[FilterControls] Appel de onFilterChange avec:', filter.name, intensity);
        const result = await onFilterChange(filter.name, intensity); 
        console.log('[FilterControls] Résultat onFilterChange:', result);
      }
    } catch (error) { console.error('[FilterControls] Erreur application filtre:', error); }
  }, [onFilterChange, onClearFilter, disabled]);
  const handleIntensityChange = useCallback((newIntensity: number) => { 
    console.log('[FilterControls] handleIntensityChange appelé avec:', newIntensity);
    const clamped = Math.max(0, Math.min(1, newIntensity)); 
    console.log('[FilterControls] Valeur clampée:', clamped);
    setLocalIntensity(clamped); 
    // Pour les filtres dynamiques (ex: lut3d:/path), conserver le nom complet courant
    const targetName = currentFilter?.name ?? selectedFilter.name;
    console.log('[FilterControls] Appel onFilterChange avec filtre:', targetName, 'intensité:', clamped);
    onFilterChange(targetName, clamped); 
  }, [onFilterChange, selectedFilter.name, currentFilter?.name]);
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactFilters}>
          {AVAILABLE_FILTERS.map((filter) => (
            <FilterButton key={filter.name} filter={filter} isSelected={selectedFilter.name === filter.name} onPress={() => handleFilterSelect(filter)} disabled={disabled} />
          ))}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtres</Text>
        <TouchableOpacity style={styles.advancedButton} onPress={() => setAdvancedVisible(true)} activeOpacity={0.7}>
          <Text style={styles.advancedButtonText}>⚙</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
        {AVAILABLE_FILTERS.map((filter) => (
          <FilterButton key={filter.name} filter={filter} isSelected={selectedFilter.name === filter.name} onPress={() => handleFilterSelect(filter)} disabled={disabled} />
        ))}
      </ScrollView>
      <Text style={styles.description}>{selectedFilter.description}</Text>
      {selectedFilter.hasIntensity && (
        <View style={styles.intensityContainer}>
          <Text style={styles.intensityLabel}>Intensité</Text>
          <CustomSlider
            value={localIntensity}
            onValueChange={handleIntensityChange}
            onSlidingComplete={(value) => onFilterChange(selectedFilter.name, value)}
            minimumValue={0}
            maximumValue={1}
            width={220}
            trackHeight={3}
            thumbSize={20}
            activeTrackColor={selectedFilter.color}
            inactiveTrackColor="rgba(255, 255, 255, 0.2)"
            thumbColor="#FFFFFF"
            accentColor={selectedFilter.color}
            showValue={true}
            valueFormatter={(val) => `${Math.round(val * 100)}%`}
            disabled={disabled}
            style={styles.sliderStyle}
          />
        </View>
      )}

      {/* Modal de saisie du chemin LUT */}
      <Modal
        visible={lutModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chemin du fichier LUT (.cube)</Text>
            <Text style={styles.modalHelp}>Indiquez un chemin absolu vers un fichier .cube présent sur l'appareil.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="/absolute/path/to/your.lut.cube"
              placeholderTextColor="#999"
              value={lutPath}
              onChangeText={setLutPath}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setLutModalVisible(false); setLutPath(''); }}>
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={async () => {
                  const path = lutPath.trim();
                  if (!path) { return; }
                  
                  // Validation de sécurité du chemin
                  // 1. Interdire les traversées de répertoire
                  if (path.includes('../') || path.includes('..\\')) {
                    Alert.alert('Erreur', 'Chemin invalide : traversée de répertoire non autorisée');
                    return;
                  }
                  
                  // 2. Vérifier l'extension du fichier
                  if (!path.toLowerCase().endsWith('.cube')) {
                    Alert.alert('Erreur', 'Le fichier doit avoir l\'extension .cube');
                    return;
                  }
                  
                  // 3. Vérifier l'existence du fichier
                  try {
                    const exists = await RNFS.exists(path);
                    if (!exists) {
                      Alert.alert('Erreur', 'Le fichier spécifié n\'existe pas');
                      return;
                    }
                    
                    // 4. Vérifier la taille du fichier (limite à 10MB)
                    const stat = await RNFS.stat(path);
                    if (stat.size > 10 * 1024 * 1024) {
                      Alert.alert('Erreur', 'Le fichier est trop volumineux (max 10MB)');
                      return;
                    }
                  } catch (error) {
                    Alert.alert('Erreur', 'Impossible de vérifier le fichier');
                    return;
                  }
                  
                  setLutModalVisible(false);
                  setLutPath('');
                  await onFilterChange(`lut3d:${path}`, pendingLUTIntensity);
                }}
              >
                <Text style={styles.modalBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'import XMP */}
      <Modal
        visible={xmpModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setXmpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer un preset Lightroom (.xmp)</Text>
            <Text style={styles.modalHelp}>Collez le contenu du fichier .xmp ci-dessous, ou chargez un fichier.</Text>
            <TextInput
              style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="<x:xmpmeta>..."
              placeholderTextColor="#999"
              value={xmpText}
              onChangeText={setXmpText}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            {xmpPreview && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Aperçu des réglages mappés</Text>
                {xmpPreview.detailed?.hsl && (
                  <View style={styles.previewTable}>
                    <View style={styles.previewRow}>
                      <Text style={[styles.previewCell, styles.previewHead]}>Canal</Text>
                      <Text style={[styles.previewCell, styles.previewHead]}>H</Text>
                      <Text style={[styles.previewCell, styles.previewHead]}>S</Text>
                      <Text style={[styles.previewCell, styles.previewHead]}>L</Text>
                    </View>
                    {(['red','orange','yellow','green','aqua','blue','purple','magenta'] as const).map((c) => {
                      const h = xmpPreview.detailed!.hsl!.hue[c];
                      const s = xmpPreview.detailed!.hsl!.saturation[c];
                      const l = xmpPreview.detailed!.hsl!.luminance[c];
                      const has = typeof h === 'number' || typeof s === 'number' || typeof l === 'number';
                      if (!has) return null;
                      return (
                        <View key={c} style={styles.previewRow}>
                          <Text style={styles.previewCell}>{c}</Text>
                          <Text style={styles.previewCell}>{h ?? '-'}</Text>
                          <Text style={styles.previewCell}>{s ?? '-'}</Text>
                          <Text style={styles.previewCell}>{l ?? '-'}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {xmpPreview.detailed?.toneCurve && (
                  <View style={styles.previewBlock}>
                    <Text style={styles.previewSubtitle}>ToneCurve PV2012</Text>
                    <Text style={styles.previewNote}>
                      {xmpPreview.detailed.toneCurve.points.length} points
                    </Text>
                    <Text style={styles.previewNote}>
                      Aperçu: {xmpPreview.detailed.toneCurve.points.slice(0, 6).map(p => `(${p.x},${p.y})`).join(' ')}{xmpPreview.detailed.toneCurve.points.length > 6 ? ' …' : ''}
                    </Text>
                  </View>
                )}
                {xmpPreview.detailed?.splitToning && (
                  <View style={styles.previewBlock}>
                    <Text style={styles.previewSubtitle}>Split Toning</Text>
                    <Text style={styles.previewNote}>
                      Shadows: H {xmpPreview.detailed.splitToning.shadowHue ?? '-'} / S {xmpPreview.detailed.splitToning.shadowSaturation ?? '-'}
                    </Text>
                    <Text style={styles.previewNote}>
                      Highlights: H {xmpPreview.detailed.splitToning.highlightHue ?? '-'} / S {xmpPreview.detailed.splitToning.highlightSaturation ?? '-'} (Balance {xmpPreview.detailed.splitToning.balance ?? 0})
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.modalActions}>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => { setXmpModalVisible(false); setXmpText(''); }}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#444' }]}
                  onPress={async () => {
                    try {
                      const [res] = await pick({ type: [types.allFiles] });
                      const copies = await keepLocalCopy({ files: [{ uri: res.uri, fileName: res.name || 'preset.xmp' }], destination: 'cachesDirectory' });
                      const localUri = copies[0].status === 'success' ? copies[0].localUri : null;
                      if (!localUri) return;
                      const filePath = localUri.startsWith('file://') ? localUri.replace('file://','') : localUri;
                      const content = await RNFS.readFile(filePath, 'utf8');
                      setXmpText(content);
                    } catch (e) {
                      if (isErrorWithCode(e) && e.code !== errorCodes.OPERATION_CANCELED) {
                        console.warn('[FilterControls] XMP picker error:', e);
                      }
                    }
                  }}
                >
                  <Text style={styles.modalBtnText}>Parcourir…</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#666' }]}
                  onPress={async () => {
                    const src = xmpText.trim();
                    if (!src) return;
                    try {
                      const lutPath = await buildAndSaveLUTCubeFromXMP(src, 33);
                      Alert.alert('LUT exportée', `Fichier créé:\n${lutPath}`);
                    } catch (e) {
                      console.warn('[FilterControls] Export LUT depuis XMP - erreur:', e);
                      Alert.alert('Erreur', 'Impossible de générer la LUT depuis ce XMP.');
                    }
                  }}
                >
                  <Text style={styles.modalBtnText}>Exporter LUT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={async () => {
                    const src = xmpText.trim();
                    if (!src) return;
                    const res = await processXMPToFilter(src);
                    setXmpModalVisible(false);
                    setXmpText('');
                    if (res.type === 'lut') {
                      await onFilterChange(`lut3d:${res.path}`, 1.0);
                    } else {
                      await onFilterChange('color_controls', localIntensity, res.params as AdvancedFilterParams);
                    }
                  }}
                >
                  <Text style={styles.modalBtnText}>Appliquer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Réglages avancés temps réel (génère une LUT) */}
      <AdvancedAdjustmentsModal
        visible={advancedVisible}
        onClose={() => setAdvancedVisible(false)}
        onApplyLUT={async (lutPath) => {
          await onFilterChange(`lut3d:${lutPath}`, 1.0);
          setAdvancedVisible(false);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 8, margin: 3, maxHeight: 160 },
  compactContainer: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 10, padding: 12, margin: 3 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4, position: 'relative' },
  title: { fontSize: 10, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  advancedButton: { position: 'absolute', left: 0, top: 0, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  advancedButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  closeButton: { position: 'absolute', right: 0, top: 0, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '400' },
  filtersContainer: { paddingHorizontal: 1, gap: 4 },
  compactFilters: { paddingHorizontal: 1, gap: 1 },
  filterButton: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: '#666666', backgroundColor: 'rgba(255, 255, 255, 0.05)', marginHorizontal: 2 },
  filterButtonSelected: { borderWidth: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  filterButtonDisabled: { opacity: 0.5 },
  filterIcon: { fontSize: 10, marginBottom: 4 },
  filterIconDisabled: { opacity: 0.5 },
  filterName: { fontSize: 10, fontWeight: '500', color: '#CCCCCC', textAlign: 'center' },
  filterNameSelected: { color: '#FFFFFF', fontWeight: '600' },
  filterNameDisabled: { opacity: 0.5 },
  description: { fontSize: 10, color: '#AAAAAA', textAlign: 'center', marginTop: 4, marginBottom: 4, fontStyle: 'italic' },
  intensityContainer: { marginTop: 4, alignItems: 'center' },
  intensityLabel: { fontSize: 10, fontWeight: '500', color: '#FFFFFF', marginBottom: 8 },
  sliderStyle: { marginHorizontal: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  modalHelp: { color: '#ccc', fontSize: 12, marginBottom: 8 },
  modalInput: { backgroundColor: '#111', borderColor: '#333', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff' },
  modalActions: { flexDirection: 'column', gap: 8, marginTop: 12 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center', flex: 1 },
  modalCancel: { backgroundColor: '#333' },
  modalConfirm: { backgroundColor: '#007AFF' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
  // XMP preview styles
  previewSection: { marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  previewTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  previewTable: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#333', borderRadius: 6, overflow: 'hidden', marginTop: 6 },
  previewRow: { flexDirection: 'row' },
  previewCell: { flex: 1, color: '#ddd', fontSize: 10, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#333' },
  previewHead: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.06)' },
  previewBlock: { marginTop: 8 },
  previewSubtitle: { color: '#fff', fontSize: 12, fontWeight: '600' },
  previewNote: { color: '#aaa', fontSize: 10, marginTop: 2 },
});

export default FilterControls;
