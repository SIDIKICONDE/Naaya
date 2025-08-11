import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { VideoPreviewScreen } from '../videoLibrary/screens/VideoPreviewScreen';

import { HomeScreen } from './HomeScreen';
import { RealCameraViewScreen } from './RealCameraViewScreen';

import { TextEditorScreen } from './TextEditorScreen';
import { routeBus } from './routeBus';
import type { AppRouteName } from './routes';

export const AppNavigator: React.FC = () => {
  const [route, setRoute] = useState<AppRouteName>('Home');

  // Listen to external route events (e.g., from three-dots menu)
  useEffect(() => {
    const unsub = routeBus.subscribe((newRoute) => {
      console.log('[Navigator] Route change:', newRoute);
      setRoute(newRoute);
    });
    return () => { unsub(); };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        {route === 'Home' && <HomeScreen />}
        {route === 'Camera' && <RealCameraViewScreen />}
        {route === 'Editeur' && <TextEditorScreen />}
        {route === 'Vidéos' && <VideoPreviewScreen />}
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


