package com.naaya.camera;

import android.content.Context;
import android.hardware.Camera;
import android.media.CamcorderProfile;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import com.naaya.audio.NativeEqProcessor;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Enregistreur vidéo Android (API Camera + MediaRecorder)
 * Objectif: MP4 + H.264/HEVC, AAC audio.
 */
public class LegacyVideoRecorder {
  private static final String TAG = "NaayaVideoRecorder";
  private static Context appContext;
  private static LegacyVideoRecorder instance;
  private static boolean preferCamera2 = true;

  private Camera camera;
  private MediaRecorder recorder;
  private File outputFile;
  private long startMs;

  public static void initialize(Context context) {
    appContext = context.getApplicationContext();
  }

  public static synchronized LegacyVideoRecorder getInstance() {
    if (instance == null)
      instance = new LegacyVideoRecorder();
    return instance;
  }

  private String generateFileName(String ext) {
    String ts = new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US)
                    .format(new Date());
    return "video_" + ts + "." + ext;
  }

  private File resolveOutputDir() {
    File dir;
    if (appContext != null) {
      dir = appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES);
      if (dir == null)
        dir = appContext.getFilesDir();
    } else {
      dir = new File(Environment.getExternalStorageDirectory(), "Naaya/videos");
    }
    if (!dir.exists()) {
      // noinspection ResultOfMethodCallIgnored
      dir.mkdirs();
    }
    return dir;
  }

  public static class StartOptions {
    public String codec;        // "H264" | "HEVC"
    public int videoBitrate;    // 0 = auto
    public boolean recordAudio; // true/false
    public int audioBitrate;    // 0 = auto
    public int maxDurationSec;  // 0 = illimité
    public long maxFileSize;    // 0 = illimité
    public int width;           // souhaités (0 = auto)
    public int height;
    public int fps;
    public String deviceId; // "front" | "back" ou id
    // Avancés
    public String saveDirectory;  // chemin absolu optionnel
    public String fileNamePrefix; // préfixe fichier
    public String
        orientation; // portrait|portraitUpsideDown|landscapeLeft|landscapeRight|auto
    public String stabilization; // off|standard|cinematic|auto
    public boolean lockAE;
    public boolean lockAWB;
    public boolean lockAF;
  }

  public synchronized boolean start(StartOptions opt) {
    if (recorder != null)
      return false;
    try {
      if (preferCamera2 && Build.VERSION.SDK_INT >= 21 && appContext != null) {
        Camera2VideoRecorder cam2 = new Camera2VideoRecorder(appContext);
        boolean ok = cam2.start(opt);
        if (ok) {
          // Raccrocher le cycle à Camera2: conserver la référence pour stop
          this.camera2Ref = cam2;
          this.camera = null;
          this.recorder = null; // tenu par cam2
          return true;
        }
        // sinon: fallback legacy ci-dessous
      }
      camera = Camera.open(Camera.CameraInfo.CAMERA_FACING_BACK);
      camera.unlock();

      recorder = new MediaRecorder();
      recorder.setCamera(camera);
      if (opt != null && opt.recordAudio) {
        recorder.setAudioSource(MediaRecorder.AudioSource.CAMCORDER);
      }
      recorder.setVideoSource(MediaRecorder.VideoSource.CAMERA);

      CamcorderProfile profile =
          CamcorderProfile.hasProfile(CamcorderProfile.QUALITY_1080P)
              ? CamcorderProfile.get(CamcorderProfile.QUALITY_1080P)
              : CamcorderProfile.get(CamcorderProfile.QUALITY_HIGH);

      recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);

      // Codec vidéo
      String codec = opt != null && opt.codec != null ? opt.codec : "H264";
      if ("HEVC".equalsIgnoreCase(codec) && Build.VERSION.SDK_INT >= 24) {
        recorder.setVideoEncoder(MediaRecorder.VideoEncoder.HEVC);
      } else {
        recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
      }

      // Codec audio
      if (opt != null && opt.recordAudio) {
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        if (opt.audioBitrate > 0) {
          recorder.setAudioEncodingBitRate(opt.audioBitrate);
        } else {
          recorder.setAudioEncodingBitRate(1280 * 100);
        }
        recorder.setAudioSamplingRate(44100);
      }

      // Dimensions/FPS depuis le profil
      recorder.setVideoFrameRate(profile.videoFrameRate);
      recorder.setVideoSize(profile.videoFrameWidth, profile.videoFrameHeight);
      if (opt != null && opt.videoBitrate > 0) {
        recorder.setVideoEncodingBitRate(opt.videoBitrate);
      } else {
        recorder.setVideoEncodingBitRate(profile.videoBitRate);
      }

      File dir;
      if (opt != null && opt.saveDirectory != null &&
          !opt.saveDirectory.isEmpty()) {
        dir = new File(opt.saveDirectory);
      } else {
        dir = resolveOutputDir();
      }
      if (!dir.exists()) {
        dir.mkdirs();
      }
      String prefix = (opt != null && opt.fileNamePrefix != null &&
                       !opt.fileNamePrefix.isEmpty())
                          ? opt.fileNamePrefix
                          : "video";
      String ts = new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US)
                      .format(new Date());
      outputFile = new File(dir, prefix + "_" + ts + ".mp4");
      recorder.setOutputFile(outputFile.getAbsolutePath());

      if (opt != null && opt.maxDurationSec > 0) {
        recorder.setMaxDuration(opt.maxDurationSec * 1000);
      }
      if (opt != null && opt.maxFileSize > 0) {
        try {
          recorder.setMaxFileSize(opt.maxFileSize);
        } catch (Exception ignore) {
        }
      }

      recorder.prepare();
      recorder.start();
      startMs = System.currentTimeMillis();
      Log.d(TAG, "Recording started → " + outputFile);
      return true;
    } catch (Throwable t) {
      Log.e(TAG, "start failed", t);
      cleanup();
      return false;
    }
  }

  private Camera2VideoRecorder camera2Ref;

  public static class StopResult {
    public String uri;
    public double duration;
    public long size;
    public int width;
    public int height;
    public int fps;
    public String codec;
  }

  public synchronized StopResult stop() {
    StopResult res = new StopResult();
    try {
      if (camera2Ref != null) {
        StopResult r = camera2Ref.stop();
        camera2Ref = null;
        return r;
      }
      if (recorder != null) {
        try {
          recorder.stop();
        } catch (Throwable ignore) {
        }
      }
    } finally {
      try {
        if (recorder != null)
          recorder.reset();
      } catch (Throwable ignore) {
      }
      try {
        if (recorder != null)
          recorder.release();
      } catch (Throwable ignore) {
      }
      recorder = null;
      try {
        if (camera != null)
          camera.lock();
      } catch (Throwable ignore) {
      }
      try {
        if (camera != null)
          camera.release();
      } catch (Throwable ignore) {
      }
      camera = null;
    }

    res.uri = outputFile != null ? outputFile.getAbsolutePath() : "";
    res.size =
        outputFile != null && outputFile.exists() ? outputFile.length() : 0;
    res.duration =
        startMs > 0 ? (System.currentTimeMillis() - startMs) / 1000.0 : 0.0;
    res.width = 0;
    res.height = 0;
    res.fps = 0;
    res.codec = "H264"; // valeur indicative
    Log.d(TAG, "Recording stopped → " + res.uri + " size=" + res.size);
    outputFile = null;
    return res;
  }

  private void cleanup() {
    try {
      if (recorder != null)
        recorder.reset();
    } catch (Throwable ignore) {
    }
    try {
      if (recorder != null)
        recorder.release();
    } catch (Throwable ignore) {
    }
    recorder = null;
    try {
      if (camera != null)
        camera.lock();
    } catch (Throwable ignore) {
    }
    try {
      if (camera != null)
        camera.release();
    } catch (Throwable ignore) {
    }
    camera = null;
  }
}
