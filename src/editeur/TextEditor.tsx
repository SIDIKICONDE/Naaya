import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ScrollView, Platform, Alert, Share } from 'react-native';
import type { StyleProp, ViewStyle, TextStyle, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import { pick, saveDocuments, types, keepLocalCopy } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextIOModal } from './TextIOModal';

export interface TextEditorProps {
  initialText?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onChangeText?: (text: string) => void;
}

// Éditeur de texte autonome: ouvrir (.txt, .json), éditer, exporter/sauver, annuler/rétablir, rechercher/remplacer
export const TextEditor: React.FC<TextEditorProps> = memo(({ initialText = '', style, textStyle, onChangeText }) => {
  const [text, setText] = useState<string>(initialText);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ioModal, setIOModal] = useState<{ visible: boolean; mode: 'export' | 'import' } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [monospace, setMonospace] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(16);

  // Historique pour Annuler/Rétablir
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche/Remplacement
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const inputRef = useRef<TextInput | null>(null);

  const STORAGE_KEY_TEXT = 'textEditor:lastText';
  const STORAGE_KEY_PREFS = 'textEditor:prefs';

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleChange = useCallback((t: string) => {
    setText(t);
    onChangeText?.(t);
    // snapshot debounced pour annuler/rétablir
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      undoStackRef.current.push(t);
      // nettoyer la pile redo quand on tape
      redoStackRef.current = [];
    }, 250);
  }, [onChangeText]);

  const openFromDevice = useCallback(async () => {
    try {
      const res = await pick({
        type: [types.plainText, types.json],
        presentationStyle: Platform.OS === 'ios' ? 'formSheet' : undefined,
        transitionStyle: Platform.OS === 'ios' ? 'coverVertical' : undefined,
        allowMultiSelection: false,
        mode: 'import',
        showFileExtensions: true,
      } as any);

      const first = res?.[0];
      if (!first) return;
      setFileName(first.name ?? null);

      const keep = await keepLocalCopy({ files: [{ uri: first.uri, fileName: first.name ?? 'document.txt' }], destination: 'documentDirectory' } as any);
      const entry = Array.isArray(keep) ? keep[0] : keep;
      const localUri = (entry && 'localUri' in entry) ? (entry as any).localUri : first.uri;

      const response = await fetch(localUri);
      const content = await response.text();
      handleChange(content);
      // enregistrer dernier
      await AsyncStorage.setItem(STORAGE_KEY_TEXT, content);
    } catch (e: any) {
      console.warn('[TextEditor] openFromDevice error', e?.message ?? String(e));
    }
  }, [handleChange]);

  const saveToDevice = useCallback(async () => {
    try {
      const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
      const result = await saveDocuments({
        sourceUris: [dataUri],
        copy: true,
        showFileExtensions: true,
      } as any);
      const saved = result?.[0];
      if (saved?.uri) {
        Alert.alert('Enregistré', `Fichier sauvegardé: ${saved.uri}`);
      }
    } catch (e: any) {
      console.warn('[TextEditor] saveToDevice error', e?.message ?? String(e));
      Alert.alert('Erreur', 'Impossible de sauvegarder le fichier');
    }
  }, [text]);

  // Partage natif du texte
  const shareText = useCallback(async () => {
    try {
      await Share.share({ message: text, title: fileName ?? 'Document' });
    } catch (e: any) {
      console.warn('[TextEditor] share error', e?.message ?? String(e));
    }
  }, [text, fileName]);

  // Annuler / Rétablir
  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const current = stack.pop() as string;
    redoStackRef.current.push(text);
    setText(current);
  }, [text]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const next = stack.pop() as string;
    undoStackRef.current.push(text);
    setText(next);
  }, [text]);

  // Recherche / Remplacement
  const onSelectionChange = useCallback((e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(e.nativeEvent.selection);
  }, []);

  const findNext = useCallback(() => {
    if (!searchQuery) return;
    const startIndex = Math.max(selection.end, 0);
    const idx = text.indexOf(searchQuery, startIndex);
    const wrapIdx = idx === -1 ? text.indexOf(searchQuery, 0) : idx;
    if (wrapIdx !== -1) {
      const newSel = { start: wrapIdx, end: wrapIdx + searchQuery.length };
      setSelection(newSel);
      // positionner le curseur
      setTimeout(() => inputRef.current?.setNativeProps?.({ selection: newSel as any }), 0);
    }
  }, [searchQuery, selection.end, text]);

  const replaceOne = useCallback(() => {
    if (!searchQuery) return;
    const { start, end } = selection;
    const selected = text.slice(start, end);
    if (selected === searchQuery) {
      const newText = text.slice(0, start) + replaceText + text.slice(end);
      setText(newText);
      const newCursor = start + replaceText.length;
      const newSel = { start: newCursor, end: newCursor };
      setSelection(newSel);
      setTimeout(() => inputRef.current?.setNativeProps?.({ selection: newSel as any }), 0);
    } else {
      findNext();
    }
  }, [selection, text, searchQuery, replaceText, findNext]);

  const replaceAll = useCallback(() => {
    if (!searchQuery) return;
    const newText = text.split(searchQuery).join(replaceText);
    setText(newText);
  }, [text, searchQuery, replaceText]);

  // Autosauvegarde et préférences
  useEffect(() => {
    (async () => {
      try {
        const [lastText, rawPrefs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_TEXT),
          AsyncStorage.getItem(STORAGE_KEY_PREFS),
        ]);
        if (lastText != null && !initialText) setText(lastText);
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs) as { theme?: 'dark'|'light'; monospace?: boolean; fontSize?: number };
          if (prefs.theme === 'dark' || prefs.theme === 'light') setTheme(prefs.theme);
          if (typeof prefs.monospace === 'boolean') setMonospace(prefs.monospace);
          if (typeof prefs.fontSize === 'number') setFontSize(prefs.fontSize);
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_TEXT, text);
      } catch {}
    })();
  }, [text]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify({ theme, monospace, fontSize }));
      } catch {}
    })();
  }, [theme, monospace, fontSize]);

  // Statistiques
  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    const lines = text.split(/\n/).length;
    return { chars, words, lines } as const;
  }, [text]);

  return (
    <View style={[styles.container, theme === 'dark' ? styles.bgDark : styles.bgLight, style]}>
      <View style={[styles.toolbar, theme === 'dark' ? styles.toolbarDark : styles.toolbarLight]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          <TouchableOpacity style={styles.toolBtn} onPress={openFromDevice}>
            <Text style={styles.toolText}>Ouvrir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setIOModal({ visible: true, mode: 'import' })}>
            <Text style={styles.toolText}>Coller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setIOModal({ visible: true, mode: 'export' })}>
            <Text style={styles.toolText}>Exporter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnPrimary} onPress={saveToDevice}>
            <Text style={styles.toolTextPrimary}>Sauver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={undo}>
            <Text style={styles.toolText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={redo}>
            <Text style={styles.toolText}>Rétablir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setSearchOpen((v) => !v)}>
            <Text style={styles.toolText}>Rechercher</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={shareText}>
            <Text style={styles.toolText}>Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
            <Text style={styles.toolText}>{theme === 'dark' ? 'Clair' : 'Sombre'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setMonospace((v) => !v)}>
            <Text style={styles.toolText}>{monospace ? 'Sans mono' : 'Monospace'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setFontSize((s) => Math.max(10, s - 1))}>
            <Text style={styles.toolText}>A−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setFontSize((s) => Math.min(36, s + 1))}>
            <Text style={styles.toolText}>A+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.filename, theme === 'dark' ? styles.textMutedDark : styles.textMutedLight]} numberOfLines={1}>
          {fileName ?? 'Nouveau document'}
        </Text>
        <Text style={[styles.stats, theme === 'dark' ? styles.textMutedDark : styles.textMutedLight]}>{stats.words} mots · {stats.chars} caractères · {stats.lines} lignes</Text>
      </View>

      {searchOpen && (
        <View style={[styles.searchBar, theme === 'dark' ? styles.searchBarDark : styles.searchBarLight]}>
          <TextInput
            style={[styles.searchInput, theme === 'dark' ? styles.searchInputDark : styles.searchInputLight]}
            placeholder="Rechercher"
            placeholderTextColor={theme === 'dark' ? '#888' : '#666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TextInput
            style={[styles.searchInput, theme === 'dark' ? styles.searchInputDark : styles.searchInputLight]}
            placeholder="Remplacer par"
            placeholderTextColor={theme === 'dark' ? '#888' : '#666'}
            value={replaceText}
            onChangeText={setReplaceText}
          />
          <TouchableOpacity style={styles.toolBtn} onPress={findNext}><Text style={styles.toolText}>Suivant</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={replaceOne}><Text style={styles.toolText}>Remplacer</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={replaceAll}><Text style={styles.toolText}>Tout</Text></TouchableOpacity>
        </View>
      )}

      <TextInput
        ref={inputRef}
        style={[
          styles.editor,
          theme === 'dark' ? styles.editorDark : styles.editorLight,
          monospace ? styles.editorMono : null,
          { fontSize },
          textStyle,
        ]}
        value={text}
        onChangeText={handleChange}
        placeholder="Tapez votre texte ici..."
        placeholderTextColor={theme === 'dark' ? '#666' : '#999'}
        multiline
        autoCapitalize="sentences"
        autoCorrect
        textAlignVertical="top"
        selection={selection}
        onSelectionChange={onSelectionChange}
      />

      {ioModal && (
        <TextIOModal
          visible={ioModal.visible}
          mode={ioModal.mode}
          title={ioModal.mode === 'import' ? 'Importer du texte' : 'Exporter le texte'}
          helperText={ioModal.mode === 'import' ? 'Collez ci-dessous du texte brut à charger dans l’éditeur.' : 'Copiez ce texte.'}
          exportedText={ioModal.mode === 'export' ? text : ''}
          onClose={() => setIOModal(null)}
          onSubmitImport={(t) => handleChange(t)}
        />)
      }
    </View>
  );
});

TextEditor.displayName = 'TextEditor';

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgDark: { backgroundColor: '#000' },
  bgLight: { backgroundColor: '#fff' },
  toolbar: { borderBottomWidth: StyleSheet.hairlineWidth },
  toolbarDark: { borderBottomColor: '#1f1f1f' },
  toolbarLight: { borderBottomColor: '#e5e5e5' },
  toolbarContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 8, alignItems: 'center' },
  toolBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1c1c1e' },
  toolBtnPrimary: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#007AFF' },
  toolText: { color: '#fff', fontSize: 14 },
  toolTextPrimary: { color: '#fff', fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filename: { paddingHorizontal: 12, paddingVertical: 8 },
  stats: { paddingHorizontal: 12 },
  textMutedDark: { color: '#9e9e9e' },
  textMutedLight: { color: '#666' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBarDark: { borderBottomColor: '#1f1f1f' },
  searchBarLight: { borderBottomColor: '#e5e5e5' },
  searchInput: { flex: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  searchInputDark: { backgroundColor: '#1C1C1E', color: '#fff' },
  searchInputLight: { backgroundColor: '#f2f2f2', color: '#000' },
  editor: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  editorDark: { color: '#fff' },
  editorLight: { color: '#000' },
  editorMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

export default TextEditor;


