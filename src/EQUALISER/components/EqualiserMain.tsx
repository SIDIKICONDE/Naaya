/**
 * Composant principal de l'égaliseur professionnel
 * Interface complète avec design moderne et modulaire
 */

import { BarChart3, HelpCircle, Sliders, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EQUALISER_THEMES, HELP_MESSAGES } from '../constants/index';
import { useEqualiser } from '../hooks/useEqualiser';
import { ConfigurationModal } from './ConfigurationModal';
import { EqualiserControls } from './EqualiserControls';
// import { FrequencyBandSlider } from './FrequencyBandSlider';
import { FrequencyResponseGraph } from './FrequencyResponseGraph';
import { PresetManager } from './PresetManager';
import { SpectrumAnalyser } from './SpectrumAnalyser';
import TenBandSliderRow from './TenBandSliderRow';

interface EqualiserMainProps {
  theme?: 'light' | 'dark';
  onClose?: () => void;
  showAdvancedControls?: boolean;
  enableAutomation?: boolean;
}

export const EqualiserMain: React.FC<EqualiserMainProps> = ({
  theme = 'dark',
  onClose,
  showAdvancedControls = true,
  // enableAutomation = false, // Pour une future implémentation
}) => {
  const colors = EQUALISER_THEMES[theme];
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'bands' | 'graph'>('bands');
  // Mode unique: simple (10 bandes)

  const {
    enabled,
    bypassed,
    bands,
    currentPreset,
    spectrumData,
    soloedBand,
    inputGain,
    outputGain,
    isLoading,
    error,
    setEnabled,
    setBypass,
    setBandGain,
    setSoloBand,
    setPreset,
    resetAllBands,
    setInputGain,
    setOutputGain,
    exportConfig,
    importConfig,
    presets,
  } = useEqualiser({
    enableSpectrum: true,
    autoSave: true,
  });

  // Animation pour le changement d'état
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isLoading ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isLoading, fadeAnim]);

  // Gestionnaires
  const handleBandGainChange = useCallback((bandId: string, gain: number) => {
    if (!enabled) {
      // Activer automatiquement l'égaliseur au premier mouvement
      setEnabled(true).catch(() => {});
    }
    setBandGain(bandId, gain);
  }, [enabled, setEnabled, setBandGain]);

  const handleBandSolo = useCallback((bandId: string) => {
    setSoloBand(soloedBand === bandId ? null : bandId);
  }, [soloedBand, setSoloBand]);

  // Plus de changement de configuration de bandes: 10 bandes fixes

  const handlePresetSelect = useCallback(async (presetId: string) => {
    if (!enabled) {
      try { await setEnabled(true); } catch {}
    }
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: setPreset exceeded 5s')), 5000);
      });
      await Promise.race([setPreset(presetId), timeoutPromise]);
    } catch (e) {}
  }, [enabled, setEnabled, setPreset]);

  const handleExport = useCallback(() => {
    // La configuration sera affichée dans le modal
    setShowConfig(true);
  }, []);

  const handleImport = useCallback(async (configJson: string) => {
    try {
      await importConfig(configJson);
      setShowConfig(false);
    } catch (err) {
      console.error('Erreur import config:', err);
    }
  }, [importConfig]);

  // Tri des bandes par index/fréquence pour l'affichage en ligne unique
  // const sortedBands = useMemo(() => {
  //   return [...bands].sort((a, b) => a.index - b.index);
  // }, [bands]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de l'égaliseur...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        stickyHeaderIndices={[0]}
      >
        {/* Header sticky */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Égaliseur Professionnel</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: enabled ? colors.success : colors.textSecondary },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {enabled ? 'Actif' : 'Inactif'}
                {bypassed && ' (Bypass)'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowHelp(!showHelp)}
              accessibilityLabel="Aide"
            >
              <HelpCircle size={18} color={colors.text} />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                onPress={onClose}
                accessibilityLabel="Fermer"
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Message d'aide */}
        {showHelp && (
          <View
            style={[
              styles.helpBanner,
              { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary },
            ]}
          >
            <Text style={[styles.helpText, { color: colors.primary }]}>{HELP_MESSAGES.gain}</Text>
          </View>
        )}
        {/* Contrôles principaux */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.mainControls}>
            <View style={styles.controlItem}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                Égaliseur
              </Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{
                  false: colors.border,
                  true: colors.primary,
                }}
                thumbColor={enabled ? '#FFFFFF' : colors.textSecondary}
              />
            </View>

            <View style={styles.controlItem}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                Bypass
              </Text>
              <Switch
                value={bypassed}
                onValueChange={setBypass}
                trackColor={{
                  false: colors.border,
                  true: colors.warning,
                }}
                thumbColor={bypassed ? '#FFFFFF' : colors.textSecondary}
                disabled={!enabled}
              />
            </View>

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: colors.primary + '20',
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setViewMode(viewMode === 'bands' ? 'graph' : 'bands')}
                accessibilityLabel={viewMode === 'bands' ? 'Passer au graphique' : 'Passer aux bandes'}
              >
                {viewMode === 'bands' ? (
                  <View style={styles.modeContent}>
                    <BarChart3 size={16} color={colors.primary} />
                    <Text style={[styles.modeButtonText, { color: colors.primary }]}>Graphique</Text>
                  </View>
                ) : (
                  <View style={styles.modeContent}>
                    <Sliders size={16} color={colors.primary} />
                    <Text style={[styles.modeButtonText, { color: colors.primary }]}>Bandes</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Analyseur de spectre */}
        {enabled && !bypassed && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Analyse en temps réel
            </Text>
            <SpectrumAnalyser
              data={spectrumData}
              bands={bands}
              theme={colors}
              height={150}
            />
          </View>
        )}

        {/* Préréglages */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <PresetManager
            currentPreset={currentPreset}
            presets={presets}
            onSelectPreset={handlePresetSelect}
            onReset={resetAllBands}
            theme={colors}
            disabled={false}
          />
        </View>

        {/* Vue des bandes ou graphique */}
        {viewMode === 'bands' ? (
          <View style={[styles.section, { backgroundColor: colors.surface }]}> 
            <TenBandSliderRow
              bands={bands}
              spectrumData={spectrumData}
              soloedBandId={soloedBand}
              disabled={bypassed}
              theme={colors}
              onGainChange={handleBandGainChange}
              onSolo={handleBandSolo}
            />
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <FrequencyResponseGraph
              bands={bands}
              theme={colors}
              height={300}
            />
          </View>
        )}

        {/* Contrôles avancés */}
        {showAdvancedControls && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <EqualiserControls
              inputGain={inputGain}
              outputGain={outputGain}
              onInputGainChange={setInputGain}
              onOutputGainChange={setOutputGain}
              onExport={handleExport}
              onImport={() => setShowConfig(true)}
              theme={colors}
              disabled={false}
            />
          </View>
        )}

        {/* Message d'erreur */}
        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.danger + '20', borderLeftColor: colors.danger },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.danger }]}>{error.message}</Text>
          </View>
        )}
      </Animated.ScrollView>

      {/* Modal de configuration */}
      <ConfigurationModal
        visible={showConfig}
        onClose={() => setShowConfig(false)}
        onImport={handleImport}
        exportedConfig={exportConfig()}
        theme={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlItem: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bandModeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Styles legacy band mode supprimés
  singleRowContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  bandGroup: {
    marginBottom: 16,
  },
  bandGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  bandGroupContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
