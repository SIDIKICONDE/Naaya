import DocumentPicker from '@react-native-documents/picker';
import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNFS from 'react-native-fs';
import type { AdvancedFilterParams } from '../../../../specs/NativeCameraFiltersModule';
import { processXMPToFilter } from './utils/xmp';

export interface ImportFilterModalProps {
  visible: boolean;
  initialMode?: 'xmp' | 'lut3d';
  intensity: number;
  onApply: (name: string, intensity: number, params?: AdvancedFilterParams) => Promise<boolean> | Promise<void>;
  onClose: () => void;
}

export const ImportFilterModal: React.FC<ImportFilterModalProps> = memo(({ visible, initialMode, intensity, onApply, onClose }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  console.log('[ImportFilterModal] Render:', { visible, initialMode });

  const ensureLocalFilePath = useCallback(async (uri?: string | null) => {
    if (!uri) throw new Error('URI de fichier invalide');
    if (uri.startsWith('file://')) {
      return uri.replace('file://', '');
    }
    return uri;
  }, []);

  const handleImportXmp = useCallback(async () => {
    try {
      console.log('[ImportFilterModal] Début import XMP');
      setIsBusy(true);
      setErrorText(null);
      const docs = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: false,
      });

      if (docs.length === 0) {
        console.log('[ImportFilterModal] Aucun fichier sélectionné');
        return;
      }

      const doc = docs[0];
      console.log('[ImportFilterModal] Fichier XMP sélectionné:', doc);
      const path = await ensureLocalFilePath((doc as any).fileCopyUri || doc.uri);
      const xmp = await RNFS.readFile(path, 'utf8');
      const result = await processXMPToFilter(xmp);
      if ((result as any).type === 'lut') {
        const cubePath = (result as { type: 'lut'; path: string }).path;
        console.log('[ImportFilterModal] Conversion XMP -> LUT:', cubePath);
        await onApply(`lut3d:${cubePath}`, intensity);
      } else {
        const params = (result as { type: 'params'; params: AdvancedFilterParams }).params;
        console.log('[ImportFilterModal] Application paramètres XMP:', params);
        await onApply('color_controls', intensity, params);
      }
      onClose();
    } catch (e: any) {
      console.error('[ImportFilterModal] Erreur import XMP:', e);
      setErrorText(String(e?.message || e));
    } finally {
      setIsBusy(false);
    }
  }, [ensureLocalFilePath, onApply, intensity, onClose]);

  const handleImportCube = useCallback(async () => {
    try {
      console.log('[ImportFilterModal] Début import LUT .cube');
      setIsBusy(true);
      setErrorText(null);
      const docs = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: false,
      });

      if (docs.length === 0) {
        console.log('[ImportFilterModal] Aucun fichier sélectionné');
        return;
      }

      const doc = docs[0];
      console.log('[ImportFilterModal] Fichier .cube sélectionné:', doc);
      const path = await ensureLocalFilePath((doc as any).fileCopyUri || doc.uri);
      console.log('[ImportFilterModal] Application LUT:', path);
      await onApply(`lut3d:${path}`, intensity);
      onClose();
    } catch (e: any) {
      console.error('[ImportFilterModal] Erreur import LUT:', e);
      setErrorText(String(e?.message || e));
    } finally {
      setIsBusy(false);
    }
  }, [ensureLocalFilePath, onApply, intensity, onClose]);

  const xmpHint = 'XMP Lightroom (Process Version 2012+). Si avancé (HSL/ToneCurve), conversion automatique en LUT 3D (.cube).';
  const cubeHint = 'LUT 3D au format .cube (17–65). Utilisé tel quel.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Importer un préréglage</Text>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, styles.xmp]} onPress={handleImportXmp} disabled={isBusy}>
              <Text style={styles.btnTitle}>Importer XMP</Text>
              <Text style={styles.hint}>{xmpHint}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.cube]} onPress={handleImportCube} disabled={isBusy}>
              <Text style={styles.btnTitle}>Importer LUT .cube</Text>
              <Text style={styles.hint}>{cubeHint}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            {isBusy && <ActivityIndicator color="#FFFFFF" />}
            <TouchableOpacity onPress={onClose} style={styles.cancel} disabled={isBusy}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  buttons: {
    gap: 10,
  },
  btn: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xmp: {
    backgroundColor: '#6A0DAD',
  },
  cube: {
    backgroundColor: '#FF4500',
  },
  btnTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  cancel: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});

export default ImportFilterModal;


