/**
 * Exemple d'utilisation de l'égaliseur audio moderne
 * Démontre l'intégration et les fonctionnalités principales
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { ModernAudioEqualizer } from '../components';
import { MODERN_THEME } from '../constants/theme';

export const EqualizerExample: React.FC = () => {
  const handleError = (error: Error) => {
    console.error('Erreur de l\'égaliseur:', error);
    // Vous pouvez ajouter ici votre logique de gestion d'erreur
    // Par exemple, afficher un toast ou une alerte
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={MODERN_THEME.colors.background}
      />
      
      {/* Header de l'application */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>Mon Application Audio</Text>
        <Text style={styles.appSubtitle}>Égaliseur Professionnel</Text>
      </View>
      
      {/* Composant de l'égaliseur moderne */}
      <ModernAudioEqualizer
        enableSpectrum={true}
        onError={handleError}
      />
      
      {/* Footer avec informations */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Double-tap sur un slider pour réinitialiser à 0 dB
        </Text>
        <Text style={styles.footerText}>
          Glissez horizontalement pour voir toutes les fréquences
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Exemple avec configuration personnalisée
export const CustomEqualizerExample: React.FC = () => {
  const [equalizerEnabled, setEqualizerEnabled] = React.useState(false);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={MODERN_THEME.colors.background}
      />
      
      <View style={styles.customContainer}>
        {/* Votre interface personnalisée */}
        <View style={styles.customHeader}>
          <Text style={styles.customTitle}>Lecteur Audio</Text>
          {equalizerEnabled && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>EQ ON</Text>
            </View>
          )}
        </View>
        
        {/* Intégration de l'égaliseur */}
        <View style={styles.equalizerWrapper}>
          <ModernAudioEqualizer
            enableSpectrum={true}
            onError={(error) => {
              console.error('Erreur EQ:', error);
            }}
          />
        </View>
        
        {/* Contrôles audio personnalisés */}
        <View style={styles.audioControls}>
          {/* Ajoutez vos contrôles de lecture ici */}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MODERN_THEME.colors.background,
  },
  appHeader: {
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingVertical: MODERN_THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_THEME.colors.border.default,
  },
  appTitle: {
    fontSize: MODERN_THEME.typography.fontSize.xxl,
    fontWeight: '700',
    color: MODERN_THEME.colors.text.primary,
    marginBottom: MODERN_THEME.spacing.xs,
  },
  appSubtitle: {
    fontSize: MODERN_THEME.typography.fontSize.md,
    color: MODERN_THEME.colors.text.secondary,
  },
  footer: {
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingVertical: MODERN_THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: MODERN_THEME.colors.border.default,
  },
  footerText: {
    fontSize: MODERN_THEME.typography.fontSize.sm,
    color: MODERN_THEME.colors.text.tertiary,
    textAlign: 'center',
    marginVertical: MODERN_THEME.spacing.xs,
  },
  customContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MODERN_THEME.spacing.md,
    paddingVertical: MODERN_THEME.spacing.md,
  },
  customTitle: {
    fontSize: MODERN_THEME.typography.fontSize.xl,
    fontWeight: '600',
    color: MODERN_THEME.colors.text.primary,
  },
  badge: {
    backgroundColor: MODERN_THEME.colors.primary.base,
    paddingHorizontal: MODERN_THEME.spacing.sm,
    paddingVertical: MODERN_THEME.spacing.xs,
    borderRadius: MODERN_THEME.borderRadius.sm,
  },
  badgeText: {
    fontSize: MODERN_THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: MODERN_THEME.colors.text.primary,
  },
  equalizerWrapper: {
    flex: 1,
  },
  audioControls: {
    height: 100,
    backgroundColor: MODERN_THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: MODERN_THEME.colors.border.default,
  },
});

export default EqualizerExample;