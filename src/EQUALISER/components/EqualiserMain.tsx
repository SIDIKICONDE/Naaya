/**
 * Composant principal de l'égaliseur professionnel
 * Interface complète avec design moderne et modulaire
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EQUALISER_THEMES, HELP_MESSAGES } from '../constants';
import { useEqualiser } from '../hooks/useEqualiser';
import { ConfigurationModal } from './ConfigurationModal';
import { EqualiserControls } from './EqualiserControls';
import { FrequencyBandSlider } from './FrequencyBandSlider';
import { FrequencyResponseGraph } from './FrequencyResponseGraph';
import { PresetManager } from './PresetManager';
import { SpectrumAnalyser } from './SpectrumAnalyser';

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
  const [bandMode, setBandMode] = useState<'simple' | 'professional'>('simple');

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
    switchBandMode,
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
    setBandGain(bandId, gain);
  }, [setBandGain]);

  const handleBandSolo = useCallback((bandId: string) => {
    setSoloBand(soloedBand === bandId ? null : bandId);
  }, [soloedBand, setSoloBand]);

  const handleBandModeChange = useCallback(async (mode: 'simple' | 'professional') => {
    setBandMode(mode);
    await switchBandMode(mode);
  }, [switchBandMode]);

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

  // Grouper les bandes par plage de fréquences
  const groupedBands = useMemo(() => {
    const groups = {
      bass: bands.filter(b => b.frequency < 250),
      midrange: bands.filter(b => b.frequency >= 250 && b.frequency < 2000),
      treble: bands.filter(b => b.frequency >= 2000),
    };
    return groups;
  }, [bands]);

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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>
            Égaliseur Professionnel
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { 
              backgroundColor: enabled ? colors.success : colors.textSecondary 
            }]} />
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
          >
            <Text style={[styles.iconButtonText, { color: colors.text }]}>?</Text>
          </TouchableOpacity>
          
          {onClose && (
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
              onPress={onClose}
            >
              <Text style={[styles.iconButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Message d'aide */}
      {showHelp && (
        <View style={[styles.helpBanner, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.helpText, { color: colors.primary }]}>
            {HELP_MESSAGES.gain}
          </Text>
        </View>
      )}

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                style={[styles.modeButton, { 
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                }]}
                onPress={() => setViewMode(viewMode === 'bands' ? 'graph' : 'bands')}
              >
                <Text style={[styles.modeButtonText, { color: colors.primary }]}>
                  {viewMode === 'bands' ? '📊 Graphique' : '🎚️ Bandes'}
                </Text>
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
            onSelectPreset={setPreset}
            onReset={resetAllBands}
            theme={colors}
            disabled={!enabled || bypassed}
          />
        </View>

        {/* Vue des bandes ou graphique */}
        {viewMode === 'bands' ? (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.bandModeSelector}>
              <TouchableOpacity
                style={[
                  styles.bandModeButton,
                  bandMode === 'simple' && styles.bandModeButtonActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => handleBandModeChange('simple')}
              >
                <Text style={[
                  styles.bandModeButtonText,
                  { color: bandMode === 'simple' ? colors.primary : colors.textSecondary }
                ]}>
                  Simple (10 bandes)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.bandModeButton,
                  bandMode === 'professional' && styles.bandModeButtonActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => handleBandModeChange('professional')}
              >
                <Text style={[
                  styles.bandModeButtonText,
                  { color: bandMode === 'professional' ? colors.primary : colors.textSecondary }
                ]}>
                  Pro (31 bandes)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bandes de fréquences groupées */}
            <View style={styles.bandsContainer}>
              {/* Basses */}
              <View style={styles.bandGroup}>
                <Text style={[styles.bandGroupTitle, { color: colors.textSecondary }]}>
                  BASSES
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bandGroupContent}
                >
                  {groupedBands.bass.map(band => (
                    <FrequencyBandSlider
                      key={band.id}
                      band={band}
                      magnitude={spectrumData?.magnitudes[band.index] || 0}
                      onGainChange={handleBandGainChange}
                      onSolo={() => handleBandSolo(band.id)}
                      isSoloed={soloedBand === band.id}
                      disabled={!enabled || bypassed}
                      theme={colors}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Médiums */}
              <View style={styles.bandGroup}>
                <Text style={[styles.bandGroupTitle, { color: colors.textSecondary }]}>
                  MÉDIUMS
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bandGroupContent}
                >
                  {groupedBands.midrange.map(band => (
                    <FrequencyBandSlider
                      key={band.id}
                      band={band}
                      magnitude={spectrumData?.magnitudes[band.index] || 0}
                      onGainChange={handleBandGainChange}
                      onSolo={() => handleBandSolo(band.id)}
                      isSoloed={soloedBand === band.id}
                      disabled={!enabled || bypassed}
                      theme={colors}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Aigus */}
              <View style={styles.bandGroup}>
                <Text style={[styles.bandGroupTitle, { color: colors.textSecondary }]}>
                  AIGUS
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bandGroupContent}
                >
                  {groupedBands.treble.map(band => (
                    <FrequencyBandSlider
                      key={band.id}
                      band={band}
                      magnitude={spectrumData?.magnitudes[band.index] || 0}
                      onGainChange={handleBandGainChange}
                      onSolo={() => handleBandSolo(band.id)}
                      isSoloed={soloedBand === band.id}
                      disabled={!enabled || bypassed}
                      theme={colors}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
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
              disabled={!enabled}
            />
          </View>
        )}

        {/* Message d'erreur */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.danger + '20' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              ⚠️ {error.message}
            </Text>
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
  bandModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  bandModeButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  bandModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bandsContainer: {
    gap: 20,
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
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
