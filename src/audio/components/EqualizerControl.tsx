/**
 * Composant de contrôle de l'égaliseur (version modale professionnelle)
 * Enveloppe le composant avancé `AudioEqualizer` et ajoute des actions Export/Import
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConfigModal } from '../../ui/ConfigModal';
import { THEME_COLORS } from '../constants';
import { useEqualizer } from '../hooks';
import EqualizerService from '../services/EqualizerService';
import { AudioEqualizer } from './AudioEqualizer';

interface EqualizerControlProps {
  onClose?: () => void;
  showSpectrum?: boolean;
}

export const EqualizerControl: React.FC<EqualizerControlProps> = memo(({ onClose, showSpectrum = true }) => {
  const { isLoading, error } = useEqualizer();

  const [configVisible, setConfigVisible] = useState(false);
  const [configMode, setConfigMode] = useState<'export' | 'import'>('export');
  const exportedText = useMemo(() => {
    try {
      return JSON.stringify(EqualizerService.getConfiguration(), null, 2);
    } catch {
      return '{}';
    }
  }, []);

  const openExport = useCallback(() => {
    setConfigMode('export');
    setConfigVisible(true);
  }, []);

  const openImport = useCallback(() => {
    setConfigMode('import');
    setConfigVisible(true);
  }, []);

  const handleImportSubmit = useCallback(async (json: string) => {
    const parsed = JSON.parse(json);
    await EqualizerService.restoreConfiguration(parsed);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de l'égaliseur…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Égaliseur</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <AudioEqualizer enableSpectrum={showSpectrum} onError={() => { /* error déjà gérée ci-dessous */ }} />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryButton} onPress={openImport}>
          <Text style={styles.secondaryButtonText}>Importer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={openExport}>
          <Text style={styles.secondaryButtonText}>Exporter</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Erreur: {error.message}</Text>
        </View>
      )}

      <ConfigModal
        visible={configVisible}
        mode={configMode}
        exportedText={configMode === 'export' ? exportedText : ''}
        onClose={() => setConfigVisible(false)}
        onSubmitImport={handleImportSubmit}
      />
    </View>
  );
});

EqualizerControl.displayName = 'EqualizerControl';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME_COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME_COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: THEME_COLORS.text,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.background,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  secondaryButtonText: {
    color: THEME_COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 68,
    left: 16,
    right: 16,
    backgroundColor: THEME_COLORS.danger + '20',
    borderWidth: 1,
    borderColor: THEME_COLORS.danger + '40',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: THEME_COLORS.danger,
    textAlign: 'center',
  },
});