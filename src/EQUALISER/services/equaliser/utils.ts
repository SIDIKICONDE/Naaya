import { EqualiserBand } from '../../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getFrequencyColor(frequency: number): string {
  if (frequency < 100) return '#FF453A';
  if (frequency < 250) return '#FF9F0A';
  if (frequency < 500) return '#FFD60A';
  if (frequency < 2000) return '#30D158';
  if (frequency < 5000) return '#007AFF';
  if (frequency < 10000) return '#5856D6';
  return '#AF52DE';
}

export function detectPeaks(data: number[]): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > 0.3) {
      peaks.push(i);
    }
  }
  return peaks;
}

export function mapNativePresetToId(
  nativeName: string,
  findPresetByName: (normalizedName: string) => string | null
): string | null {
  const normalized = nativeName.toLowerCase().replace(/\s+/g, '-');
  return findPresetByName(normalized);
}

export function cloneBands(bands: EqualiserBand[]): EqualiserBand[] {
  return bands.map(b => ({ ...b }));
}


