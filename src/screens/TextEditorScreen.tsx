import React from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import { TextEditor } from '@/editeur/TextEditor';

export const TextEditorScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Éditeur de texte</Text>
      </View>
      <View style={styles.content}>
        <TextEditor />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
});

export default TextEditorScreen;


