#ifdef __ANDROID__
#include <jni.h>
#include <atomic>
#include <memory>
#include <vector>

// C API global exposée par le module EQ
extern "C" bool NaayaEQ_IsEnabled();
extern "C" double NaayaEQ_GetMasterGainDB();
extern "C" size_t NaayaEQ_CopyBandGains(double* out, size_t maxCount);
extern "C" size_t NaayaEQ_GetNumBands();
extern "C" bool NaayaEQ_HasPendingUpdate();
extern "C" void NaayaEQ_ClearPendingUpdate();

#include "../../../../shared/Audio/core/AudioEqualizer.h"

using AudioEqualizer::AudioEqualizer;

namespace {
std::unique_ptr<AudioEqualizer> g_eq;
uint32_t g_sampleRate = 48000;
int g_channels = 2;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_naaya_audio_NativeEqProcessor_eqIsEnabled(JNIEnv*, jclass) {
  return NaayaEQ_IsEnabled() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_naaya_audio_NativeEqProcessor_nativeInit(JNIEnv*, jclass, jint sampleRate, jint channels) {
  if (sampleRate <= 0) sampleRate = 48000;
  if (channels != 1 && channels != 2) channels = 2;
  g_eq = std::make_unique<AudioEqualizer>(10, static_cast<uint32_t>(sampleRate));
  g_sampleRate = static_cast<uint32_t>(sampleRate);
  g_channels = channels;
  double gains[32] = {0};
  size_t nb = NaayaEQ_CopyBandGains(gains, 32);
  g_eq->beginParameterUpdate();
  for (size_t i = 0; i < nb; ++i) g_eq->setBandGain(i, gains[i]);
  g_eq->endParameterUpdate();
  g_eq->setMasterGain(NaayaEQ_GetMasterGainDB());
  g_eq->setBypass(!NaayaEQ_IsEnabled());
}

extern "C" JNIEXPORT void JNICALL
Java_com_naaya_audio_NativeEqProcessor_nativeRelease(JNIEnv*, jclass) {
  g_eq.reset();
}

extern "C" JNIEXPORT void JNICALL
Java_com_naaya_audio_NativeEqProcessor_nativeSyncParams(JNIEnv*, jclass) {
  if (!g_eq) return;
  if (NaayaEQ_HasPendingUpdate()) {
    double gains[32] = {0};
    size_t nb = NaayaEQ_CopyBandGains(gains, 32);
    g_eq->beginParameterUpdate();
    for (size_t i = 0; i < nb; ++i) g_eq->setBandGain(i, gains[i]);
    g_eq->endParameterUpdate();
    g_eq->setMasterGain(NaayaEQ_GetMasterGainDB());
    g_eq->setBypass(!NaayaEQ_IsEnabled());
    NaayaEQ_ClearPendingUpdate();
  }
}

extern "C" JNIEXPORT void JNICALL
Java_com_naaya_audio_NativeEqProcessor_nativeProcessShortInterleaved(JNIEnv* env, jclass, jshortArray pcm, jint frames, jint channels) {
  if (!g_eq || !pcm || frames <= 0) return;
  if (channels != 1 && channels != 2) channels = 2;
  jsize len = env->GetArrayLength(pcm);
  if (len < (channels * frames)) return;
  jshort* buf = env->GetShortArrayElements(pcm, nullptr);
  if (!buf) return;
  if (channels == 1) {
    std::vector<float> mono(frames), out(frames);
    for (int i = 0; i < frames; ++i) mono[i] = (float)buf[i] / 32768.0f;
    g_eq->process(mono.data(), out.data(), (size_t)frames);
    for (int i = 0; i < frames; ++i) {
      float v = out[i]; if (v < -1.f) v = -1.f; if (v > 1.f) v = 1.f;
      buf[i] = (jshort)lrintf(v * 32767.0f);
    }
  } else {
    std::vector<float> left(frames), right(frames), outL(frames), outR(frames);
    for (int i = 0; i < frames; ++i) { left[i] = (float)buf[2*i] / 32768.0f; right[i] = (float)buf[2*i+1] / 32768.0f; }
    g_eq->processStereo(left.data(), right.data(), outL.data(), outR.data(), (size_t)frames);
    for (int i = 0; i < frames; ++i) {
      float vl = outL[i]; if (vl < -1.f) vl = -1.f; if (vl > 1.f) vl = 1.f;
      float vr = outR[i]; if (vr < -1.f) vr = -1.f; if (vr > 1.f) vr = 1.f;
      buf[2*i] = (jshort)lrintf(vl * 32767.0f);
      buf[2*i+1] = (jshort)lrintf(vr * 32767.0f);
    }
  }
  env->ReleaseShortArrayElements(pcm, buf, 0);
}

#endif // __ANDROID__



