package com.naaya.audio;

public final class NativeEqProcessor {
  static {
    // S'assurer que la lib native est chargée
    try {
      System.loadLibrary("appmodules");
    } catch (Throwable ignore) {
      // RN charge généralement la lib automatiquement; ce fallback est
      // inoffensif
    }
  }

  public static native boolean eqIsEnabled();
  public static native void nativeInit(int sampleRate, int channels);
  public static native void nativeRelease();
  public static native void nativeSyncParams();
  public static native void
  nativeProcessShortInterleaved(short[] pcm, int frames, int channels);
}
