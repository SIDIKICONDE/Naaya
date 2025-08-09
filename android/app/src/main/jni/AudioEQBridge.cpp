#ifdef __ANDROID__
#include <jni.h>
#include <atomic>
#include <memory>
#include <vector>
#include <math.h>

// C API global exposée par le module EQ
extern "C" bool NaayaEQ_IsEnabled();
extern "C" double NaayaEQ_GetMasterGainDB();
extern "C" size_t NaayaEQ_CopyBandGains(double* out, size_t maxCount);
extern "C" size_t NaayaEQ_GetNumBands();
extern "C" bool NaayaEQ_HasPendingUpdate();
extern "C" void NaayaEQ_ClearPendingUpdate();

// NR state exposed by C API (shared with iOS)
extern "C" bool NaayaNR_IsEnabled();
extern "C" bool NaayaNR_HasPendingUpdate();
extern "C" void NaayaNR_ClearPendingUpdate();
extern "C" void NaayaNR_GetConfig(bool* hpEnabled,
                                  double* hpHz,
                                  double* thresholdDb,
                                  double* ratio,
                                  double* floorDb,
                                  double* attackMs,
                                  double* releaseMs);

// FX state exposed by C API (shared with iOS)
extern "C" bool NaayaFX_IsEnabled();
extern "C" bool NaayaFX_HasPendingUpdate();
extern "C" void NaayaFX_ClearPendingUpdate();
extern "C" void NaayaFX_GetCompressor(double* thresholdDb,
                                       double* ratio,
                                       double* attackMs,
                                       double* releaseMs,
                                       double* makeupDb);
extern "C" void NaayaFX_GetDelay(double* delayMs,
                                  double* feedback,
                                  double* mix);

#include "core/AudioEqualizer.h"
#include "noise/NoiseReducer.h"
#include "safety/AudioSafety.h"
#include "effects/EffectChain.h"
#include "effects/Compressor.h"
#include "effects/Delay.h"

namespace {
using AudioEqClass = AudioEqualizer::AudioEqualizer;
std::unique_ptr<AudioEqClass> g_eq;
uint32_t g_sampleRate = 48000;
int g_channels = 2;
std::unique_ptr<AudioNR::NoiseReducer> g_nr;
std::unique_ptr<AudioSafety::AudioSafetyEngine> g_safety;
std::unique_ptr<AudioFX::EffectChain> g_fx;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_naaya_audio_NativeEqProcessor_eqIsEnabled(JNIEnv*, jclass) {
  return NaayaEQ_IsEnabled() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_naaya_audio_NativeEqProcessor_nativeInit(JNIEnv*, jclass, jint sampleRate, jint channels) {
  if (sampleRate <= 0) sampleRate = 48000;
  if (channels != 1 && channels != 2) channels = 2;
  g_eq = std::make_unique<AudioEqClass>(10, static_cast<uint32_t>(sampleRate));
  g_sampleRate = static_cast<uint32_t>(sampleRate);
  g_channels = channels;
  // NR init
  g_nr = std::make_unique<AudioNR::NoiseReducer>(g_sampleRate, g_channels);
  g_safety = std::make_unique<AudioSafety::AudioSafetyEngine>(g_sampleRate, g_channels);
  // FX init
  g_fx = std::make_unique<AudioFX::EffectChain>();
  g_fx->setEnabled(NaayaFX_IsEnabled());
  g_fx->setSampleRate(g_sampleRate, g_channels);
  // Build chain with defaults
  {
    auto* comp = g_fx->emplaceEffect<AudioFX::CompressorEffect>();
    auto* del = g_fx->emplaceEffect<AudioFX::DelayEffect>();
    comp->setEnabled(true);
    del->setEnabled(true);
    double th, ra, at, rl, mk; NaayaFX_GetCompressor(&th, &ra, &at, &rl, &mk);
    comp->setParameters(th, ra, at, rl, mk);
    double dm, fb, mx; NaayaFX_GetDelay(&dm, &fb, &mx);
    del->setParameters(dm, fb, mx);
  }
  {
    bool hpE; double hpHz, thDb, ratio, flDb, aMs, rMs;
    NaayaNR_GetConfig(&hpE, &hpHz, &thDb, &ratio, &flDb, &aMs, &rMs);
    AudioNR::NoiseReducerConfig cfg; cfg.enabled = NaayaNR_IsEnabled(); cfg.enableHighPass = hpE; cfg.highPassHz = hpHz; cfg.thresholdDb = thDb; cfg.ratio = ratio; cfg.floorDb = flDb; cfg.attackMs = aMs; cfg.releaseMs = rMs; g_nr->setConfig(cfg);
  }
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
  g_nr.reset();
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
  if (NaayaNR_HasPendingUpdate()) {
    if (g_nr) {
      bool hpE; double hpHz, thDb, ratio, flDb, aMs, rMs;
      NaayaNR_GetConfig(&hpE, &hpHz, &thDb, &ratio, &flDb, &aMs, &rMs);
      AudioNR::NoiseReducerConfig cfg; cfg.enabled = NaayaNR_IsEnabled(); cfg.enableHighPass = hpE; cfg.highPassHz = hpHz; cfg.thresholdDb = thDb; cfg.ratio = ratio; cfg.floorDb = flDb; cfg.attackMs = aMs; cfg.releaseMs = rMs; g_nr->setConfig(cfg);
      NaayaNR_ClearPendingUpdate();
    }
  }
  if (NaayaFX_HasPendingUpdate()) {
    if (g_fx) {
      g_fx->setEnabled(NaayaFX_IsEnabled());
      double th, ra, at, rl, mk; NaayaFX_GetCompressor(&th, &ra, &at, &rl, &mk);
      double dm, fb, mx; NaayaFX_GetDelay(&dm, &fb, &mx);
      g_fx->setSampleRate(g_sampleRate, g_channels);
      g_fx->clear();
      auto* comp = g_fx->emplaceEffect<AudioFX::CompressorEffect>();
      auto* del = g_fx->emplaceEffect<AudioFX::DelayEffect>();
      comp->setEnabled(true); del->setEnabled(true);
      comp->setParameters(th, ra, at, rl, mk);
      del->setParameters(dm, fb, mx);
    }
    NaayaFX_ClearPendingUpdate();
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
  // Tampons réutilisés par thread pour limiter les allocations
  static thread_local std::vector<float> tlMono;
  static thread_local std::vector<float> tlTmpMono;
  static thread_local std::vector<float> tlOutMono;
  static thread_local std::vector<float> tlLeft;
  static thread_local std::vector<float> tlRight;
  static thread_local std::vector<float> tlTmpL;
  static thread_local std::vector<float> tlTmpR;
  static thread_local std::vector<float> tlOutL;
  static thread_local std::vector<float> tlOutR;
  if (channels == 1) {
    tlMono.resize((size_t)frames);
    tlOutMono.resize((size_t)frames);
    for (int i = 0; i < frames; ++i) tlMono[(size_t)i] = (float)buf[i] / 32768.0f;
    if (g_nr) { tlTmpMono.resize((size_t)frames); g_nr->processMono(tlMono.data(), tlTmpMono.data(), (size_t)frames); tlMono.swap(tlTmpMono); }
    if (g_fx && g_fx->isEnabled()) { tlTmpMono.resize((size_t)frames); g_fx->processMono(tlMono.data(), tlTmpMono.data(), (size_t)frames); tlMono.swap(tlTmpMono); }
    if (g_safety) { g_safety->processMono(tlMono.data(), (size_t)frames); }
    g_eq->process(tlMono.data(), tlOutMono.data(), (size_t)frames);
    for (int i = 0; i < frames; ++i) {
      float v = tlOutMono[(size_t)i]; if (v < -1.f) v = -1.f; if (v > 1.f) v = 1.f;
      buf[i] = (jshort)lrintf(v * 32767.0f);
    }
  } else {
    tlLeft.resize((size_t)frames); tlRight.resize((size_t)frames);
    tlOutL.resize((size_t)frames); tlOutR.resize((size_t)frames);
    for (int i = 0; i < frames; ++i) { tlLeft[(size_t)i] = (float)buf[2*i] / 32768.0f; tlRight[(size_t)i] = (float)buf[2*i+1] / 32768.0f; }
    if (g_nr) { tlTmpL.resize((size_t)frames); tlTmpR.resize((size_t)frames); g_nr->processStereo(tlLeft.data(), tlRight.data(), tlTmpL.data(), tlTmpR.data(), (size_t)frames); tlLeft.swap(tlTmpL); tlRight.swap(tlTmpR); }
    if (g_fx && g_fx->isEnabled()) { tlTmpL.resize((size_t)frames); tlTmpR.resize((size_t)frames); g_fx->processStereo(tlLeft.data(), tlRight.data(), tlTmpL.data(), tlTmpR.data(), (size_t)frames); tlLeft.swap(tlTmpL); tlRight.swap(tlTmpR); }
    if (g_safety) { g_safety->processStereo(tlLeft.data(), tlRight.data(), (size_t)frames); }
    g_eq->processStereo(tlLeft.data(), tlRight.data(), tlOutL.data(), tlOutR.data(), (size_t)frames);
    for (int i = 0; i < frames; ++i) {
      float vl = tlOutL[(size_t)i]; if (vl < -1.f) vl = -1.f; if (vl > 1.f) vl = 1.f;
      float vr = tlOutR[(size_t)i]; if (vr < -1.f) vr = -1.f; if (vr > 1.f) vr = 1.f;
      buf[2*i] = (jshort)lrintf(vl * 32767.0f);
      buf[2*i+1] = (jshort)lrintf(vr * 32767.0f);
    }
  }
  env->ReleaseShortArrayElements(pcm, buf, 0);
}

#endif // __ANDROID__



