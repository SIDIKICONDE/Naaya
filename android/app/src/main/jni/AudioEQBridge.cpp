#ifdef __ANDROID__
#include <jni.h>
#include <atomic>
#include <memory>
#include <vector>
#include <math.h>
#include <algorithm>
#include <cstring>

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

// === Spectre (aligné iOS) ===
static std::atomic<bool> g_spectrumRunning{false};
static float g_spectrum[64] = {0};

static inline float hann(size_t n, size_t N) {
  return 0.5f * (1.0f - cosf(2.0f * static_cast<float>(M_PI) * static_cast<float>(n) / static_cast<float>(N - 1)));
}

static void computeSpectrumFromMono(const float* in, size_t frames) {
  if (!in || frames == 0) return;
  constexpr size_t N = 1024;
  static thread_local float realp[N];
  static thread_local float imagp[N];
  size_t L = frames < N ? frames : N;
  for (size_t i = 0; i < L; ++i) realp[i] = in[i] * hann(i, N);
  if (L < N) memset(realp + L, 0, sizeof(float) * (N - L));
  memset(imagp, 0, sizeof(float) * N);
  // Naive DFT (O(N^2))
  const double twoPiOverN = 2.0 * M_PI / static_cast<double>(N);
  for (size_t k = 0; k < N; ++k) {
    double sumRe = 0.0, sumIm = 0.0;
    for (size_t n = 0; n < N; ++n) {
      double angle = twoPiOverN * static_cast<double>(k * n);
      double x = static_cast<double>(realp[n]);
      sumRe += x * cos(angle);
      sumIm -= x * sin(angle);
    }
    realp[k] = static_cast<float>(sumRe);
    imagp[k] = static_cast<float>(sumIm);
  }
  // Magnitudes sur N/2
  static thread_local float mags[N/2];
  for (size_t k = 0; k < N/2; ++k) {
    float r = realp[k]; float im = imagp[k];
    mags[k] = std::sqrt(r * r + im * im);
  }
  // Agg 32 barres et normalisation log 0..1
  const int bars = 32;
  float outBars[bars];
  int per = static_cast<int>((N/2) / bars);
  if (per < 1) per = 1;
  for (int b = 0; b < bars; ++b) {
    int start = b * per;
    int end = start + per;
    if (end > static_cast<int>(N/2)) end = static_cast<int>(N/2);
    float sum = 0.f; int cnt = 0;
    for (int k = start; k < end; ++k) { sum += mags[k]; ++cnt; }
    outBars[b] = cnt > 0 ? (sum / cnt) : 0.f;
  }
  float maxv = 1.f;
  for (int b = 0; b < bars; ++b) if (outBars[b] > maxv) maxv = outBars[b];
  for (int b = 0; b < bars; ++b) {
    float norm = static_cast<float>(log1pf(outBars[b]) / log1pf(maxv));
    if (norm < 0.f) norm = 0.f; else if (norm > 1.f) norm = 1.f;
    g_spectrum[b] = norm;
  }
}
}

// C-API spectre commune
extern "C" void NaayaAudioSpectrumStart(void) { g_spectrumRunning.store(true); }
extern "C" void NaayaAudioSpectrumStop(void) { g_spectrumRunning.store(false); }
extern "C" size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount) {
  if (!outBuffer || maxCount == 0) return 0;
  size_t n = maxCount < 32 ? maxCount : 32;
  memcpy(outBuffer, g_spectrum, n * sizeof(float));
  return n;
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
    if (g_spectrumRunning.load()) { computeSpectrumFromMono(tlMono.data(), (size_t)frames); }
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
    if (g_spectrumRunning.load()) {
      tlTmpMono.resize((size_t)frames);
      for (int i = 0; i < frames; ++i) tlTmpMono[(size_t)i] = 0.5f * (tlLeft[(size_t)i] + tlRight[(size_t)i]);
      computeSpectrumFromMono(tlTmpMono.data(), (size_t)frames);
    }
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



