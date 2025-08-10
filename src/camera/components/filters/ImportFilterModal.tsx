import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
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

/**
 * Modal unique pour importer un preset Lightroom (XMP) ou une LUT 3D (.cube)
 */
export const ImportFilterModal: React.FC<ImportFilterModalProps> = memo(({ visible, initialMode, intensity, onApply, onClose }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pickOptions = useMemo(() => ({
    presentationStyle: 'fullScreen' as const,
    copyTo: 'cachesDirectory' as const,
  }), []);

  const ensureLocalFilePath = useCallback(async (uri?: string | null) => {
    if (!uri) throw new Error('URI de fichier invalide');
    // Normaliser file:// vers chemin
    if (uri.startsWith('file://')) {
      return uri.replace('file://', '');
    }
    // Fallback: certains environnements retournent déjà un chemin absolu
    return uri;
  }, []);

  const handleImportXmp = useCallback(async () => {
    try {
      setIsBusy(true);
      setErrorText(null);
      const doc = await DocumentPicker.pickSingle({
        ...pickOptions,
        type: [DocumentPicker.types.allFiles],
      });

      const path = await ensureLocalFilePath((doc as any).fileCopyUri || doc.uri);
      const xmp = await RNFS.readFile(path, 'utf8');
      const result = await processXMPToFilter(xmp);
      if ((result as any).type === 'lut') {
        const cubePath = (result as { type: 'lut'; path: string }).path;
        await onApply(`lut3d:${cubePath}`, intensity);
      } else {
        const params = (result as { type: 'params'; params: AdvancedFilterParams }).params;
        await onApply('color_controls', intensity, params);
      }
      onClose();
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        setErrorText(String(e?.message || e));
      }
    } finally {
      setIsBusy(false);
    }
  }, [pickOptions, ensureLocalFilePath, onApply, intensity, onClose]);

  const handleImportCube = useCallback(async () => {
    try {
      setIsBusy(true);
      setErrorText(null);
      const doc = await DocumentPicker.pickSingle({
        ...pickOptions,
        type: [DocumentPicker.types.allFiles],
      });

      const path = await ensureLocalFilePath((doc as any).fileCopyUri || doc.uri);
      await onApply(`lut3d:${path}`, intensity);
      onClose();
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) {
        setErrorText(String(e?.message || e));
      }
    } finally {
      setIsBusy(false);
    }
  }, [pickOptions, ensureLocalFilePath, onApply, intensity, onClose]);

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
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  xmp: {
    backgroundColor: 'rgba(49, 168, 255, 0.10)',
    borderColor: 'rgba(49, 168, 255, 0.25)'
  },
  cube: {
    backgroundColor: 'rgba(155, 89, 182, 0.10)',
    borderColor: 'rgba(155, 89, 182, 0.25)'
  },
  btnTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: '#ccc',
    fontSize: 11,
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ImportFilterModal;


