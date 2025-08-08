import { useState } from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { RealCameraViewScreen } from './RealCameraViewScreen';
import { TeleprompterScreen } from './TeleprompterScreen';
import { TextEditorScreen } from './TextEditorScreen';

type AppRouteName = 'Camera' | 'Teleprompter' | 'Editeur';

export const AppNavigator: React.FC = () => {
  const [route, setRoute] = useState<AppRouteName>('Teleprompter');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navButton, route === 'Camera' && styles.navButtonActive]}
          onPress={() => setRoute('Camera')}
        >
          <Text style={[styles.navButtonText, route === 'Camera' && styles.navButtonTextActive]}>Caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, route === 'Teleprompter' && styles.navButtonActive]}
          onPress={() => setRoute('Teleprompter')}
        >
          <Text style={[styles.navButtonText, route === 'Teleprompter' && styles.navButtonTextActive]}>Prompteur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, route === 'Editeur' && styles.navButtonActive]}
          onPress={() => setRoute('Editeur')}
        >
          <Text style={[styles.navButtonText, route === 'Editeur' && styles.navButtonTextActive]}>Éditeur</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.screenContainer}>
        {route === 'Camera' ? <RealCameraViewScreen /> : route === 'Teleprompter' ? <TeleprompterScreen /> : <TextEditorScreen />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  navButtonActive: {
    backgroundColor: '#1c1c1e',
  },
  navButtonText: {
    color: '#b0b0b0',
    fontSize: 16,
  },
  navButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
});

export default AppNavigator;


