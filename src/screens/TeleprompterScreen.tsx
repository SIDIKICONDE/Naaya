import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TeleprompterControls, TeleprompterView, useTeleprompter } from '../teleprompter';

export const TeleprompterScreen: React.FC = () => {
  console.log('[TeleprompterScreen] Rendu de l\'écran téléprompteur');
  const prompter = useTeleprompter({ persistKey: 'teleprompter:main', defaultWpm: 140 });

  const { height: windowH } = Dimensions.get('window');
  const panelHeight = useMemo(() => Math.max(140, Math.round(windowH * 0.42)), [windowH]);

  useEffect(() => {
    prompter.setContainerHeight(panelHeight);
  }, [panelHeight]);

  const loadFromEditor = async () => {
    try {
      const txt = await AsyncStorage.getItem('textEditor:lastText');
      if (txt != null) prompter.setText(txt);
    } catch {}
  };

  const clearText = () => {
    prompter.setText('');
    prompter.restart();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Téléprompteur</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={loadFromEditor} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>Charger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={clearText} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>Effacer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.prompterPanel, { height: panelHeight }]}> 
          <TeleprompterView
            text={prompter.text}
            offsetY={prompter['offsetY']}
            height={panelHeight}
            fontSize={prompter.fontSize}
            lineHeightMultiplier={prompter.lineHeightMultiplier}
            twoColumnsEnabled={prompter.twoColumnsEnabled}
            onContentLayout={prompter.setContentHeight}
            mirrored={prompter.mirror}
          />
        </View>

        <View style={styles.controlsContainer}>
          <TeleprompterControls
            isPlaying={prompter.isPlaying}
            onPlayPause={prompter.togglePlay}
            onRestart={prompter.restart}
            wpm={prompter.wpm}
            onWpmChange={prompter.setWpm}
            fontSize={prompter.fontSize}
            onFontSizeChange={prompter.setFontSize}
            twoColumnsEnabled={prompter.twoColumnsEnabled}
            onToggleTwoColumns={prompter.toggleTwoColumns}
            mirrored={prompter.mirror}
            onToggleMirror={prompter.toggleMirror}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1c1c1e' },
  headerBtnText: { color: '#fff', fontSize: 14 },
  content: { flex: 1, padding: 12, gap: 12 },
  prompterPanel: { overflow: 'hidden', borderRadius: 20 },
  controlsContainer: { paddingTop: 4 },
});

export default TeleprompterScreen;


