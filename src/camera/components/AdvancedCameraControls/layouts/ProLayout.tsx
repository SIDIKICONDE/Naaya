/**
 * Layout professionnel pour tablettes et mode pro
 * Interface complète avec tous les contrôles avancés et panneaux
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RecordingBar } from '../components/RecordingBar';
import type { LayoutProps } from '../types';

// Icônes Unicode simples pour remplacer lucide-react-native
const ICONS = {
  APERTURE: '🔘',
  FILTER: '🔍',
  GRID: '⊞',
  PALETTE: '🎨',
  PAUSE: '⏸️',
  PLAY: '▶️',
  RECORD: '🔴',
  SETTINGS: '⚙️',
  SLIDERS: '🎛️',
  STOP: '⏹️',
  SWITCH_CAMERA: '🔄',
  TIMER: '⏱️',
  VIDEO: '🎥',
  ZOOM: '🔍',
};

export const ProLayout = memo<LayoutProps>(({ 
  context,
  recordingState,
  recordingMetadata,
  theme,
  onAction,
  style,
}) => {


  // État des contrôles selon le mode
  const controlStates = useMemo(() => ({
    flashDisabled: recordingState === 'recording' || recordingState === 'processing',
    switchDisabled: recordingState === 'recording' || recordingState === 'processing',
    galleryDisabled: recordingState !== 'idle',
    // Photo supprimée
    recordDisabled: false, // Toujours permettre l'enregistrement
    settingsDisabled: recordingState === 'recording',
  }), [recordingState]);


  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      {/* Fond avec couleur unie */}
      <View
        style={[
          styles.gradient,
          { backgroundColor: 'rgba(0, 0, 0, 0.3)' }
        ]}
        pointerEvents="none"
      />

      {/* Barre de contrôles du haut */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.topBarGradient,
            { backgroundColor: 'rgba(0, 0, 0, 0.45)' }
          ]}
        >
          <View style={styles.topBarContent}>
            {/* Groupe gauche retiré (flash, timer, grille déplacés) */}

            {/* Indicateurs centraux */}
            <View style={styles.topBarCenter}>
              {context.zoomLevel > 1 && (
                <Text style={[styles.zoomText, { color: theme.accentColor }]}>
                  {context.zoomLevel.toFixed(1)}x
                </Text>
              )}
            </View>

            {/* Groupe droite retiré (exposition, couleur, paramètres déplacés) */}
          </View>
        </View>
      </View>

      {/* Contrôles latéraux retirés au profit du menu trois points */}

      {/* Barre d'enregistrement professionnelle */}
      {(recordingState === 'recording' || recordingState === 'paused' || recordingState === 'processing') && (
        <View style={styles.recordingBarContainer}>
          <RecordingBar
            recordingState={recordingState}
            durationSec={recordingMetadata?.duration || 0}
            theme={theme}
            disabled={controlStates.recordDisabled}
            onRecordPress={() => onAction('record')}
            onPausePress={() => onAction('pause')}
            fps={recordingMetadata?.frameRate || 30}
          />
        </View>
      )}

      {/* Barre de contrôles du bas simplifiée */}
      {recordingState === 'idle' && (
        <View style={styles.bottomBar}>
          <View
            style={[
              styles.bottomBarGradient,
              { backgroundColor: 'rgba(0, 0, 0, 0.55)' }
            ]}
          >
            <View style={styles.bottomBarContent}>
              {/* Bouton d'enregistrement principal pour démarrer */}
              <View style={styles.recordingControls}>
                <TouchableOpacity
                  style={styles.startRecordButton}
                  disabled={controlStates.recordDisabled}
                  onPress={() => onAction('record')}
                  onLongPress={() => onAction('recordHold')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.startRecordIcon}>{ICONS.RECORD}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Panneaux retirés : actions désormais accessibles via le menu trois points */}
    </View>
  );
});

ProLayout.displayName = 'ProLayout';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  
  // Barre du haut
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 5,
  },
  topBarGradient: {
    flex: 1,
    paddingTop: 40,
  },
  topBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  topBarCenter: {
    alignItems: 'center',
    gap: 4,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconText: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  recordIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 32,
  },

  // Conteneur pour la RecordingBar
  recordingBarContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },

  // Bouton de démarrage d'enregistrement
  startRecordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  startRecordIcon: {
    fontSize: 36,
    color: '#FFFFFF',
  },

  // Panneaux latéraux
  leftPanel: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -80,
    zIndex: 3,
  },
  rightPanel: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -80,
    zIndex: 3,
  },
  sideControls: {
    gap: 12,
    alignItems: 'center',
  },

  // Barre du bas
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 5,
  },
  bottomBarGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  recordButtonContainer: {},
  photoButton: {
    marginLeft: 20,
  },

  // Contenu des panneaux
  panelContent: {
    padding: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  panelDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  activeFilters: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 5,
  },
  filterName: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
