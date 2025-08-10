/**
 * Version compacte des contrôles de filtres
 */
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
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
import AdvancedAdjustmentsModal from './AdvancedAdjustmentsModal';
import { COMPACT_FILTERS } from './constants';
import { buildAndSaveLUTCubeFromXMP, processXMPToFilter } from './utils/xmp';

export interface CompactFilterControlsProps {
  currentFilter: FilterState | null;
  onFilterChange: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean>;
  onClearFilter: () => Promise<boolean>;
  disabled?: boolean;
  showLabels?: boolean;
  style?: any;
}

export const CompactFilterControls: React.FC<CompactFilterControlsProps> = memo(({ currentFilter, onFilterChange, onClearFilter, disabled = false, showLabels = true, style }) => {
  const [lutModalVisible, setLutModalVisible] = useState(false);
  const [lutPath, setLutPath] = useState('');
  const [lutInterp, setLutInterp] = useState<'nearest' | 'trilinear'>('trilinear');
  const [xmpModalVisible, setXmpModalVisible] = useState(false);
  const [xmpText, setXmpText] = useState('');
  const [advancedVisible, setAdvancedVisible] = useState(false);

  const handleBrowse = useCallback(async () => {
    try {
      const [res] = await pick({
        type: [types.allFiles],
      });
      
      // Copier le fichier localement
      const copyResult = await keepLocalCopy({
        files: [{
          uri: res.uri,
          fileName: res.name || 'unknown_file',
        }],
        destination: 'cachesDirectory',
      });
      const localUri = copyResult[0].status === 'success' ? copyResult[0].localUri : null;
      
      if (!localUri) return;
      const decoded = decodeURI(localUri);
      // Extraire un chemin filesystem utilisable par iOS (sans schéma file://)
      const path = decoded.startsWith('file://') ? decoded.replace('file://', '') : decoded;
      if (!path.toLowerCase().endsWith('.cube')) {
        // Laisser l'utilisateur l'utiliser quand même, mais on conseille .cube
        setLutPath(path);
        return;
      }
      setLutPath(path);
    } catch (e) {
      if (isErrorWithCode(e) && e.code !== errorCodes.OPERATION_CANCELED) {
        console.warn('[CompactFilterControls] DocumentPicker error:', e);
      }
    }
  }, []);

  const handleFilterSelect = useCallback(async (filterName: string) => {
    if (disabled) return;
    console.log('[CompactFilterControls] handleFilterSelect appelé avec:', filterName);
    try {
      if (filterName === 'none') {
        console.log('[CompactFilterControls] Appel de onClearFilter()');
        const result = await onClearFilter();
        console.log('[CompactFilterControls] Résultat onClearFilter:', result);
      } else if (filterName === 'lut3d') {
        // Ouvrir le modal pour saisir/sélectionner le fichier .cube
        setLutModalVisible(true);
      } else if (filterName === 'xmp') {
        setXmpModalVisible(true);
      } else {
        const defaultIntensity = filterName === 'noir' ? 1.0 : 0.7;
        console.log('[CompactFilterControls] Appel de onFilterChange avec:', filterName, defaultIntensity);
        const result = await onFilterChange(filterName, defaultIntensity);
        console.log('[CompactFilterControls] Résultat onFilterChange:', result);
      }
    } catch (error) { 
      console.error('[CompactFilterControls] Erreur application filtre:', error); 
    }
  }, [onFilterChange, onClearFilter, disabled]);

  const selectedFilterKey = useMemo(() => {
    console.log('[CompactFilterControls] currentFilter:', currentFilter);
    if (!currentFilter) {
      console.log('[CompactFilterControls] Pas de filtre actuel, retour "none"');
      return 'none';
    }
    const name = currentFilter.name;
    console.log('[CompactFilterControls] currentFilter.name:', name);
    if (name.startsWith('lut3d:')) {
      console.log('[CompactFilterControls] Filtre LUT détecté, retour "lut3d"');
      return 'lut3d';
    }
    console.log('[CompactFilterControls] selectedFilterKey final:', name);
    return name;
  }, [currentFilter]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
        <TouchableOpacity key={'advanced-gear'} style={[styles.filterButton, disabled && styles.filterButtonDisabled]} onPress={() => setAdvancedVisible(true)} disabled={disabled} activeOpacity={0.7}>
          <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>⚙</Text>
          {showLabels && (
            <Text style={[styles.filterName, disabled && styles.filterNameDisabled]} numberOfLines={1}>Réglages</Text>
          )}
        </TouchableOpacity>
        {COMPACT_FILTERS.map((filter) => {
          const isSelected = selectedFilterKey === filter.name;
          if (filter.name === 'none') {
            console.log('[CompactFilterControls] Bouton OFF - isSelected:', isSelected, 'selectedFilterKey:', selectedFilterKey);
          }
          return (
            <TouchableOpacity key={filter.name} style={[styles.filterButton, isSelected && [styles.filterButtonSelected, { borderColor: filter.color }], disabled && styles.filterButtonDisabled]} onPress={() => handleFilterSelect(filter.name)} disabled={disabled} activeOpacity={0.7}>
              <Text style={[styles.filterIcon, disabled && styles.filterIconDisabled]}>{filter.icon}</Text>
              {showLabels && (
                <Text style={[styles.filterName, isSelected && [styles.filterNameSelected, { color: filter.color }], disabled && styles.filterNameDisabled]} numberOfLines={1}>
                  {filter.displayName}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {currentFilter && currentFilter.name !== 'none' && (
        <View style={styles.intensityIndicator}>
          <View style={[
            styles.intensityBar,
            {
              width: `${currentFilter.intensity * 100}%`,
              backgroundColor:
                COMPACT_FILTERS.find(f => f.name === selectedFilterKey)?.color || '#007AFF',
            },
          ]} />
        </View>
      )}

      {/* Modal de sélection/saisie LUT */}
      <Modal
        visible={lutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sélectionner une LUT (.cube)</Text>
            <Text style={styles.modalHelp}>Entrez un chemin absolu vers un fichier .cube sur l'appareil.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="/absolute/path/to/your_lut.cube"
              placeholderTextColor="#999"
              value={lutPath}
              onChangeText={setLutPath}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBrowse]} onPress={handleBrowse}>
                <Text style={styles.modalBtnText}>Parcourir…</Text>
              </TouchableOpacity>
              <View style={styles.interpGroup}>
                <Text style={styles.interpLabel}>Interpolation:</Text>
                <View style={styles.interpButtons}>
                  <TouchableOpacity
                    style={[styles.interpBtn, lutInterp === 'nearest' && styles.interpBtnActive]}
                    onPress={() => setLutInterp('nearest')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.interpBtnText}>Nearest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.interpBtn, lutInterp === 'trilinear' && styles.interpBtnActive]}
                    onPress={() => setLutInterp('trilinear')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.interpBtnText}>Trilinear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setLutModalVisible(false); setLutPath(''); }}>
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={async () => {
                  const path = lutPath.trim();
                  if (!path) return;
                  setLutModalVisible(false);
                  setLutPath('');
                  // Intensité à 1.0 par défaut pour les LUTs
                  // Encoder l'interpolation dans le nom pour le moteur FFmpeg
                  const name = `lut3d:${path}?interp=${lutInterp}`;
                  await onFilterChange(name, 1.0);
                }}
              >
                <Text style={styles.modalBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdvancedAdjustmentsModal
        visible={advancedVisible}
        onClose={() => setAdvancedVisible(false)}
        onApplyLUT={async (generatedPath) => {
          await onFilterChange(`lut3d:${generatedPath}`, 1.0);
          setAdvancedVisible(false);
        }}
      />

      {/* Modal d'import XMP */}
      <Modal
        visible={xmpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setXmpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importer un preset Lightroom (.xmp)</Text>
            <Text style={styles.modalHelp}>Collez le contenu .xmp ou chargez un fichier.</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputLarge]}
              placeholder="<x:xmpmeta>..."
              placeholderTextColor="#999"
              value={xmpText}
              onChangeText={setXmpText}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={styles.modalActions}>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel, styles.flexOne]}
                  onPress={() => { setXmpModalVisible(false); setXmpText(''); }}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBrowse, styles.flexOne]}
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
                        console.warn('[CompactFilterControls] XMP picker error:', e);
                      }
                    }
                  }}
                >
                  <Text style={styles.modalBtnText}>Parcourir…</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalExport, styles.flexOne]}
                  onPress={async () => {
                    const src = xmpText.trim();
                    if (!src) return;
                    try {
                      const generatedLutPath = await buildAndSaveLUTCubeFromXMP(src, 33);
                      // Affichage minimal (pas d'Alert en compact) -> on remplit le champ path LUT et ouvre modal LUT
                      setXmpModalVisible(false);
                      setLutModalVisible(true);
                      setLutPath(generatedLutPath);
                    } catch (e) {
                      console.warn('[CompactFilterControls] Export LUT depuis XMP - erreur:', e);
                    }
                  }}
                >
                  <Text style={styles.modalBtnText}>Exporter LUT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm, styles.flexOne]}
                  onPress={async () => {
                    const src = xmpText.trim();
                    if (!src) return;
                    const res = await processXMPToFilter(src);
                    setXmpModalVisible(false);
                    setXmpText('');
                    if (res.type === 'lut') {
                      await onFilterChange(`lut3d:${res.path}`, 1.0);
                    } else {
                      await onFilterChange('color_controls', 1.0, res.params as AdvancedFilterParams);
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, padding: 8 },
  filtersContainer: { paddingHorizontal: 4, gap: 6 },
  filterButton: { alignItems: 'center', justifyContent: 'center', minWidth: 48, height: 56, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  filterButtonSelected: { borderWidth: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  filterButtonDisabled: { opacity: 0.5 },
  filterIcon: { fontSize: 16, marginBottom: 2 },
  filterIconDisabled: { opacity: 0.5 },
  filterName: { fontSize: 10, fontWeight: '500', color: '#CCCCCC', textAlign: 'center' },
  filterNameSelected: { fontWeight: '600' },
  filterNameDisabled: { opacity: 0.5 },
  intensityIndicator: { height: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: 6, marginHorizontal: 4, borderRadius: 1, overflow: 'hidden' },
  intensityBar: { height: '100%', borderRadius: 1 },
  // Modal LUT
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalHelp: { color: '#ccc', fontSize: 12, marginBottom: 10 },
  modalInput: { backgroundColor: '#111', borderColor: '#333', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff' },
  modalActions: { flexDirection: 'column', gap: 8, marginTop: 12 },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  modalCancel: { backgroundColor: '#333' },
  modalConfirm: { backgroundColor: '#007AFF' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
  modalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  modalBrowse: { backgroundColor: '#444' },
  modalExport: { backgroundColor: '#666' },
  interpGroup: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  interpLabel: { color: '#ccc', fontSize: 12, marginRight: 8 },
  interpButtons: { flexDirection: 'row', gap: 6 },
  interpBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: '#333', borderWidth: StyleSheet.hairlineWidth, borderColor: '#555' },
  interpBtnActive: { backgroundColor: '#007AFF', borderColor: '#2491ff' },
  interpBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalInputLarge: { height: 120, textAlignVertical: 'top' },
  flexOne: { flex: 1 },
});

export default CompactFilterControls;



