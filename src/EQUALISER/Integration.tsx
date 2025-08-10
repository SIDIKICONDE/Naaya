/**
 * Guide d'intégration pour remplacer l'ancien égaliseur
 * 
 * Pour remplacer l'ancien égaliseur par le nouveau :
 * 
 * 1. Remplacez les imports :
 *    AVANT:
 *    import { AudioEqualizer } from '../audio/components/AudioEqualizer';
 *    import { EqualizerControl } from '../audio/components/EqualizerControl';
 *    
 *    APRÈS:
 *    import { EqualiserMain } from '../EQUALISER';
 * 
 * 2. Remplacez l'utilisation :
 *    AVANT:
 *    <EqualizerControl onClose={handleClose} showSpectrum={true} />
 *    
 *    APRÈS:
 *    <EqualiserMain onClose={handleClose} theme="dark" />
 * 
 * 3. Le nouveau service est compatible avec l'ancien :
 *    - Les mêmes fonctions natives sont utilisées
 *    - La structure des données est compatible
 *    - Les préréglages sont améliorés mais compatibles
 */

import React from 'react';
import { Modal, View, useColorScheme } from 'react-native';
import { EqualiserMain } from './components';

interface EqualiserIntegrationProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Composant de remplacement direct pour EqualizerControl
 */
export const EqualiserIntegration: React.FC<EqualiserIntegrationProps> = ({
  visible,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  if (!visible) return null;

  // Version Modal (recommandée)
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <EqualiserMain 
        theme={theme}
        onClose={onClose}
        showAdvancedControls={true}
      />
    </Modal>
  );
};

/**
 * Version inline (sans modal)
 */
export const EqualiserInline: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <View style={{ flex: 1 }}>
      <EqualiserMain 
        theme={theme}
        onClose={onClose}
        showAdvancedControls={true}
      />
    </View>
  );
};

/**
 * Hook de migration pour compatibilité avec l'ancien useEqualizer
 */
export function useEqualizerCompat() {
  const newHook = require('./hooks/useEqualiser').useEqualiser();
  
  // Mapper les nouvelles propriétés vers les anciennes pour compatibilité
  return {
    isEnabled: newHook.enabled,
    currentPreset: newHook.currentPreset,
    bands: newHook.bands.map(b => ({
      index: b.index,
      frequency: b.frequency,
      gain: b.gain,
      label: b.label,
    })),
    spectrumData: newHook.spectrumData?.magnitudes || null,
    isLoading: newHook.isLoading,
    error: newHook.error,
    setEnabled: newHook.setEnabled,
    setBandGain: (index: number, gain: number) => {
      const band = newHook.bands.find(b => b.index === index);
      if (band) {
        newHook.setBandGain(band.id, gain);
      }
    },
    setPreset: newHook.setPreset,
    reset: newHook.resetAllBands,
  };
}
