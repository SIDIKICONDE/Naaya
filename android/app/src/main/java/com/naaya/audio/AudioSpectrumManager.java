package com.naaya.audio;

import android.media.audiofx.Visualizer;

public final class AudioSpectrumManager {
  private static Visualizer visualizer;
  private static float[] lastMagnitudes = new float[64];

  private AudioSpectrumManager() {}

  public static void start() {
    try {
      if (visualizer != null) return;
      // 0 pour la sortie audio mixée globale
      visualizer = new Visualizer(0);
      visualizer.setCaptureSize(Visualizer.getCaptureSizeRange()[1]);
      visualizer.setEnabled(true);
    } catch (Throwable t) {
      stop();
    }
  }

  public static void stop() {
    try {
      if (visualizer != null) {
        visualizer.setEnabled(false);
        visualizer.release();
        visualizer = null;
      }
    } catch (Throwable ignored) { }
  }

  // Copie des magnitudes dans out[0..maxCount-1], renvoie le nombre réel copié
  public static int copyMagnitudes(float[] out, int maxCount) {
    if (out == null || maxCount <= 0) return 0;
    int n = Math.min(maxCount, out.length);
    try {
      if (visualizer == null) {
        // Rien d'actif, renvoyer les derniers/zeros
        for (int i = 0; i < n; i++) out[i] = (i < lastMagnitudes.length) ? lastMagnitudes[i] : 0f;
        return n;
      }
      byte[] fft = new byte[visualizer.getCaptureSize()];
      // getFft renvoie les composantes en place (real/imag par bin)
      int status = visualizer.getFft(fft);
      if (status != Visualizer.SUCCESS) {
        for (int i = 0; i < n; i++) out[i] = 0f;
        return n;
      }
      int bins = Math.min(n, fft.length / 2);
      out[0] = Math.abs(fft[0]);
      for (int i = 1; i < bins; i++) {
        int re = fft[2 * i];
        int im = fft[2 * i + 1];
        float mag = (float) Math.hypot(re, im);
        out[i] = mag;
        if (i < lastMagnitudes.length) lastMagnitudes[i] = mag;
      }
      for (int i = bins; i < n; i++) out[i] = 0f;
      return n;
    } catch (Throwable t) {
      for (int i = 0; i < n; i++) out[i] = 0f;
      return n;
    }
  }
}


