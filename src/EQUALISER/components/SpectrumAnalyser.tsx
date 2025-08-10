/**
 * Analyseur de spectre professionnel
 * Visualisation en temps réel avec Canvas
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EqualiserBand, EqualiserTheme, SpectrumAnalyserData } from '../types';

interface SpectrumAnalyserProps {
  data: SpectrumAnalyserData | null;
  bands: EqualiserBand[];
  theme: EqualiserTheme;
  height?: number;
  showGrid?: boolean;
  showPeaks?: boolean;
  showLabels?: boolean;
}

export const SpectrumAnalyser: React.FC<SpectrumAnalyserProps> = ({
  data,
  bands,
  theme,
  height = 200,
  showGrid = true,
  showPeaks = true,
  showLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peakHoldRef = useRef<number[]>([]);
  const peakDecayRef = useRef<number[]>([]);

  // Initialiser les tableaux de peaks
  useEffect(() => {
    if (bands.length > 0) {
      peakHoldRef.current = new Array(bands.length).fill(0);
      peakDecayRef.current = new Array(bands.length).fill(0);
    }
  }, [bands.length]);

  // Fonction de dessin
  const draw = useCallback(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configuration
    const barWidth = canvas.width / bands.length;
    const barGap = 2;
    const actualBarWidth = barWidth - barGap;

    // Dessiner la grille
    if (showGrid) {
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.5;
      
      // Lignes horizontales (dB)
      const dbLines = [-60, -40, -20, 0];
      dbLines.forEach(db => {
        const y = canvas.height * (1 - (db + 60) / 60);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        
        if (showLabels) {
          ctx.fillStyle = theme.textSecondary;
          ctx.font = '10px sans-serif';
          ctx.fillText(`${db}dB`, 5, y - 2);
        }
      });
    }

    // Dessiner les barres du spectre
    data.magnitudes.forEach((magnitude, index) => {
      const x = index * barWidth + barGap / 2;
      const barHeight = magnitude * canvas.height * 0.8;
      const y = canvas.height - barHeight;

      // Créer un gradient pour chaque barre
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
      const band = bands[index];
      const baseColor = band?.color || theme.primary;
      
      gradient.addColorStop(0, baseColor + '30');
      gradient.addColorStop(0.5, baseColor + '80');
      gradient.addColorStop(1, baseColor);

      // Dessiner la barre
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // Gestion des peaks
      if (showPeaks) {
        // Mettre à jour le peak hold
        if (magnitude > peakHoldRef.current[index]) {
          peakHoldRef.current[index] = magnitude;
          peakDecayRef.current[index] = 60; // 60 frames de hold
        } else if (peakDecayRef.current[index] > 0) {
          peakDecayRef.current[index]--;
        } else {
          // Decay du peak
          peakHoldRef.current[index] *= 0.95;
        }

        // Dessiner le peak
        const peakY = canvas.height - (peakHoldRef.current[index] * canvas.height * 0.8);
        ctx.fillStyle = theme.spectrum.peakColor;
        ctx.fillRect(x, peakY - 2, actualBarWidth, 3);
      }

      // Labels de fréquence
      if (showLabels && index % Math.ceil(bands.length / 10) === 0) {
        ctx.save();
        ctx.translate(x + actualBarWidth / 2, canvas.height - 5);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = theme.textSecondary;
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(band.label, 0, 0);
        ctx.restore();
      }
    });

    // Dessiner la courbe moyenne
    if (data.magnitudes.length > 1) {
      ctx.strokeStyle = theme.spectrum.gradient[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.magnitudes.forEach((magnitude, index) => {
        const x = index * barWidth + actualBarWidth / 2;
        const y = canvas.height - (magnitude * canvas.height * 0.8);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }

  }, [data, bands, theme, showGrid, showPeaks, showLabels]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (data) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [data, draw]);

  // Fallback pour React Native
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={[styles.fallbackContainer, { backgroundColor: theme.surface }]}>
          {data ? (
            <View style={styles.barsContainer}>
              {data.magnitudes.map((magnitude, index) => {
                const band = bands[index];
                const barHeight = magnitude * height * 0.8;
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: band?.color || theme.primary,
                        opacity: 0.8,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              Pas de données audio
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Version Canvas pour le web
  // Style compatible DOM pour <canvas>
  const canvasStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.surface,
  };

  return (
    <View style={[styles.container, { height }]}> 
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        style={canvasStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fallbackContainer: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    width: '100%',
    gap: 1,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 2,
  },
  noDataText: {
    fontSize: 14,
  },
});
