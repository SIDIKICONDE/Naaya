package com.naaya.audio;

public final class NativeEqProcessor {
  static {
    // chargée via React Native CMake (libappmodules)
  }

  public static native boolean eqIsEnabled();
  public static native void nativeInit(int sampleRate, int channels);
  public static native void nativeRelease();
  public static native void nativeSyncParams();
  public static native void
  nativeProcessShortInterleaved(short[] pcm, int frames, int channels);
}

