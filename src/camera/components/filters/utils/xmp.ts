import RNFS from 'react-native-fs';
import type { AdvancedFilterParams } from '../../../../../specs/NativeCameraFiltersModule';

// Extraction simple par regex des champs XMP Lightroom ProcessVersion 2012+
function extractNumber(text: string, key: string): number | undefined {
  const attr = new RegExp(`${key}="([^"]+)"`);
  const m1 = text.match(attr);
  if (m1 && m1[1] != null && m1[1] !== '') {
    const v = Number(m1[1]);
    if (!Number.isNaN(v)) return v;
  }
  const tag = new RegExp(`<${key}>([^<]+)</${key}>`);
  const m2 = text.match(tag);
  if (m2 && m2[1] != null && m2[1] !== '') {
    const v = Number(m2[1]);
    if (!Number.isNaN(v)) return v;
  }
  return undefined;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function parseLightroomXMPToAdvancedParams(xmp: string): AdvancedFilterParams {
  // Valeurs par défaut alignées avec DEFAULT_FILTER_PARAMS
  let params: AdvancedFilterParams = {
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    hue: 0.0,
    gamma: 1.0,
    warmth: 0.0,
    tint: 0.0,
    exposure: 0.0,
    shadows: 0.0,
    highlights: 0.0,
    vignette: 0.0,
    grain: 0.0,
  };

  try {
    // Les clés courantes dans XMP Lightroom (Process Version 2012)
    const exposure = extractNumber(xmp, 'crs:Exposure2012'); // EV -5..+5
    if (typeof exposure === 'number') params.exposure = clamp(exposure, -2.0, 2.0);

    const contrast = extractNumber(xmp, 'crs:Contrast2012'); // -100..+100
    if (typeof contrast === 'number') params.contrast = clamp(1.0 + (contrast / 100), 0.0, 2.0);

    const saturation = extractNumber(xmp, 'crs:Saturation'); // -100..+100
    const vibrance = extractNumber(xmp, 'crs:Vibrance'); // -100..+100
    const satBase = typeof saturation === 'number' ? saturation / 100 : 0;
    const vibAdj = typeof vibrance === 'number' ? (vibrance / 100) * 0.5 : 0;
    params.saturation = clamp(1.0 + satBase + vibAdj, 0.0, 2.0);

    const temperature = extractNumber(xmp, 'crs:Temperature'); // approx -100..+100 ou Kelvin delta
    if (typeof temperature === 'number') {
      // Approx: normaliser sur [-1,1]
      params.warmth = clamp(temperature / 100, -1.0, 1.0);
    }
    const tint = extractNumber(xmp, 'crs:Tint'); // -150..+150
    if (typeof tint === 'number') params.tint = clamp(tint / 100, -1.0, 1.0);

    const highlights = extractNumber(xmp, 'crs:Highlights2012'); // -100..+100
    if (typeof highlights === 'number') params.highlights = clamp(highlights / 100, -1.0, 1.0);
    const shadows = extractNumber(xmp, 'crs:Shadows2012'); // -100..+100
    if (typeof shadows === 'number') params.shadows = clamp(shadows / 100, -1.0, 1.0);

    const clarity = extractNumber(xmp, 'crs:Clarity2012'); // -100..+100
    if (typeof clarity === 'number') {
      // Répartir un peu sur contraste et gamma
      const c = clamp(clarity / 100, -1, 1);
      params.contrast = clamp(params.contrast + c * 0.2, 0.0, 2.0);
      params.gamma = clamp(1.0 - c * 0.1, 0.5, 1.5);
    }

    const grainAmount = extractNumber(xmp, 'crs:GrainAmount'); // 0..100
    if (typeof grainAmount === 'number') params.grain = clamp(grainAmount / 100, 0.0, 1.0);

    const postCropVignetteAmount = extractNumber(xmp, 'crs:PostCropVignetteAmount'); // -100..+100
    if (typeof postCropVignetteAmount === 'number') params.vignette = clamp(Math.abs(postCropVignetteAmount) / 100, 0.0, 1.0);

    // Hue/SplitToning non mappés pour MVP
  } catch (e) {
    // En cas d'erreur, on garde les defaults
    console.warn('[XMP] Parse error:', e);
  }

  return params;
}

// Types détaillés pour un mapping plus complet
export type HSLChannel = 'red'|'orange'|'yellow'|'green'|'aqua'|'blue'|'purple'|'magenta';
export interface XmpHslAdjustments {
  hue: Partial<Record<HSLChannel, number>>;
  saturation: Partial<Record<HSLChannel, number>>;
  luminance: Partial<Record<HSLChannel, number>>;
}

export interface XmpToneCurve {
  points: Array<{ x: number; y: number }>; // 0..255
}

export interface XmpSplitToning {
  shadowHue?: number; // 0..360
  shadowSaturation?: number; // 0..100
  highlightHue?: number; // 0..360
  highlightSaturation?: number; // 0..100
  balance?: number; // -100..100
}

export interface XmpDetailedAdjustments {
  hsl?: XmpHslAdjustments;
  toneCurve?: XmpToneCurve;
  splitToning?: XmpSplitToning;
}

export function parseLightroomXMPDetailed(xmp: string): { simple: AdvancedFilterParams; detailed: XmpDetailedAdjustments } {
  const simple = parseLightroomXMPToAdvancedParams(xmp);
  const detailed: XmpDetailedAdjustments = {};

  // HSL par canal
  const colors: HSLChannel[] = ['red','orange','yellow','green','aqua','blue','purple','magenta'];
  const mapColorKey = (c: HSLChannel) => ({
    hue: `crs:HueAdjustment${c.charAt(0).toUpperCase()}${c.slice(1)}`,
    saturation: `crs:SaturationAdjustment${c.charAt(0).toUpperCase()}${c.slice(1)}`,
    luminance: `crs:LuminanceAdjustment${c.charAt(0).toUpperCase()}${c.slice(1)}`,
  });
  const hsl: XmpHslAdjustments = { hue: {}, saturation: {}, luminance: {} };
  let hasHsl = false;
  for (const c of colors) {
    const keys = mapColorKey(c);
    const hv = extractNumber(xmp, keys.hue);
    const sv = extractNumber(xmp, keys.saturation);
    const lv = extractNumber(xmp, keys.luminance);
    if (typeof hv === 'number') { hsl.hue[c] = hv; hasHsl = true; }
    if (typeof sv === 'number') { hsl.saturation[c] = sv; hasHsl = true; }
    if (typeof lv === 'number') { hsl.luminance[c] = lv; hasHsl = true; }
  }
  if (hasHsl) detailed.hsl = hsl;

  // ToneCurve PV2012 (composite)
  const tcTextMatch = xmp.match(/<crs:ToneCurvePV2012>([^<]+)<\/crs:ToneCurvePV2012>/);
  if (tcTextMatch && tcTextMatch[1]) {
    const pairs = tcTextMatch[1].trim().split(/\s+/);
    const points: Array<{x:number;y:number}> = [];
    for (const p of pairs) {
      const [xs, ys] = p.split(',').map(s => Number(s.trim()));
      if (!Number.isNaN(xs) && !Number.isNaN(ys)) points.push({ x: clamp(xs, 0, 255), y: clamp(ys, 0, 255) });
    }
    if (points.length >= 2) detailed.toneCurve = { points };
  }

  // Split Toning
  const st: XmpSplitToning = {};
  const sh = extractNumber(xmp, 'crs:SplitToningShadowHue');
  const ss = extractNumber(xmp, 'crs:SplitToningShadowSaturation');
  const hh = extractNumber(xmp, 'crs:SplitToningHighlightHue');
  const hs = extractNumber(xmp, 'crs:SplitToningHighlightSaturation');
  const bal = extractNumber(xmp, 'crs:SplitToningBalance');
  if (typeof sh === 'number') st.shadowHue = sh;
  if (typeof ss === 'number') st.shadowSaturation = ss;
  if (typeof hh === 'number') st.highlightHue = hh;
  if (typeof hs === 'number') st.highlightSaturation = hs;
  if (typeof bal === 'number') st.balance = bal;
  if (Object.keys(st).length) detailed.splitToning = st;

  return { simple, detailed };
}

// Génération d'une LUT .cube approximative à partir des réglages détaillés
export async function buildAndSaveLUTCubeFromXMP(xmp: string, cubeSize = 33): Promise<string> {
  const { detailed } = parseLightroomXMPDetailed(xmp);
  const content = buildCubeContent(detailed, cubeSize);
  const filePath = `${RNFS.CachesDirectoryPath}/xmp_${Date.now()}.cube`;
  await RNFS.writeFile(filePath, content, 'utf8');
  return filePath;
}

export function buildCubeContent(detailed: XmpDetailedAdjustments, cubeSize = 33): string {
  // Pré-allocation pour éviter les réallocations dynamiques
  const totalPoints = cubeSize * cubeSize * cubeSize;
  const lines: string[] = new Array(totalPoints + 2);
  lines[0] = '# Generated from XMP';
  lines[1] = `LUT_3D_SIZE ${cubeSize}`;
  
  let lineIndex = 2;
  const cubeSizeMinus1 = cubeSize - 1;
  
  for (let b = 0; b < cubeSize; b++) {
    for (let g = 0; g < cubeSize; g++) {
      for (let r = 0; r < cubeSize; r++) {
        let R = r / cubeSizeMinus1;
        let G = g / cubeSizeMinus1;
        let B = b / cubeSizeMinus1;
        // Convert to HSL
        let { h, s, l } = rgbToHsl(R, G, B);
        // HSL per channel adjustments
        if (detailed.hsl) {
          const c = hueToChannel(h);
          const dh = detailed.hsl.hue[c] ?? 0;      // -100..100 map to degrees +/- 45
          const ds = detailed.hsl.saturation[c] ?? 0; // -100..100
          const dl = detailed.hsl.luminance[c] ?? 0;  // -100..100
          h = normalizeHue(h + (dh / 100) * 45);
          s = clamp01(s + ds / 200); // scale to [-0.5..0.5]
          l = clamp01(l + dl / 200);
        }
        // Tone curve on luminance (approx via L channel)
        if (detailed.toneCurve && detailed.toneCurve.points?.length >= 2) {
          const lum = Math.round(l * 255);
          const mapped = applyToneCurve(detailed.toneCurve.points, lum) / 255;
          l = clamp01(mapped);
        }
        // Split toning
        if (detailed.splitToning && (detailed.splitToning.shadowSaturation || detailed.splitToning.highlightSaturation)) {
          const bal = (detailed.splitToning.balance ?? 0) / 100; // -1..1
          const threshold = 0.5 + bal * 0.25; // shift threshold
          const weightShadow = l < threshold ? (threshold - l) / threshold : 0;
          const weightHighlight = l > threshold ? (l - threshold) / (1 - threshold) : 0;
          let [Rs, Gs, Bs] = hslToRgb(
            (detailed.splitToning.shadowHue ?? 0),
            (detailed.splitToning.shadowSaturation ?? 0) / 100,
            l
          );
          let [Rh, Gh, Bh] = hslToRgb(
            (detailed.splitToning.highlightHue ?? 0),
            (detailed.splitToning.highlightSaturation ?? 0) / 100,
            l
          );
          const mix = (a: number, bVal: number, w: number) => a * (1 - w) + bVal * w;
          // apply tint by mixing
          [R, G, B] = hslToRgb(h, s, l);
          const R1 = mix(R, Rs, weightShadow);
          const G1 = mix(G, Gs, weightShadow);
          const B1 = mix(B, Bs, weightShadow);
          R = mix(R1, Rh, weightHighlight);
          G = mix(G1, Gh, weightHighlight);
          B = mix(B1, Bh, weightHighlight);
        } else {
          [R, G, B] = hslToRgb(h, s, l);
        }
        lines[lineIndex++] = `${clamp01(R).toFixed(6)} ${clamp01(G).toFixed(6)} ${clamp01(B).toFixed(6)}`;
      }
    }
  }
  return lines.join('\n');
}

function hueToChannel(hueDeg: number): HSLChannel {
  const h = ((hueDeg % 360) + 360) % 360;
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 150) return 'green';
  if (h < 195) return 'aqua';
  if (h < 255) return 'blue';
  if (h < 300) return 'purple';
  return 'magenta';
}

// Cache pour les courbes de tons déjà calculées
const toneCurveCache = new Map<string, Map<number, number>>();

function applyToneCurve(points: Array<{x:number;y:number}>, v: number): number {
  // Créer une clé unique pour cette courbe
  const curveKey = points.map(p => `${p.x},${p.y}`).join('|');
  
  // Vérifier le cache
  let curveMap = toneCurveCache.get(curveKey);
  if (!curveMap) {
    curveMap = new Map<number, number>();
    toneCurveCache.set(curveKey, curveMap);
    
    // Limiter la taille du cache global (éviter les fuites mémoire)
    if (toneCurveCache.size > 100) {
      const firstKey = toneCurveCache.keys().next().value;
      toneCurveCache.delete(firstKey);
    }
  }
  
  // Vérifier si cette valeur est déjà calculée
  const cached = curveMap.get(v);
  if (cached !== undefined) {
    return cached;
  }
  
  // Calcul optimisé avec binary search pour les grandes courbes
  let result: number;
  if (points.length > 10) {
    // Binary search pour les grandes courbes
    let left = 0, right = points.length - 1;
    while (left < right - 1) {
      const mid = Math.floor((left + right) / 2);
      if (v <= points[mid].x) {
        right = mid;
      } else {
        left = mid;
      }
    }
    const prev = points[left];
    const curr = points[right];
    const denominator = curr.x - prev.x;
    const t = denominator === 0 ? 0 : (v - prev.x) / denominator;
    result = Math.round(prev.y + t * (curr.y - prev.y));
  } else {
    // Algorithme original pour les petites courbes
    let prev = points[0];
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      if (v <= curr.x) {
        const denominator = curr.x - prev.x;
        const t = denominator === 0 ? 0 : (v - prev.x) / denominator;
        result = Math.round(prev.y + t * (curr.y - prev.y));
        curveMap.set(v, result);
        return result;
      }
      prev = curr;
    }
    result = points[points.length - 1].y;
  }
  
  // Mettre en cache et retourner
  curveMap.set(v, result);
  return result;
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function normalizeHue(h: number): number { let x = h % 360; if (x < 0) x += 360; return x; }

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb(hDeg: number, s: number, l: number): [number, number, number] {
  const h = ((hDeg % 360) + 360) % 360 / 360;
  if (s === 0) return [l, l, l];
  const qVal = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const pVal = 2 * l - qVal;
  const hue2rgb = (pp: number, qq: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return pp + (qq - pp) * 6 * t;
    if (t < 1/2) return qq;
    if (t < 2/3) return pp + (qq - pp) * (2/3 - t) * 6;
    return pp;
  };
  const r = hue2rgb(pVal, qVal, h + 1/3);
  const g = hue2rgb(pVal, qVal, h);
  const b = hue2rgb(pVal, qVal, h - 1/3);
  return [r, g, b];
}

// Workflow utilitaire haut-niveau
export async function processXMPToFilter(xmp: string): Promise<{ type: 'lut'; path: string } | { type: 'params'; params: AdvancedFilterParams } > {
  const { simple, detailed } = parseLightroomXMPDetailed(xmp);
  const hasAdvanced = Boolean(detailed.hsl || detailed.toneCurve || detailed.splitToning);
  if (hasAdvanced) {
    const path = await buildAndSaveLUTCubeFromXMP(xmp, 33);
    return { type: 'lut', path };
  }
  return { type: 'params', params: simple };
}


