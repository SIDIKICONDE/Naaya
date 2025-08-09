import NativeAudioEQ from '../../../specs/NativeAudioEqualizerModule';
import { DEFAULT_FREQUENCY_BANDS, EQUALIZER_PRESETS } from '../constants';
import type {
  EqualizerBand,
  EqualizerConfig,
  EqualizerEvents,
  EqualizerPreset,
  SpectrumData,
} from '../types';

type EventName = keyof EqualizerEvents;
type EventHandler<T extends EventName> = (payload: EqualizerEvents[T]) => void;

class EqualizerServiceImpl {
  private enabled: boolean = false;
  private currentPresetId: string = 'flat';
  private bands: EqualizerBand[] = [];
  private presets: EqualizerPreset[] = EQUALIZER_PRESETS;
  private listeners: Map<EventName, Set<Function>> = new Map();
  private spectrumTimer: number | null = null;
  private nrEnabled: boolean = false;
  private nrConfig = {
    highPassEnabled: true,
    highPassHz: 80,
    thresholdDb: -45,
    ratio: 2.5,
    floorDb: -18,
    attackMs: 3,
    releaseMs: 80,
  };
  private safetyConfig = {
    enabled: true,
    dcRemovalEnabled: true,
    dcThreshold: 0.002,
    limiterEnabled: true,
    limiterThresholdDb: -1,
    softKneeLimiter: true,
    kneeWidthDb: 6,
    feedbackDetectEnabled: true,
    feedbackCorrThreshold: 0.95,
  };
  private fxEnabled: boolean = false;
  private fxCompressor = { thresholdDb: -12, ratio: 3, attackMs: 10, releaseMs: 120, makeupDb: 0 };
  private fxDelay = { delayMs: 150, feedback: 0.25, mix: 0.2 };

  constructor() {
    this.initializeFromNative();
  }

  on<T extends EventName>(event: T, handler: EventHandler<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off<T extends EventName>(event: T, handler: EventHandler<T>) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit<T extends EventName>(event: T, payload: EqualizerEvents[T]) {
    this.listeners.get(event)?.forEach((fn) => {
      try { (fn as EventHandler<T>)(payload); } catch (_) {}
    });
  }

  private initializeFromNative() {
    try {
      this.enabled = !!NativeAudioEQ.getEQEnabled();
      const nativeName = NativeAudioEQ.getCurrentPreset();
      this.currentPresetId = this.mapNativePresetToId(nativeName);
      // Charger les préréglages depuis le natif (fallback sur EQUALIZER_PRESETS)
      this.loadPresetsFromNative();
      this.bands = DEFAULT_FREQUENCY_BANDS.map((b, idx) => ({
        index: idx,
        frequency: b.frequency,
        gain: this.safeGetBandGain(idx),
        label: b.label,
      }));
      this.emit('initialized', undefined as unknown as void);
    } catch (e) {
      this.emit('error', e as Error);
    }
  }

  private loadPresetsFromNative() {
    try {
      const names = (NativeAudioEQ.getAvailablePresets?.() as string[]) || [];
      const metaById = new Map<string, EqualizerPreset>();
      for (const p of EQUALIZER_PRESETS) metaById.set(p.id, p);
      const mapped: EqualizerPreset[] = names.map((name) => {
        const id = this.mapNativePresetToId(name);
        const meta = metaById.get(id);
        return {
          id,
          name,
          icon: meta?.icon ?? '🎛️',
          description: meta?.description ?? '',
          bands: meta?.bands ?? {},
        };
      });
      if (mapped.length > 0) this.presets = mapped;
    } catch {
      // fallback silencieux sur EQUALIZER_PRESETS
    }
  }

  private safeGetBandGain(index: number): number {
    try { return NativeAudioEQ.getBandGain(index) ?? 0; } catch { return 0; }
  }

  getEnabled() { return this.enabled; }
  getCurrentPreset() { return this.currentPresetId; }
  getBands() { return this.bands.slice(); }
  getPresets() { return this.presets.slice(); }
  getNREnabled() { return this.nrEnabled; }
  getNRConfig() { return { ...this.nrConfig }; }
  getSafetyConfig() { return { ...this.safetyConfig }; }

  async setEnabled(enabled: boolean) {
    try {
      NativeAudioEQ.setEQEnabled(enabled);
      this.enabled = enabled;
      this.emit('enabledChanged', enabled);
    } catch (e) {
      this.emit('error', e as Error);
      throw e;
    }
  }

  async setBandGain(bandIndex: number, gain: number) {
    try {
      NativeAudioEQ.setBandGain(bandIndex, gain);
      if (this.bands[bandIndex]) this.bands[bandIndex] = { ...this.bands[bandIndex], gain };
      this.currentPresetId = '';
      this.emit('bandChanged', { bandIndex, gain });
    } catch (e) {
      this.emit('error', e as Error);
      throw e;
    }
  }

  beginBatch() {
    try { NativeAudioEQ.beginBatch?.(); } catch {}
  }

  endBatch() {
    try { NativeAudioEQ.endBatch?.(); } catch {}
  }

  async setPreset(presetId: string) {
    try {
      // Priorité: utiliser le nom natif à partir de la liste courante
      const preset = this.presets.find((p) => p.id === presetId);
      if (preset) {
        NativeAudioEQ.setPreset(preset.name);
        this.currentPresetId = presetId;
        this.refreshBandsFromNative();
        this.emit('presetChanged', presetId);
        return;
      }
      // Sinon, mapper les IDs connus vers un nom natif standard
      const native = this.mapIdToNativePreset(presetId);
      if (native) {
        NativeAudioEQ.setPreset(native);
        this.currentPresetId = presetId;
        this.refreshBandsFromNative();
        this.emit('presetChanged', presetId);
        return;
      }
      // Fallback: appliquer les gains du preset UI local si présent
      const localPreset = EQUALIZER_PRESETS.find((p) => p.id === presetId);
      if (localPreset) {
        const gainsByKey = localPreset.bands;
        const indexByKey = this.buildBandKeyToIndexMap();
        Object.entries(gainsByKey).forEach(([key, val]) => {
          const idx = indexByKey.get(key);
          if (idx !== undefined) {
            try { NativeAudioEQ.setBandGain(idx, val); } catch {}
            if (this.bands[idx]) this.bands[idx] = { ...this.bands[idx], gain: val };
          }
        });
        this.currentPresetId = presetId;
        this.emit('presetChanged', presetId);
      }
    } catch (e) {
      this.emit('error', e as Error);
      throw e;
    }
  }

  // Noise Reduction controls
  async setNREnabled(enabled: boolean) {
    try {
      NativeAudioEQ.nrSetEnabled(enabled);
      this.nrEnabled = enabled;
      this.emit('nrEnabledChanged', enabled as unknown as any);
    } catch (e) {
      this.emit('error', e as Error); throw e;
    }
  }

  async setNRConfig(partial: Partial<typeof this.nrConfig>) {
    this.nrConfig = { ...this.nrConfig, ...partial };
    const c = this.nrConfig;
    try {
      NativeAudioEQ.nrSetConfig(
        !!c.highPassEnabled,
        Number(c.highPassHz),
        Number(c.thresholdDb),
        Number(c.ratio),
        Number(c.floorDb),
        Number(c.attackMs),
        Number(c.releaseMs),
      );
      this.emit('nrConfigChanged', this.nrConfig as unknown as any);
    } catch (e) { this.emit('error', e as Error); throw e; }
  }

  // Safety controls
  async setSafetyConfig(partial: Partial<typeof this.safetyConfig>) {
    this.safetyConfig = { ...this.safetyConfig, ...partial };
    const c = this.safetyConfig;
    try {
      NativeAudioEQ.safetySetConfig(
        !!c.enabled,
        !!c.dcRemovalEnabled,
        Number(c.dcThreshold),
        !!c.limiterEnabled,
        Number(c.limiterThresholdDb),
        !!c.softKneeLimiter,
        Number(c.kneeWidthDb),
        !!c.feedbackDetectEnabled,
        Number(c.feedbackCorrThreshold),
      );
    } catch (e) { this.emit('error', e as Error); throw e; }
  }

  getSafetyReport() {
    try { return NativeAudioEQ.safetyGetReport(); } catch { return null as any; }
  }

  // FX controls
  async setFxEnabled(enabled: boolean) {
    try { NativeAudioEQ.fxSetEnabled(enabled); this.fxEnabled = enabled; } catch (e) { this.emit('error', e as Error); throw e; }
  }
  async setFxCompressor(params: Partial<typeof this.fxCompressor>) {
    this.fxCompressor = { ...this.fxCompressor, ...params };
    const c = this.fxCompressor;
    try { NativeAudioEQ.fxSetCompressor(c.thresholdDb, c.ratio, c.attackMs, c.releaseMs, c.makeupDb); } catch (e) { this.emit('error', e as Error); throw e; }
  }
  async setFxDelay(params: Partial<typeof this.fxDelay>) {
    this.fxDelay = { ...this.fxDelay, ...params };
    const d = this.fxDelay;
    try { NativeAudioEQ.fxSetDelay(d.delayMs, d.feedback, d.mix); } catch (e) { this.emit('error', e as Error); throw e; }
  }

  async startSpectrumAnalysis(intervalMs: number = 50) {
    try {
      if (this.spectrumTimer) return;
      NativeAudioEQ.startSpectrumAnalysis();
      this.emit('spectrumAnalysisStarted', undefined as unknown as void);
      this.spectrumTimer = (setInterval(() => {
        try {
          const data = NativeAudioEQ.getSpectrumData() as unknown as SpectrumData;
          this.emit('spectrumData', data);
        } catch {}
      }, Math.max(16, intervalMs)) as unknown) as number;
    } catch (e) {
      this.emit('error', e as Error);
      throw e;
    }
  }

  async stopSpectrumAnalysis() {
    try {
      if (this.spectrumTimer) {
        clearInterval(this.spectrumTimer as unknown as number);
        this.spectrumTimer = null;
      }
      NativeAudioEQ.stopSpectrumAnalysis();
      this.emit('spectrumAnalysisStopped', undefined as unknown as void);
    } catch (e) {
      this.emit('error', e as Error);
      throw e;
    }
  }

  async reset() {
    await this.setPreset('flat');
    this.bands = this.bands.map((b, i) => ({ ...b, gain: this.safeGetBandGain(i) }));
    this.emit('reset', undefined as unknown as void);
  }

  getConfiguration(): EqualizerConfig {
    return {
      enabled: this.enabled,
      preset: this.currentPresetId,
      bands: this.getBands(),
    };
  }

  async restoreConfiguration(config: { enabled: boolean; preset: string; bands?: { index: number; gain: number }[]; }) {
    await this.setEnabled(config.enabled);
    await this.setPreset(config.preset);
    if (config.bands && config.bands.length > 0) {
      for (const { index, gain } of config.bands) await this.setBandGain(index, gain);
    }
    this.emit('configurationRestored', this.getConfiguration());
  }

  private refreshBandsFromNative() {
    this.bands = DEFAULT_FREQUENCY_BANDS.map((b, idx) => ({
      index: idx,
      frequency: b.frequency,
      gain: this.safeGetBandGain(idx),
      label: b.label,
    }));
  }

  private mapIdToNativePreset(id: string): string | null {
    const m: Record<string, string> = {
      flat: 'Flat',
      rock: 'Rock',
      electronic: 'Electronic',
      vocal: 'Vocal Boost',
      'bass-boost': 'Bass Boost',
      'treble-boost': 'Treble Boost',
      jazz: 'Jazz',
      classical: 'Classical',
      loudness: 'Loudness',
    };
    return m[id] || null;
  }

  private mapNativePresetToId(name: string): string {
    const n = (name || '').toLowerCase();
    const entries: Array<[string, string]> = [
      ['flat', 'flat'],
      ['rock', 'rock'],
      ['electronic', 'electronic'],
      ['vocal boost', 'vocal'],
      ['bass boost', 'bass-boost'],
      ['treble boost', 'treble-boost'],
      ['jazz', 'jazz'],
      ['classical', 'classical'],
      ['loudness', 'loudness'],
    ];
    for (const [k, v] of entries) if (n === k) return v;
    return n.replace(/\s+/g, '-');
  }

  private buildBandKeyToIndexMap(): Map<string, number> {
    const map = new Map<string, number>();
    const freqToKey = (freq: number) => {
      if (freq >= 1000) return `band-${Math.round(freq/1000)}k`;
      return `band-${Math.round(freq)}`;
    };
    DEFAULT_FREQUENCY_BANDS.forEach((b, idx) => {
      map.set(freqToKey(b.frequency), idx);
    });
    return map;
  }
}

const EqualizerService = new EqualizerServiceImpl();
export default EqualizerService;

