/**
 * Exemple d'utilisation de l'égaliseur professionnel
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { EqualiserMain } from './components';

export const EqualiserExample: React.FC = () => {
  const [showEqualiser, setShowEqualiser] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.openButton}
        onPress={() => setShowEqualiser(true)}
      >
        <Text style={styles.openButtonText}>
          🎛️ Ouvrir l'égaliseur
        </Text>
      </TouchableOpacity>

      {showEqualiser && (
        <View style={styles.equaliserContainer}>
          <EqualiserMain
            theme={theme}
            onClose={() => setShowEqualiser(false)}
            showAdvancedControls={true}
            enableAutomation={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  equaliserContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
});
