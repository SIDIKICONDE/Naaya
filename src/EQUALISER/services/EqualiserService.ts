/**
 * Service principal de gestion de l'égaliseur professionnel
 */

import NativeAudioEQ from '../../../specs/NativeAudioEqualizerModule';
import {
  EQUALISER_LIMITS,
  PROFESSIONAL_FREQUENCY_BANDS,
  PROFESSIONAL_PRESETS,
  SIMPLE_FREQUENCY_BANDS,
} from '../constants';
import {
  AudioAnalysis,
  BandAutomation,
  EqualiserBand,
  EqualiserConfig,
  EqualiserState,
  SpectrumAnalyserData
} from '../types';

type EventCallback<T = any> = (data: T) => void;
type UnsubscribeFn = () => void;

interface EqualiserEvents {
  stateChanged: EqualiserState;
  bandChanged: { bandId: string; gain: number; frequency?: number; q?: number };
  presetChanged: string | null;
  enabledChanged: boolean;
  bypassChanged: boolean;
  spectrumData: SpectrumAnalyserData;
  audioAnalysis: AudioAnalysis;
  error: Error;
  automationUpdated: BandAutomation;
}

class ProfessionalEqualiserService {
  private state: EqualiserState;
  private listeners: Map<keyof EqualiserEvents, Set<EventCallback>> = new Map();
  private spectrumInterval: number | null = null;
  private analysisInterval: number | null = null;
  private automationTimers: Map<string, number> = new Map();
  private batchMode: boolean = false;
  private pendingUpdates: Partial<EqualiserState> = {};

  constructor() {
    // État initial
    this.state = {
      enabled: false,
      bypassed: false,
      currentPreset: null,
      bands: this.initializeBands(),
      outputGain: 0,
      inputGain: 0,
      analysisEnabled: false,
      spectrumData: null,
      compareMode: false,
      soloedBand: null,
    };

    // Initialiser depuis le natif
    this.initializeFromNative();
  }

  // === Gestion des événements ===
  
  on<K extends keyof EqualiserEvents>(
    event: K,
    callback: EventCallback<EqualiserEvents[K]>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Retourner une fonction de désinscription
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit<K extends keyof EqualiserEvents>(
    event: K,
    data: EqualiserEvents[K]
  ): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // === Initialisation ===

  private initializeBands(): EqualiserBand[] {
    const baseBands = this.getDefaultBands();
    return baseBands.map(band => ({
      ...band,
      gain: 0,
      color: this.getFrequencyColor(band.frequency),
    }));
  }

  private getDefaultBands() {
    // Utiliser les bandes simples par défaut, peut être changé dynamiquement
    return SIMPLE_FREQUENCY_BANDS;
  }

  private async initializeFromNative(): Promise<void> {
    try {
      // Récupérer l'état depuis le module natif
      const enabled = Boolean(NativeAudioEQ.getEQEnabled());
      const nativePreset = NativeAudioEQ.getCurrentPreset();
      
      // Mapper les gains des bandes
      const bands = this.state.bands.map((band, index) => ({
        ...band,
        gain: this.safeGetBandGain(index),
      }));

      // Mettre à jour l'état
      this.updateState({
        enabled,
        currentPreset: this.mapNativePresetToId(nativePreset),
        bands,
      });

    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  private safeGetBandGain(index: number): number {
    try {
      return NativeAudioEQ.getBandGain(index) ?? 0;
    } catch {
      return 0;
    }
  }

  // === API Publique ===

  getState(): Readonly<EqualiserState> {
    return { ...this.state };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      NativeAudioEQ.setEQEnabled(enabled);
      this.updateState({ enabled });
      this.emit('enabledChanged', enabled);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setBypass(bypassed: boolean): Promise<void> {
    try {
      // Implémenter le bypass en désactivant temporairement
      if (bypassed) {
        NativeAudioEQ.setEQEnabled(false);
      } else {
        NativeAudioEQ.setEQEnabled(this.state.enabled);
      }
      this.updateState({ bypassed });
      this.emit('bypassChanged', bypassed);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setBandGain(bandId: string, gain: number): Promise<void> {
    const band = this.state.bands.find(b => b.id === bandId);
    if (!band) throw new Error(`Band ${bandId} not found`);

    const clampedGain = Math.max(
      EQUALISER_LIMITS.MIN_GAIN,
      Math.min(EQUALISER_LIMITS.MAX_GAIN, gain)
    );

    try {
      if (!this.batchMode) {
        NativeAudioEQ.setBandGain(band.index, clampedGain);
      }

      const updatedBands = this.state.bands.map(b =>
        b.id === bandId ? { ...b, gain: clampedGain } : b
      );

      this.updateState({ bands: updatedBands, currentPreset: null });
      this.emit('bandChanged', { bandId, gain: clampedGain });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setBandParameters(
    bandId: string,
    params: { gain?: number; frequency?: number; q?: number }
  ): Promise<void> {
    const band = this.state.bands.find(b => b.id === bandId);
    if (!band) throw new Error(`Band ${bandId} not found`);

    try {
      // Pour l'instant, on ne supporte que le gain
      // Les fréquences et Q pourraient être supportés dans une version future
      if (params.gain !== undefined) {
        await this.setBandGain(bandId, params.gain);
      }

      if (params.frequency !== undefined || params.q !== undefined) {
        // Émettre les changements même si pas encore supportés par le natif
        this.emit('bandChanged', {
          bandId,
          gain: band.gain,
          frequency: params.frequency,
          q: params.q,
        });
      }
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setSoloBand(bandId: string | null): Promise<void> {
    this.updateState({ soloedBand: bandId });
    
    // Implémenter la logique solo
    if (bandId) {
      // Mettre toutes les autres bandes à -inf sauf celle en solo
      for (const band of this.state.bands) {
        if (band.id === bandId) {
          NativeAudioEQ.setBandGain(band.index, band.gain);
        } else {
          NativeAudioEQ.setBandGain(band.index, EQUALISER_LIMITS.MIN_GAIN);
        }
      }
    } else {
      // Restaurer les gains normaux
      for (const band of this.state.bands) {
        NativeAudioEQ.setBandGain(band.index, band.gain);
      }
    }
  }

  async setPreset(presetId: string): Promise<void> {
    const preset = PROFESSIONAL_PRESETS.find(p => p.id === presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);

    try {
      this.beginBatch();

      // Appliquer les gains du preset
      for (const band of this.state.bands) {
        const gain = preset.bands[band.id] ?? 0;
        await this.setBandGain(band.id, gain);
      }

      this.endBatch();

      this.updateState({ currentPreset: presetId });
      this.emit('presetChanged', presetId);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async resetAllBands(): Promise<void> {
    try {
      this.beginBatch();

      for (const band of this.state.bands) {
        await this.setBandGain(band.id, 0);
      }

      this.endBatch();

      this.updateState({ currentPreset: 'flat' });
      this.emit('presetChanged', 'flat');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setInputGain(gain: number): Promise<void> {
    const clampedGain = Math.max(-24, Math.min(24, gain));
    this.updateState({ inputGain: clampedGain });
    // Implémenter si supporté par le natif
  }

  async setOutputGain(gain: number): Promise<void> {
    const clampedGain = Math.max(-24, Math.min(24, gain));
    this.updateState({ outputGain: clampedGain });
    // Implémenter si supporté par le natif
  }

  // === Analyse du spectre ===

  async startSpectrumAnalysis(intervalMs: number = 50): Promise<void> {
    if (this.spectrumInterval) return;

    try {
      NativeAudioEQ.startSpectrumAnalysis();
      this.updateState({ analysisEnabled: true });

      this.spectrumInterval = setInterval(() => {
        try {
          const rawData = NativeAudioEQ.getSpectrumData();
          if (rawData && Array.isArray(rawData)) {
            const spectrumData: SpectrumAnalyserData = {
              frequencies: this.state.bands.map(b => b.frequency),
              magnitudes: rawData.map(v => Math.max(0, Math.min(1, v))),
              peaks: this.detectPeaks(rawData),
              timestamp: Date.now(),
            };
            
            this.updateState({ spectrumData });
            this.emit('spectrumData', spectrumData);
          }
        } catch (error) {
          console.error('Error getting spectrum data:', error);
        }
      }, intervalMs) as unknown as number;

    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async stopSpectrumAnalysis(): Promise<void> {
    if (this.spectrumInterval) {
      clearInterval(this.spectrumInterval);
      this.spectrumInterval = null;
    }

    try {
      NativeAudioEQ.stopSpectrumAnalysis();
      this.updateState({ analysisEnabled: false, spectrumData: null });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  // === Batch operations ===

  beginBatch(): void {
    this.batchMode = true;
    try {
      (NativeAudioEQ as any).beginBatch?.();
    } catch {}
  }

  endBatch(): void {
    this.batchMode = false;
    try {
      (NativeAudioEQ as any).endBatch?.();
    } catch {}
    
    // Appliquer toutes les mises à jour en attente
    if (Object.keys(this.pendingUpdates).length > 0) {
      this.updateState(this.pendingUpdates);
      this.pendingUpdates = {};
    }
  }

  // === Configuration ===

  async switchBandConfiguration(mode: 'simple' | 'professional'): Promise<void> {
    const newBands = mode === 'professional' 
      ? PROFESSIONAL_FREQUENCY_BANDS 
      : SIMPLE_FREQUENCY_BANDS;

    const bands = newBands.map((band, index) => ({
      ...band,
      gain: this.safeGetBandGain(index),
      color: this.getFrequencyColor(band.frequency),
    }));

    this.updateState({ bands });
  }

  exportConfiguration(): EqualiserConfig {
    return {
      bands: this.state.bands,
      preset: this.state.currentPreset,
      enabled: this.state.enabled,
      outputGain: this.state.outputGain,
      inputGain: this.state.inputGain,
      quality: 'high',
      oversamplingRate: 2,
    };
  }

  async importConfiguration(config: EqualiserConfig): Promise<void> {
    try {
      this.beginBatch();

      await this.setEnabled(config.enabled);
      await this.setInputGain(config.inputGain);
      await this.setOutputGain(config.outputGain);

      // Appliquer les gains des bandes
      for (const configBand of config.bands) {
        const band = this.state.bands.find(b => b.frequency === configBand.frequency);
        if (band) {
          await this.setBandGain(band.id, configBand.gain);
        }
      }

      if (config.preset) {
        this.updateState({ currentPreset: config.preset });
      }

      this.endBatch();
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  // === Méthodes utilitaires ===

  private updateState(updates: Partial<EqualiserState>): void {
    if (this.batchMode) {
      this.pendingUpdates = { ...this.pendingUpdates, ...updates };
    } else {
      this.state = { ...this.state, ...updates };
      this.emit('stateChanged', this.state);
    }
  }

  private getFrequencyColor(frequency: number): string {
    // Couleurs basées sur le spectre de fréquences
    if (frequency < 100) return '#FF453A'; // Rouge pour les graves profonds
    if (frequency < 250) return '#FF9F0A'; // Orange pour les graves
    if (frequency < 500) return '#FFD60A'; // Jaune pour les bas-médiums
    if (frequency < 2000) return '#30D158'; // Vert pour les médiums
    if (frequency < 5000) return '#007AFF'; // Bleu pour les hauts-médiums
    if (frequency < 10000) return '#5856D6'; // Indigo pour les aigus
    return '#AF52DE'; // Violet pour les aigus extrêmes
  }

  private detectPeaks(data: number[]): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > 0.3) {
        peaks.push(i);
      }
    }
    return peaks;
  }

  private mapNativePresetToId(nativeName: string): string | null {
    const normalized = nativeName.toLowerCase().replace(/\s+/g, '-');
    return PROFESSIONAL_PRESETS.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '-') === normalized
    )?.id || null;
  }

  // === Nettoyage ===

  dispose(): void {
    this.stopSpectrumAnalysis();
    this.stopAudioAnalysis();
    this.automationTimers.forEach(timer => clearInterval(timer));
    this.automationTimers.clear();
    this.listeners.clear();
  }

  private stopAudioAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }
}

// Singleton
export const EqualiserService = new ProfessionalEqualiserService();
export default EqualiserService;
