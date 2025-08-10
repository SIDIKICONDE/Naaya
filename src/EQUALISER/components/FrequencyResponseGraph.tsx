/**
 * Graphique de réponse en fréquence
 * Visualisation de la courbe d'égalisation
 */

import React, { useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { EqualiserBand, EqualiserTheme } from '../types';

interface FrequencyResponseGraphProps {
  bands: EqualiserBand[];
  theme: EqualiserTheme;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const FrequencyResponseGraph: React.FC<FrequencyResponseGraphProps> = ({
  bands,
  theme,
  height = 300,
  showGrid = true,
  showLabels = true,
}) => {
  const graphWidth = screenWidth - 64; // Padding
  const graphHeight = height;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const plotWidth = graphWidth - padding.left - padding.right;
  const plotHeight = graphHeight - padding.top - padding.bottom;

  // Calculer la courbe de réponse
  const responseCurve = useMemo(() => {
    if (bands.length === 0) return '';

    // Convertir les fréquences en échelle logarithmique
    const minFreq = Math.log10(20);
    const maxFreq = Math.log10(20000);
    const freqRange = maxFreq - minFreq;

    // Créer des points pour la courbe
    const points: { x: number; y: number }[] = [];
    
    // Ajouter des points d'interpolation entre les bandes
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const logFreq = Math.log10(band.frequency);
      const x = ((logFreq - minFreq) / freqRange) * plotWidth;
      const y = plotHeight / 2 - (band.gain / 48) * plotHeight; // ±24dB range
      
      points.push({ x, y });
    }

    // Créer une courbe lisse avec interpolation cubique
    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      
      // Points de contrôle pour courbe de Bézier
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    return path;
  }, [bands, plotWidth, plotHeight]);

  // Grille de fréquences
  const frequencyGrid = useMemo(() => {
    const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const minFreq = Math.log10(20);
    const maxFreq = Math.log10(20000);
    const freqRange = maxFreq - minFreq;

    return frequencies.map(freq => {
      const logFreq = Math.log10(freq);
      const x = ((logFreq - minFreq) / freqRange) * plotWidth;
      const label = freq >= 1000 ? `${freq / 1000}k` : freq.toString();
      return { x, label, freq };
    });
  }, [plotWidth]);

  // Grille de gain
  const gainGrid = useMemo(() => {
    const gains = [-24, -18, -12, -6, 0, 6, 12, 18, 24];
    return gains.map(gain => {
      const y = plotHeight / 2 - (gain / 48) * plotHeight;
      return { y, label: `${gain > 0 ? '+' : ''}${gain}dB` };
    });
  }, [plotHeight]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Réponse en fréquence
      </Text>
      
      <Svg width={graphWidth} height={graphHeight}>
        <Defs>
          <LinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        <G transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grille de fond */}
          {showGrid && (
            <>
              {/* Lignes verticales (fréquences) */}
              {frequencyGrid.map((grid, index) => (
                <Line
                  key={`freq-${index}`}
                  x1={grid.x}
                  y1={0}
                  x2={grid.x}
                  y2={plotHeight}
                  stroke={theme.grid}
                  strokeWidth={0.5}
                  strokeDasharray={grid.freq === 1000 ? "0" : "2,2"}
                />
              ))}

              {/* Lignes horizontales (gains) */}
              {gainGrid.map((grid, index) => (
                <Line
                  key={`gain-${index}`}
                  x1={0}
                  y1={grid.y}
                  x2={plotWidth}
                  y2={grid.y}
                  stroke={theme.grid}
                  strokeWidth={grid.label === '0dB' ? 1 : 0.5}
                  strokeDasharray={grid.label === '0dB' ? "0" : "2,2"}
                />
              ))}
            </>
          )}

          {/* Courbe de réponse avec remplissage */}
          {responseCurve && (
            <>
              {/* Zone de remplissage */}
              <Path
                d={`${responseCurve} L ${plotWidth} ${plotHeight / 2} L 0 ${plotHeight / 2} Z`}
                fill="url(#curveGradient)"
              />
              
              {/* Ligne de la courbe */}
              <Path
                d={responseCurve}
                stroke={theme.primary}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Points des bandes */}
          {bands.map((band, index) => {
            const minFreq = Math.log10(20);
            const maxFreq = Math.log10(20000);
            const freqRange = maxFreq - minFreq;
            const logFreq = Math.log10(band.frequency);
            const x = ((logFreq - minFreq) / freqRange) * plotWidth;
            const y = plotHeight / 2 - (band.gain / 48) * plotHeight;

            return (
              <G key={`band-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill={theme.surface}
                  stroke={band.color || theme.primary}
                  strokeWidth={2}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  fill={band.color || theme.primary}
                />
              </G>
            );
          })}

          {/* Labels */}
          {showLabels && (
            <>
              {/* Labels de fréquence */}
              {frequencyGrid.map((grid, index) => (
                <SvgText
                  key={`freq-label-${index}`}
                  x={grid.x}
                  y={plotHeight + 20}
                  fill={theme.textSecondary}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {grid.label}
                </SvgText>
              ))}

              {/* Labels de gain */}
              {gainGrid.map((grid, index) => (
                <SvgText
                  key={`gain-label-${index}`}
                  x={-10}
                  y={grid.y + 4}
                  fill={theme.textSecondary}
                  fontSize="10"
                  textAnchor="end"
                >
                  {grid.label}
                </SvgText>
              ))}
            </>
          )}
        </G>

        {/* Axes */}
        <G transform={`translate(${padding.left}, ${padding.top})`}>
          <Line
            x1={0}
            y1={plotHeight}
            x2={plotWidth}
            y2={plotHeight}
            stroke={theme.text}
            strokeWidth={1}
          />
          <Line
            x1={0}
            y1={0}
            x2={0}
            y2={plotHeight}
            stroke={theme.text}
            strokeWidth={1}
          />
        </G>
      </Svg>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>
          Fréquence (Hz) →
        </Text>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>
          ↑ Gain (dB)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  legendText: {
    fontSize: 11,
  },
});
