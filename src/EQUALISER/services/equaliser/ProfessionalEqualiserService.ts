import { EQUALISER_LIMITS, PROFESSIONAL_PRESETS, SIMPLE_FREQUENCY_BANDS } from '../../constants';
import {
  AudioAnalysis,
  BandAutomation,
  EqualiserBand,
  EqualiserConfig,
  EqualiserState,
  SpectrumAnalyserData,
} from '../../types';
import NativeEQBridge from './NativeEQBridge';
import { clamp, detectPeaks, getFrequencyColor } from './utils';

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

export class ProfessionalEqualiserService {
  private state: EqualiserState;
  private listeners: Map<keyof EqualiserEvents, Set<EventCallback>> = new Map();
  private spectrumInterval: number | null = null;
  private analysisInterval: number | null = null;
  private automationTimers: Map<string, number> = new Map();
  private batchMode: boolean = false;
  private pendingUpdates: Partial<EqualiserState> = {};
  private readonly nativeBandLimit: number = 10;
  private applyTaskCounter: number = 0;

  constructor() {
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

    this.initializeFromNative();
    this.filterPresetsToNative();
  }

  // Restreint les presets exposés à ceux supportés nativement (noms identiques)
  private filterPresetsToNative(): void {
    try {
      const nativeNames = NativeEQBridge.getAvailablePresets().map(n => n.toLowerCase());
      // On garde uniquement les presets dont le nom correspond côté natif
      // Map id -> name via constants PROFESSIONAL_PRESETS
      const allowedIds = new Set(
        PROFESSIONAL_PRESETS
          .filter(p => nativeNames.includes(p.name.toLowerCase()))
          .map(p => p.id)
      );
      // Si aucun nom natif disponible, on ne filtre rien
      if (allowedIds.size === 0) return;
      // Mettre à jour l'état courant si preset non supporté
      if (this.state.currentPreset && !allowedIds.has(this.state.currentPreset)) {
        this.updateState({ currentPreset: null });
      }
      // Filtrage logique: rien à faire côté state.bands, le filtrage est consommé par l'UI via useEqualiser().presets
      // Option: exposer une méthode getFilteredPresets() si besoin; ici on ajuste via EqualiserService.getState() + useEqualiser.presets
    } catch {}
  }

  /**
   * Résout un gain de preset (potentiellement 31 bandes) vers la bande simple (10 bandes) la plus proche.
   * - Cherche d'abord une correspondance exacte par id (ex: 'band-32')
   * - Sinon, essaie de convertir l'id du preset en Hz (ex: 'band-1.25k' -> 1250) et choisit la fréquence la plus proche
   * - En dernier recours, 0 dB
   */
  private resolvePresetGainForSimpleBand(
    presetBands: Record<string, number>,
    targetHz: number,
    simpleId: string,
  ): number {
    // 1) Correspondance exacte par id simple
    if (Object.prototype.hasOwnProperty.call(presetBands, simpleId)) {
      return presetBands[simpleId] ?? 0;
    }

    // 2) Convertir tous les ids du preset en Hz si possible
    const entries = Object.entries(presetBands)
      .map(([id, gain]) => {
        const hz = this.parseBandIdToHz(id);
        return hz ? { hz, gain } : null;
      })
      .filter((x): x is { hz: number; gain: number } => !!x);

    if (entries.length === 0) {
      return 0;
    }

    // 3) Choisir l'entrée la plus proche en fréquence
    let best = entries[0];
    let bestDelta = Math.abs(entries[0].hz - targetHz);
    for (let i = 1; i < entries.length; i++) {
      const delta = Math.abs(entries[i].hz - targetHz);
      if (delta < bestDelta) {
        best = entries[i];
        bestDelta = delta;
      }
    }
    return best.gain;
  }

  /**
   * Convertit un id de bande en Hz.
   * Exemples: 'band-32' -> 32, 'band-1k' -> 1000, 'band-1.25k' -> 1250, 'band-20k' -> 20000
   */
  private parseBandIdToHz(id: string): number | null {
    // Retirer le préfixe optionnel
    const raw = id.startsWith('band-') ? id.slice(5) : id;
    // Chercher une forme nombre + optionnel 'k'
    const match = raw.match(/^(\d+(?:\.\d+)?)(k)?$/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    if (Number.isNaN(value)) return null;
    const isKilo = !!match[2];
    return isKilo ? value * 1000 : value;
  }

  on<K extends keyof EqualiserEvents>(
    event: K,
    callback: EventCallback<EqualiserEvents[K]>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit<K extends keyof EqualiserEvents>(event: K, data: EqualiserEvents[K]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {}
    });
  }

  private initializeBands(): EqualiserBand[] {
    const baseBands = SIMPLE_FREQUENCY_BANDS.slice(0, this.nativeBandLimit);
    return baseBands.map((band, index) => ({
      ...band,
      index,
      gain: 0,
      color: getFrequencyColor(band.frequency),
    }));
  }

  // Mode unique simple 10 bandes

  private async initializeFromNative(): Promise<void> {
    try {
      const enabled = NativeEQBridge.getEQEnabled();
      const nativePreset = NativeEQBridge.getCurrentPreset();
      const masterGain = NativeEQBridge.getMasterGain();

      const bands = this.state.bands.map((band, index) => ({
        ...band,
        gain: this.safeGetBandGain(index),
      }));

      this.updateState({
        enabled,
        bypassed: !enabled,
        currentPreset: this.mapNativePresetToId(nativePreset),
        bands,
        outputGain: masterGain,
      });
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  private safeGetBandGain(index: number): number {
    return NativeEQBridge.getBandGain(index);
  }

  getState(): Readonly<EqualiserState> {
    return { ...this.state };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      NativeEQBridge.setEQEnabled(enabled);
      this.updateState({ enabled, bypassed: !enabled });
      this.emit('enabledChanged', enabled);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setBypass(bypassed: boolean): Promise<void> {
    try {
      NativeEQBridge.setEQEnabled(!bypassed);
      this.updateState({ bypassed, enabled: !bypassed });
      this.emit('bypassChanged', bypassed);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setBandGain(bandId: string, gain: number): Promise<void> {
    const band = this.state.bands.find(b => b.id === bandId);
    if (!band) throw new Error(`Band ${bandId} not found`);

    const clampedGain = clamp(gain, EQUALISER_LIMITS.MIN_GAIN, EQUALISER_LIMITS.MAX_GAIN);

    try {
      try {
        NativeEQBridge.setBandGain(band.index, clampedGain);
      } catch {}

      const baseBands = (this.batchMode && (this.pendingUpdates as any).bands
        ? (this.pendingUpdates as any).bands
        : this.state.bands) as EqualiserBand[];

      const updatedBands = baseBands.map(b => (b.id === bandId ? { ...b, gain: clampedGain } : b));

      this.updateState({ bands: updatedBands, ...(this.batchMode ? {} : { currentPreset: null }) });
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
      if (params.gain !== undefined) {
        await this.setBandGain(bandId, params.gain);
      }

      if (params.frequency !== undefined || params.q !== undefined) {
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

    const limitedBands = this.state.bands.slice(0, this.nativeBandLimit);

    if (bandId) {
      for (const band of limitedBands) {
        if (band.id === bandId) {
          NativeEQBridge.setBandGain(band.index, band.gain);
        } else {
          NativeEQBridge.setBandGain(band.index, EQUALISER_LIMITS.MIN_GAIN);
        }
      }
    } else {
      for (const band of limitedBands) {
        NativeEQBridge.setBandGain(band.index, band.gain);
      }
    }
  }

  async setPreset(presetId: string): Promise<void> {
    const preset = PROFESSIONAL_PRESETS.find(p => p.id === presetId);
    if (!preset) throw new Error(`Preset ${presetId} not found`);

    try {
      // Tentative d'appel natif setPreset (le pont peut l'ignorer via coupe-circuit)
      try {
        (NativeEQBridge as any).setPreset?.(preset.name);
      } catch {}

      // Calcul déterministe basé sur la config SIMPLE (10 bandes) pour garantir la synchro
      const sourceBands = SIMPLE_FREQUENCY_BANDS.slice(0, this.nativeBandLimit);
      const newBands: EqualiserBand[] = sourceBands.map((base, index) => ({
        id: base.id,
        index,
        frequency: base.frequency,
        q: base.q,
        type: base.type,
        label: base.label,
        gain: this.resolvePresetGainForSimpleBand(preset.bands, base.frequency, base.id),
        color: getFrequencyColor(base.frequency),
      }));

      // Update UI state rapidement
      this.updateState({ bands: newBands, currentPreset: presetId });
      this.emit('presetChanged', presetId);

      // Application native asynchrone en micro-batch pour éviter les freezes
      const taskId = ++this.applyTaskCounter;
      this.applyBandsToNative(newBands, taskId).catch((error) => {
        this.emit('error', error as Error);
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  private async applyBandsToNative(bands: EqualiserBand[], taskId: number): Promise<void> {
    // Grouper par petits lots et céder la main à l'UI régulièrement
    const chunkSize = 3;
    try {
      NativeEQBridge.beginBatch();
    } catch {}
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      try {
        NativeEQBridge.setBandGain(band.index, band.gain);
      } catch {}
      if ((i + 1) % chunkSize === 0) {
        // YIELD au loop JS pour éviter de bloquer l'UI
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        // Si une nouvelle tâche a démarré, on abandonne celle-ci
        if (taskId !== this.applyTaskCounter) {
          return;
        }
      }
    }
    try {
      NativeEQBridge.endBatch();
    } catch {}
  }

  async resetAllBands(): Promise<void> {
    try {
      this.beginBatch();

      const limitedBands = this.state.bands.slice(0, this.nativeBandLimit);
      const resetBands: EqualiserBand[] = limitedBands.map(b => ({ ...b, gain: 0 }));
      for (const b of resetBands) {
        try {
          NativeEQBridge.setBandGain(b.index, 0);
        } catch {}
      }
      this.updateState({ bands: resetBands });

      this.endBatch();

      this.updateState({ currentPreset: 'flat' });
      this.emit('presetChanged', 'flat');
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async setInputGain(gain: number): Promise<void> {
    const clampedGain = clamp(gain, -24, 24);
    this.updateState({ inputGain: clampedGain });
  }

  async setOutputGain(gain: number): Promise<void> {
    const clampedGain = clamp(gain, -24, 24);
    try {
      NativeEQBridge.setMasterGain(clampedGain);
    } catch {}
    this.updateState({ outputGain: clampedGain });
  }

  async startSpectrumAnalysis(intervalMs: number = 50): Promise<void> {
    if (this.spectrumInterval) return;

    try {
      NativeEQBridge.startSpectrumAnalysis();
      this.updateState({ analysisEnabled: true });

      this.spectrumInterval = setInterval(() => {
        try {
          const rawData = NativeEQBridge.getSpectrumData();
          if (rawData) {
            const spectrumData: SpectrumAnalyserData = {
              frequencies: this.state.bands.map(b => b.frequency),
              magnitudes: rawData.slice(0, 32).map(v => clamp(v, 0, 1)),
              peaks: detectPeaks(rawData.slice(0, 32)),
              timestamp: Date.now(),
            };

            this.updateState({ spectrumData });
            this.emit('spectrumData', spectrumData);
          }
          } catch (error) {}
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
      NativeEQBridge.stopSpectrumAnalysis();
      this.updateState({ analysisEnabled: false, spectrumData: null });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  beginBatch(): void {
    this.batchMode = true;
    try {
      NativeEQBridge.beginBatch();
    } catch {}
  }

  endBatch(): void {
    this.batchMode = false;
    try {
      NativeEQBridge.endBatch();
    } catch {}
    if (Object.keys(this.pendingUpdates).length > 0) {
      this.updateState(this.pendingUpdates);
      this.pendingUpdates = {};
    }
  }

  async switchBandConfiguration(_mode: 'simple' | 'professional'): Promise<void> {
    // Mode forcé: simple (10 bandes)
    const bands = SIMPLE_FREQUENCY_BANDS
      .map((band, index) => ({
        ...band,
        gain: this.safeGetBandGain(index),
        color: getFrequencyColor(band.frequency),
      }))
      .slice(0, this.nativeBandLimit);
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

      const limitedBands = this.state.bands.slice(0, this.nativeBandLimit);
      const nextBands: EqualiserBand[] = limitedBands.map(b => {
        const match = config.bands.find(cb => cb.frequency === b.frequency);
        return { ...b, gain: match ? match.gain : b.gain };
      });
      for (const b of nextBands) {
        try {
          NativeEQBridge.setBandGain(b.index, b.gain);
        } catch {}
      }
      this.updateState({ bands: nextBands });

      if (config.preset) {
        this.updateState({ currentPreset: config.preset });
      }

      this.endBatch();
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  private updateState(updates: Partial<EqualiserState>): void {
    if (this.batchMode) {
      this.pendingUpdates = { ...this.pendingUpdates, ...updates };
    } else {
      this.state = { ...this.state, ...updates };
      this.emit('stateChanged', this.state);
    }
  }

  private mapNativePresetToId(nativeName: string): string | null {
    const normalized = nativeName.toLowerCase().replace(/\s+/g, '-');
    return (
      PROFESSIONAL_PRESETS.find(p => p.name.toLowerCase().replace(/\s+/g, '-') === normalized)?.id ||
      null
    );
  }

  dispose(): void {
    this.stopSpectrumAnalysis();
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.automationTimers.forEach(timer => clearInterval(timer));
    this.automationTimers.clear();
    this.listeners.clear();
  }
}

const equaliserServiceSingleton = new ProfessionalEqualiserService();
export default equaliserServiceSingleton;


