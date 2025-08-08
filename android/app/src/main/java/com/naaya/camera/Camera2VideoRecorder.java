package com.naaya.camera;

import android.content.Context;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.CamcorderProfile;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import android.util.Size;
import android.view.Surface;
import com.naaya.audio.NativeEqProcessor;
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Implémentation enregistrement vidéo basée sur Camera2 + MediaRecorder.
 */
class Camera2VideoRecorder {
  private static final String TAG = "NaayaCam2";

  private final Context appContext;

  private CameraDevice cameraDevice;
  private CameraCaptureSession captureSession;
  private MediaRecorder mediaRecorder;
  private String cameraId;
  private Size videoSize = new Size(1920, 1080);
  private int videoFps = 30;
  private File outputFile;
  private long startMs;

  // Audio pipeline (AudioRecord + MediaCodec AAC)
  private Thread audioThread;
  private volatile boolean audioRunning = false;
  private MediaCodec audioEncoder;
  private MediaMuxer audioMuxer;
  private int audioTrackIndex = -1;
  private boolean audioMuxerStarted = false;
  private File audioOutFile;

  Camera2VideoRecorder(Context context) {
    this.appContext = context.getApplicationContext();
  }

  private static String generateFileName() {
    String ts = new SimpleDateFormat("yyyyMMdd_HHmmss_SSS", Locale.US)
                    .format(new Date());
    return "video_" + ts + ".mp4";
  }

  private File resolveOutputDir() {
    File dir = appContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES);
    if (dir == null)
      dir = appContext.getFilesDir();
    if (!dir.exists())
      dir.mkdirs();
    return dir;
  }

  private String findBackCameraId(CameraManager manager)
      throws CameraAccessException {
    for (String id : manager.getCameraIdList()) {
      CameraCharacteristics c = manager.getCameraCharacteristics(id);
      Integer facing = c.get(CameraCharacteristics.LENS_FACING);
      if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
        return id;
      }
    }
    return manager.getCameraIdList().length > 0 ? manager.getCameraIdList()[0]
                                                : null;
  }

  private void pickProfile() {
    try {
      if (CamcorderProfile.hasProfile(CamcorderProfile.QUALITY_1080P)) {
        CamcorderProfile p =
            CamcorderProfile.get(CamcorderProfile.QUALITY_1080P);
        videoSize = new Size(p.videoFrameWidth, p.videoFrameHeight);
        videoFps = p.videoFrameRate;
      } else {
        CamcorderProfile p =
            CamcorderProfile.get(CamcorderProfile.QUALITY_HIGH);
        videoSize = new Size(p.videoFrameWidth, p.videoFrameHeight);
        videoFps = p.videoFrameRate;
      }
    } catch (Throwable ignore) { /* garder par défaut */
    }
  }

  boolean start(LegacyVideoRecorder.StartOptions opt) {
    try {
      CameraManager manager =
          (CameraManager)appContext.getSystemService(Context.CAMERA_SERVICE);
      if (manager == null)
        return false;
      // deviceId: "front" | "back" | cameraId
      if (opt != null && opt.deviceId != null) {
        if ("front".equalsIgnoreCase(opt.deviceId) ||
            "back".equalsIgnoreCase(opt.deviceId)) {
          String chosen = null;
          for (String id : manager.getCameraIdList()) {
            CameraCharacteristics c = manager.getCameraCharacteristics(id);
            Integer facing = c.get(CameraCharacteristics.LENS_FACING);
            if (facing != null &&
                (("front".equalsIgnoreCase(opt.deviceId) &&
                  facing == CameraCharacteristics.LENS_FACING_FRONT) ||
                 ("back".equalsIgnoreCase(opt.deviceId) &&
                  facing == CameraCharacteristics.LENS_FACING_BACK))) {
              chosen = id;
              break;
            }
          }
          cameraId = (chosen != null) ? chosen : findBackCameraId(manager);
        } else {
          cameraId = opt.deviceId;
        }
      } else {
        cameraId = findBackCameraId(manager);
      }
      if (cameraId == null)
        return false;

      pickProfile();
      if (opt != null) {
        if (opt.width > 0 && opt.height > 0) {
          videoSize = new Size(opt.width, opt.height);
        }
        if (opt.fps > 0) {
          videoFps = opt.fps;
        }
      }

      prepareRecorder(opt);

      final Object lock = new Object();
      final boolean[] opened = new boolean[] {false};

      manager.openCamera(cameraId, new CameraDevice.StateCallback() {
        @Override
        public void onOpened(CameraDevice camera) {
          cameraDevice = camera;
          try {
            List<Surface> outputs = new ArrayList<>();
            Surface recSurface = mediaRecorder.getSurface();
            outputs.add(recSurface);

            camera.createCaptureSession(
                outputs, new CameraCaptureSession.StateCallback() {
                  @Override
                  public void onConfigured(CameraCaptureSession session) {
                    captureSession = session;
                    try {
                      CaptureRequest.Builder b = camera.createCaptureRequest(
                          CameraDevice.TEMPLATE_RECORD);
                      b.addTarget(recSurface);
                      b.set(CaptureRequest.CONTROL_MODE,
                            CaptureRequest.CONTROL_MODE_AUTO);
                      session.setRepeatingRequest(b.build(), null, null);
                      // Démarrer audio pipeline si demandé (et EQ possible)
                      if (opt != null && opt.recordAudio) {
                        startAudioPipeline(
                            /*sampleRate*/ 44100, /*channels*/ 2,
                            opt.audioBitrate > 0 ? opt.audioBitrate : 128000);
                      }
                      mediaRecorder.start();
                      synchronized (lock) {
                        opened[0] = true;
                        lock.notifyAll();
                      }
                    } catch (Exception e) {
                      Log.e(TAG, "setRepeatingRequest/start failed", e);
                      synchronized (lock) {
                        opened[0] = false;
                        lock.notifyAll();
                      }
                    }
                  }
                  @Override
                  public void onConfigureFailed(CameraCaptureSession session) {
                    synchronized (lock) {
                      opened[0] = false;
                      lock.notifyAll();
                    }
                  }
                }, null);
          } catch (Exception e) {
            Log.e(TAG, "createCaptureSession failed", e);
            synchronized (lock) {
              opened[0] = false;
              lock.notifyAll();
            }
          }
        }
        @Override
        public void onDisconnected(CameraDevice camera) {
          closeCamera();
        }
        @Override
        public void onError(CameraDevice camera, int error) {
          Log.e(TAG, "onError camera2: " + error);
          closeCamera();
          synchronized (lock) {
            opened[0] = false;
            lock.notifyAll();
          }
        }
      }, null);

      // Attendre résultat (très basique; idéalement via callback/Promise)
      synchronized (lock) { lock.wait(4000); }
      if (!opened[0]) {
        stopInternal();
        return false;
      }

      startMs = System.currentTimeMillis();
      return true;
    } catch (Throwable t) {
      Log.e(TAG, "start failed", t);
      stopInternal();
      return false;
    }
  }

  LegacyVideoRecorder.StopResult stop() {
    LegacyVideoRecorder.StopResult res = new LegacyVideoRecorder.StopResult();
    try {
      if (mediaRecorder != null) {
        try {
          mediaRecorder.stop();
        } catch (Throwable ignore) {
        }
      }
    } finally {
      // Fermer audio pipeline
      stopAudioPipeline();
      stopInternal();
    }
    // Si on a un fichier audio à part, remuxer avec la vidéo pour produire un
    // MP4 final
    File finalFile = outputFile;
    if (outputFile != null && audioOutFile != null && audioOutFile.exists()) {
      try {
        File remuxed =
            new File(outputFile.getParentFile(),
                     outputFile.getName().replace(".mp4", "_final.mp4"));
        if (remuxWithExternalAudio(outputFile, audioOutFile, remuxed)) {
          finalFile = remuxed;
          // Optionnel: supprimer fichiers intermédiaires
          // noinspection ResultOfMethodCallIgnored
          audioOutFile.delete();
        }
      } catch (Exception e) {
        Log.e(TAG, "remux failed", e);
      }
    }
    res.uri = finalFile != null ? finalFile.getAbsolutePath() : "";
    res.size =
        (finalFile != null && finalFile.exists()) ? finalFile.length() : 0;
    res.duration =
        startMs > 0 ? (System.currentTimeMillis() - startMs) / 1000.0 : 0.0;
    res.width = videoSize.getWidth();
    res.height = videoSize.getHeight();
    res.fps = videoFps;
    res.codec = "H264"; // indicatif; si HEVC sélectionné, on pourrait refléter
    return res;
  }

  private void prepareRecorder(LegacyVideoRecorder.StartOptions opt)
      throws Exception {
    mediaRecorder = new MediaRecorder();
    if (opt != null && opt.recordAudio) {
      mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
    }
    mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
    mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);

    // Codec vidéo
    String codec = (opt != null && opt.codec != null) ? opt.codec : "H264";
    if ("HEVC".equalsIgnoreCase(codec) && Build.VERSION.SDK_INT >= 24) {
      mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.HEVC);
    } else {
      mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
    }

    // Codec audio
    if (opt != null && opt.recordAudio) {
      mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
      mediaRecorder.setAudioSamplingRate(44100);
      mediaRecorder.setAudioEncodingBitRate(
          opt.audioBitrate > 0 ? opt.audioBitrate : 1280 * 100);
    }

    mediaRecorder.setVideoFrameRate(videoFps);
    mediaRecorder.setVideoSize(videoSize.getWidth(), videoSize.getHeight());
    mediaRecorder.setVideoEncodingBitRate(
        opt != null && opt.videoBitrate > 0 ? opt.videoBitrate : 8_000_000);

    File dir = resolveOutputDir();
    outputFile = new File(dir, generateFileName());
    mediaRecorder.setOutputFile(outputFile.getAbsolutePath());

    if (opt != null && opt.maxDurationSec > 0) {
      mediaRecorder.setMaxDuration(opt.maxDurationSec * 1000);
    }
    if (opt != null && opt.maxFileSize > 0) {
      try {
        mediaRecorder.setMaxFileSize(opt.maxFileSize);
      } catch (Exception ignore) {
      }
    }

    mediaRecorder.prepare();
  }

  private void stopInternal() {
    try {
      if (captureSession != null)
        captureSession.close();
    } catch (Throwable ignore) {
    }
    try {
      if (cameraDevice != null)
        cameraDevice.close();
    } catch (Throwable ignore) {
    }
    try {
      if (mediaRecorder != null)
        mediaRecorder.reset();
    } catch (Throwable ignore) {
    }
    try {
      if (mediaRecorder != null)
        mediaRecorder.release();
    } catch (Throwable ignore) {
    }
    captureSession = null;
    cameraDevice = null;
    mediaRecorder = null;
    audioOutFile = null;
  }

  private void startAudioPipeline(int sampleRate, int channels, int bitrate) {
    try {
      // Sortie AAC (m4a) provisoire
      audioOutFile = new File(resolveOutputDir(),
                              "audio_" + System.currentTimeMillis() + ".m4a");
      MediaFormat fmt = MediaFormat.createAudioFormat(
          MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels);
      fmt.setInteger(MediaFormat.KEY_AAC_PROFILE,
                     MediaCodecInfo.CodecProfileLevel.AACObjectLC);
      fmt.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
      audioEncoder =
          MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
      audioEncoder.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
      audioEncoder.start();
      audioMuxer = new MediaMuxer(audioOutFile.getAbsolutePath(),
                                  MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);

      audioRunning = true;
      audioThread = new Thread(() -> runAudioLoop(sampleRate, channels));
      audioThread.start();
    } catch (Exception e) {
      Log.e(TAG, "startAudioPipeline failed", e);
      try {
        if (audioEncoder != null)
          audioEncoder.release();
      } catch (Throwable ignore) {
      }
      try {
        if (audioMuxer != null)
          audioMuxer.release();
      } catch (Throwable ignore) {
      }
      audioEncoder = null;
      audioMuxer = null;
      audioOutFile = null;
      audioRunning = false;
    }
  }

  private void runAudioLoop(int sampleRate, int channels) {
    int chMask = (channels == 1) ? AudioFormat.CHANNEL_IN_MONO
                                 : AudioFormat.CHANNEL_IN_STEREO;
    int minBuf = AudioRecord.getMinBufferSize(sampleRate, chMask,
                                              AudioFormat.ENCODING_PCM_16BIT);
    AudioRecord rec = new AudioRecord(
        android.media.MediaRecorder.AudioSource.MIC, sampleRate, chMask,
        AudioFormat.ENCODING_PCM_16BIT, Math.max(minBuf, 4096));
    short[] buf = new short[2048 * channels];
    try {
      NativeEqProcessor.nativeInit(sampleRate, channels);
      rec.startRecording();
      MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
      while (audioRunning) {
        int read = rec.read(buf, 0, buf.length);
        if (read <= 0)
          continue;
        int frames = read / channels;
        if (NativeEqProcessor.eqIsEnabled()) {
          NativeEqProcessor.nativeSyncParams();
          NativeEqProcessor.nativeProcessShortInterleaved(buf, frames,
                                                          channels);
        }
        int inIndex = audioEncoder.dequeueInputBuffer(10000);
        if (inIndex >= 0) {
          java.nio.ByteBuffer inBuf = audioEncoder.getInputBuffer(inIndex);
          if (inBuf != null) {
            inBuf.clear();
            // PCM little-endian
            for (int i = 0; i < read; i++) {
              short s = buf[i];
              inBuf.put((byte)(s & 0xff));
              inBuf.put((byte)((s >> 8) & 0xff));
            }
            long pts = System.nanoTime() / 1000;
            audioEncoder.queueInputBuffer(inIndex, 0, read * 2, pts, 0);
          }
        }
        int outIndex;
        while ((outIndex = audioEncoder.dequeueOutputBuffer(info, 0)) >= 0) {
          java.nio.ByteBuffer outBuf = audioEncoder.getOutputBuffer(outIndex);
          if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
            // Format changé (csd)
            info.size = 0;
          }
          if (info.size > 0 && outBuf != null) {
            if (!audioMuxerStarted) {
              MediaFormat ofmt = audioEncoder.getOutputFormat();
              audioTrackIndex = audioMuxer.addTrack(ofmt);
              audioMuxer.start();
              audioMuxerStarted = true;
            }
            outBuf.position(info.offset);
            outBuf.limit(info.offset + info.size);
            audioMuxer.writeSampleData(audioTrackIndex, outBuf, info);
          }
          audioEncoder.releaseOutputBuffer(outIndex, false);
        }
      }
    } catch (Throwable t) {
      Log.e(TAG, "runAudioLoop error", t);
    } finally {
      try {
        rec.stop();
      } catch (Throwable ignore) {
      }
      try {
        rec.release();
      } catch (Throwable ignore) {
      }
      try {
        audioEncoder.stop();
      } catch (Throwable ignore) {
      }
      try {
        audioEncoder.release();
      } catch (Throwable ignore) {
      }
      try {
        if (audioMuxerStarted)
          audioMuxer.stop();
      } catch (Throwable ignore) {
      }
      try {
        audioMuxer.release();
      } catch (Throwable ignore) {
      }
      NativeEqProcessor.nativeRelease();
    }
  }

  private void stopAudioPipeline() {
    audioRunning = false;
    try {
      if (audioThread != null)
        audioThread.join(500);
    } catch (InterruptedException ignore) {
    }
    audioThread = null;
  }

  private boolean remuxWithExternalAudio(File videoMp4, File audioM4a,
                                         File outMp4) throws Exception {
    MediaExtractor vEx = new MediaExtractor();
    vEx.setDataSource(videoMp4.getAbsolutePath());
    int vIndex = -1;
    for (int i = 0; i < vEx.getTrackCount(); i++) {
      MediaFormat f = vEx.getTrackFormat(i);
      String mime = f.getString(MediaFormat.KEY_MIME);
      if (mime != null && mime.startsWith("video/")) {
        vIndex = i;
        break;
      }
    }
    if (vIndex < 0) {
      vEx.release();
      return false;
    }
    vEx.selectTrack(vIndex);

    MediaExtractor aEx = new MediaExtractor();
    aEx.setDataSource(audioM4a.getAbsolutePath());
    int aIndex = -1;
    for (int i = 0; i < aEx.getTrackCount(); i++) {
      MediaFormat f = aEx.getTrackFormat(i);
      String mime = f.getString(MediaFormat.KEY_MIME);
      if (mime != null && mime.startsWith("audio/")) {
        aIndex = i;
        break;
      }
    }
    if (aIndex < 0) {
      aEx.release();
      vEx.release();
      return false;
    }
    aEx.selectTrack(aIndex);

    MediaMuxer mux = new MediaMuxer(
        outMp4.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
    int outV = mux.addTrack(vEx.getTrackFormat(vIndex));
    int outA = mux.addTrack(aEx.getTrackFormat(aIndex));
    mux.start();

    MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
    java.nio.ByteBuffer buf = java.nio.ByteBuffer.allocate(1024 * 1024);
    // Copy video
    while (true) {
      int sz = vEx.readSampleData(buf, 0);
      if (sz < 0)
        break;
      info.offset = 0;
      info.size = sz;
      info.presentationTimeUs = vEx.getSampleTime();
      info.flags = vEx.getSampleFlags();
      mux.writeSampleData(outV, buf, info);
      vEx.advance();
    }
    // Copy audio
    buf.clear();
    while (true) {
      int sz = aEx.readSampleData(buf, 0);
      if (sz < 0)
        break;
      info.offset = 0;
      info.size = sz;
      info.presentationTimeUs = aEx.getSampleTime();
      info.flags = aEx.getSampleFlags();
      mux.writeSampleData(outA, buf, info);
      aEx.advance();
    }

    mux.stop();
    mux.release();
    vEx.release();
    aEx.release();
    return true;
  }

  private void closeCamera() {
    try {
      if (captureSession != null)
        captureSession.close();
    } catch (Throwable ignore) {
    }
    try {
      if (cameraDevice != null)
        cameraDevice.close();
    } catch (Throwable ignore) {
    }
    captureSession = null;
    cameraDevice = null;
  }
}
