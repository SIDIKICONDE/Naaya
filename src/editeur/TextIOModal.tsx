import React, { memo, useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export type TextIOMode = 'export' | 'import';

interface TextIOModalProps {
  visible: boolean;
  mode: TextIOMode;
  title?: string;
  helperText?: string;
  exportedText?: string | null;
  onClose: () => void;
  onSubmitImport?: (text: string) => void;
}

export const TextIOModal: React.FC<TextIOModalProps> = memo(({ visible, mode, title, helperText, exportedText, onClose, onSubmitImport }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (mode === 'export') setText(exportedText ?? '');
    else setText('');
  }, [mode, exportedText]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title ?? (mode === 'export' ? 'Exporter le texte' : 'Importer du texte')}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
        </View>

        {mode === 'export' ? (
          <ScrollView style={styles.body} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.help}>{helperText ?? 'Copiez ce texte pour le sauvegarder ailleurs.'}</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{text}</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.body}>
            <Text style={[styles.help, { paddingHorizontal: 16 }]}>{helperText ?? 'Collez ci-dessous le texte à charger puis validez.'}</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={'Votre texte ici...'}
              placeholderTextColor="#888"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.confirm]} onPress={() => { onSubmitImport?.(text); onClose(); }}>
                <Text style={styles.buttonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
});

TextIOModal.displayName = 'TextIOModal';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  close: { color: '#bbb', fontSize: 22 },
  body: { flex: 1 },
  help: { color: '#ccc', marginBottom: 8 },
  codeBox: { backgroundColor: '#1C1C1E', borderRadius: 8, padding: 12 },
  codeText: { color: '#fff', fontFamily: 'Menlo' },
  input: { flex: 1, margin: 16, backgroundColor: '#1C1C1E', borderRadius: 8, color: '#fff', padding: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancel: { backgroundColor: '#333' },
  confirm: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default TextIOModal;


