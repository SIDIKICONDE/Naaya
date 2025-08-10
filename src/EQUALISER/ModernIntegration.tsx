/**
 * Fichier d'intégration pour l'égaliseur moderne
 * Facilite l'utilisation dans l'application principale
 */

import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ModernEqualiserMain } from './components/ModernEqualiserMain';

interface ModernEqualiserIntegrationProps {
  visible: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'neon';
  initialPreset?: string;
}

/**
 * Composant d'intégration de l'égaliseur moderne
 * Peut être utilisé comme modal ou intégré directement
 */
export const ModernEqualiserModal: React.FC<ModernEqualiserIntegrationProps> = ({
  visible,
  onClose,
  theme = 'dark',
  initialPreset,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <ModernEqualiserMain
        theme={theme}
        onClose={onClose}
        initialPreset={initialPreset}
      />
    </Modal>
  );
};

/**
 * Composant d'intégration inline (sans modal)
 */
export const ModernEqualiserInline: React.FC<{
  theme?: 'dark' | 'light' | 'neon';
  initialPreset?: string;
  onClose?: () => void;
}> = ({ theme = 'dark', initialPreset, onClose }) => {
  return (
    <View style={styles.container}>
      <ModernEqualiserMain
        theme={theme}
        onClose={onClose}
        initialPreset={initialPreset}
      />
    </View>
  );
};

/**
 * Hook pour utiliser l'égaliseur avec état global
 */
export const useModernEqualiser = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [theme, setTheme] = React.useState<'dark' | 'light' | 'neon'>('dark');
  const [preset, setPreset] = React.useState<string>('flat');

  const openEqualiser = React.useCallback((options?: {
    theme?: 'dark' | 'light' | 'neon';
    preset?: string;
  }) => {
    if (options?.theme) setTheme(options.theme);
    if (options?.preset) setPreset(options.preset);
    setIsVisible(true);
  }, []);

  const closeEqualiser = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    theme,
    preset,
    openEqualiser,
    closeEqualiser,
    setTheme,
    setPreset,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

