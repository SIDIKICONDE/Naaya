/**
 * Modal de configuration pour import/export
 */

import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { EqualiserTheme } from '../types';

interface ConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (config: string) => void;
  exportedConfig: string;
  theme: EqualiserTheme;
}

export const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  visible,
  onClose,
  onImport,
  exportedConfig,
  theme,
}) => {
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(exportedConfig);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Utiliser Share API pour mobile
        const result = await Share.share({ 
          message: exportedConfig,
          title: 'Configuration Égaliseur'
        });
        if (result.action === Share.sharedAction) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager la configuration');
    }
  };

  const handleImport = () => {
    try {
      // Valider le JSON
      JSON.parse(importText);
      onImport(importText);
      setImportText('');
      Alert.alert('Succès', 'Configuration importée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Configuration invalide. Vérifiez le format JSON.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              Configuration de l'égaliseur
            </Text>
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.surface }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'export' && styles.modeButtonActive,
                {
                  backgroundColor: mode === 'export' ? theme.primary : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setMode('export')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'export' ? styles.modeButtonTextActive : { color: theme.text }
              ]}>
                📤 Exporter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'import' && styles.modeButtonActive,
                {
                  backgroundColor: mode === 'import' ? theme.primary : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setMode('import')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'import' ? styles.modeButtonTextActive : { color: theme.text }
              ]}>
                📥 Importer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.contentContainer}>
            {mode === 'export' ? (
              <View>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Copiez cette configuration pour la sauvegarder ou la partager.
                </Text>
                
                <View style={[styles.codeContainer, { backgroundColor: theme.surface }]}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.codeScroll}
                  >
                    <Text style={[styles.codeText, { color: theme.text }]}>
                      {exportedConfig}
                    </Text>
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={handleCopy}
                >
                  <Text style={styles.primaryButtonText}>
                    {copied ? '✓ Copié!' : '📋 Copier'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.infoBox, { backgroundColor: theme.primary + '10' }]}>
                  <Text style={[styles.infoText, { color: theme.primary }]}>
                    💡 Cette configuration contient tous vos réglages actuels: gains des bandes, préréglage actif, et paramètres de sortie.
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Collez une configuration exportée pour restaurer les réglages.
                </Text>

                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  }]}
                  placeholder="Collez la configuration JSON ici..."
                  placeholderTextColor={theme.textSecondary}
                  value={importText}
                  onChangeText={setImportText}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton, 
                    { backgroundColor: theme.primary },
                    !importText && styles.disabledButton,
                  ]}
                  onPress={handleImport}
                  disabled={!importText}
                >
                  <Text style={styles.primaryButtonText}>
                    ✓ Importer
                  </Text>
                </TouchableOpacity>

                <View style={[styles.warningBox, { backgroundColor: theme.warning + '10' }]}>
                  <Text style={[styles.warningText, { color: theme.warning }]}>
                    ⚠️ L'import remplacera tous vos réglages actuels. Cette action est irréversible.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderWidth: 0,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  codeContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 200,
  },
  codeScroll: {
    paddingRight: 16,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  textInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 200,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  warningBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
});
