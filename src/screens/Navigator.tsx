import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RealCameraViewScreen } from './RealCameraViewScreen';

// Lazy loading des écrans non critiques
const TeleprompterScreen = lazy(() => import('./TeleprompterScreen'));
const TextEditorScreen = lazy(() => import('./TextEditorScreen'));
const ProfileScreen = lazy(() => import('./ProfileScreen'));
const LoginScreen = lazy(() => import('./LoginScreen'));

// Composant de chargement pendant le lazy loading
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Wrapper pour les écrans lazy loaded
const LazyScreen = ({ Screen }: { Screen: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<LoadingScreen />}>
    <Screen />
  </Suspense>
);

type AppRouteName = 'Camera' | 'Teleprompter' | 'Editeur' | 'Vidéos';

export const AppNavigator: React.FC = () => {
  const [route, setRoute] = React.useState<AppRouteName>('Teleprompter');

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
        <TouchableOpacity
          style={[styles.navButton, route === 'Vidéos' && styles.navButtonActive]}
          onPress={() => setRoute('Vidéos')}
        >
          <Text style={[styles.navButtonText, route === 'Vidéos' && styles.navButtonTextActive]}>Vidéos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.screenContainer}>
        {route === 'Camera' ? (
          <RealCameraViewScreen />
        ) : route === 'Teleprompter' ? (
          <LazyScreen Screen={TeleprompterScreen} />
        ) : route === 'Editeur' ? (
          <LazyScreen Screen={TextEditorScreen} />
        ) : (
          <VideoPreviewScreen />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default AppNavigator;


