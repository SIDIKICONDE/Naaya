import React, { memo, useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export type ConfigModalMode = 'export' | 'import';

interface ConfigModalProps {
  visible: boolean;
  mode: ConfigModalMode;
  exportedText?: string | null;
  onClose: () => void;
  onSubmitImport?: (json: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = memo(({ visible, mode, exportedText, onClose, onSubmitImport }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'export') setText(exportedText ?? '');
    else { setText(''); setError(null); }
  }, [mode, exportedText]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{mode === 'export' ? 'Exporter configuration' : 'Importer configuration'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
        </View>

        {mode === 'export' ? (
          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.help}>Copiez ce JSON pour sauvegarder votre configuration.</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{text}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.confirm]} onPress={() => {
                try {
                  // tentative de copie via clipboard si dispo
                  let Clipboard: any;
                  try { Clipboard = require('@react-native-clipboard/clipboard'); } catch {}
                  const setStr = Clipboard?.default?.setString ?? Clipboard?.setString;
                  if (setStr) setStr(text);
                  setBanner('Copié');
                } catch {
                  setBanner('Copie indisponible');
                }
              }}>
                <Text style={styles.buttonText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
                <Text style={styles.buttonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.body}>
            <Text style={[styles.help, styles.helpPadX]}>Collez ici un JSON valide puis validez.</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={text}
              onChangeText={setText}
              placeholder={'{ "speedPxPerSec": 80, ... }'}
              placeholderTextColor="#888"
              multiline
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.confirm]} onPress={() => {
                try {
                  JSON.parse(text);
                } catch {
                  setError('JSON invalide');
                  return;
                }
                setError(null);
                onSubmitImport?.(text);
                setBanner('Import réussi');
                setTimeout(() => { setBanner(null); onClose(); }, 600);
              }}>
                <Text style={styles.buttonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {banner && (
          <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View>
        )}
      </View>
    </Modal>
  );
});

ConfigModal.displayName = 'ConfigModal';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  close: { color: '#bbb', fontSize: 22 },
  body: { flex: 1 },
  help: { color: '#ccc', marginBottom: 8 },
  helpPadX: { paddingHorizontal: 16 },
  scrollContent: { padding: 16 },
  codeBox: { backgroundColor: '#1C1C1E', borderRadius: 8, padding: 12 },
  codeText: { color: '#fff', fontFamily: 'Menlo' },
  input: { flex: 1, margin: 16, backgroundColor: '#1C1C1E', borderRadius: 8, color: '#fff', padding: 12, textAlignVertical: 'top' },
  inputError: { borderWidth: 1, borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', paddingHorizontal: 16, marginTop: -8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancel: { backgroundColor: '#333' },
  confirm: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
  banner: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1c1c1e', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#333' },
  bannerText: { color: '#fff' },
});

export default ConfigModal;


