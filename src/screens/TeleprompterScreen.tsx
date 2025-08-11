import React from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import { Teleprompter } from '../teleprompter';

export const TeleprompterScreen: React.FC = () => {
  const demoText = "Bienvenue dans Naaya — Téléprompteur modulaire. Ceci est un texte de démonstration. Faites défiler automatiquement et ajustez la vitesse, la taille et l'interligne via les contrôles.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Téléprompteur</Text>
      </View>
      <View style={styles.content}>
        <Teleprompter
          text={demoText}
          initialIsPlaying={false}
          initialSpeedPxPerSec={80}
          initialFontSize={22}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default TeleprompterScreen;


