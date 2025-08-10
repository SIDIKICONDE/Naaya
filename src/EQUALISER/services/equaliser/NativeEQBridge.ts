import NativeAudioEQ from '../../../../specs/NativeAudioEqualizerModule';

/**
 * Pont sécurisé vers le module natif d'égaliseur.
 * Toutes les erreurs sont encapsulées pour éviter les crashs côté JS.
 */
export const NativeEQBridge = {
  setEQEnabled(enabled: boolean): void {
    try {
      NativeAudioEQ.setEQEnabled(enabled);
    } catch {}
  },

  setPreset(presetName: string): void {
    try {
      (NativeAudioEQ as any).setPreset?.(presetName);
    } catch {}
  },

  getEQEnabled(): boolean {
    try {
      return Boolean((NativeAudioEQ as any).getEQEnabled?.());
    } catch {
      return false;
    }
  },

  getCurrentPreset(): string {
    try {
      return (NativeAudioEQ as any).getCurrentPreset?.() || 'Flat';
    } catch {
      return 'Flat';
    }
  },

  getAvailablePresets(): string[] {
    try {
      const names = (NativeAudioEQ as any).getAvailablePresets?.() as string[] | undefined;
      return Array.isArray(names) ? names : [];
    } catch {
      return [];
    }
  },

  getMasterGain(): number {
    try {
      return (NativeAudioEQ as any).getMasterGain?.() ?? 0;
    } catch {
      return 0;
    }
  },

  setMasterGain(gain: number): void {
    try {
      (NativeAudioEQ as any).setMasterGain?.(gain);
    } catch {}
  },

  getBandGain(index: number): number {
    try {
      return NativeAudioEQ.getBandGain(index) ?? 0;
    } catch {
      return 0;
    }
  },

  setBandGain(index: number, gain: number): void {
    try {
      NativeAudioEQ.setBandGain(index, gain);
    } catch {}
  },

  beginBatch(): void {
    try {
      (NativeAudioEQ as any).beginBatch?.();
    } catch {}
  },

  endBatch(): void {
    try {
      (NativeAudioEQ as any).endBatch?.();
    } catch {}
  },

  startSpectrumAnalysis(): void {
    try {
      (NativeAudioEQ as any).startSpectrumAnalysis?.();
    } catch {}
  },

  stopSpectrumAnalysis(): void {
    try {
      (NativeAudioEQ as any).stopSpectrumAnalysis?.();
    } catch {}
  },

  getSpectrumData(): number[] | null {
    try {
      const data = (NativeAudioEQ as any).getSpectrumData?.() as number[] | undefined;
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  },
};

export default NativeEQBridge;


