#include "NativeAudioEqualizerModule.h"
#include <atomic>
#include <mutex>

// === API C globale (accessible depuis ObjC/Java) pour l'état EQ par défaut ===
// Ces symboles existent toujours (stubs si NAAYA_AUDIO_EQ_ENABLED=0)
static std::mutex g_naaya_eq_mutex;
static bool g_naaya_eq_enabled = false;
static double g_naaya_eq_master_gain = 0.0;
static double g_naaya_eq_band_gains[32] = {0};
static size_t g_naaya_eq_num_bands = 10;
static std::atomic<bool> g_naaya_eq_dirty{false};

// === NR global state (accessible cross-platform) ===
static std::mutex g_naaya_nr_mutex;
static bool   g_naaya_nr_enabled = false;
// Mode NR: 0=expander, 1=rnnoise, 2=off
static int    g_naaya_nr_mode = 0;
// RNNoise aggressiveness (0.0..3.0)
static double g_naaya_rnns_aggr = 1.0;
static bool   g_naaya_nr_hp_enabled = true;
static double g_naaya_nr_hp_hz = 80.0;
static double g_naaya_nr_threshold_db = -45.0;
static double g_naaya_nr_ratio = 2.5;
static double g_naaya_nr_floor_db = -18.0;
static double g_naaya_nr_attack_ms = 3.0;
static double g_naaya_nr_release_ms = 80.0;
static std::atomic<bool> g_naaya_nr_dirty{false};

// Safety (audio integrity) global state
static std::mutex g_naaya_safety_mutex;
static bool   g_naaya_safety_enabled = true;
static bool   g_naaya_safety_dc_enabled = true;
static double g_naaya_safety_dc_threshold = 0.002;
static bool   g_naaya_safety_limiter_enabled = true;
static double g_naaya_safety_limiter_threshold_db = -1.0;
static bool   g_naaya_safety_softknee = true;
static double g_naaya_safety_knee_db = 6.0;
static bool   g_naaya_safety_feedback_enabled = true;
static double g_naaya_safety_feedback_thresh = 0.95;
static std::atomic<bool> g_naaya_safety_dirty{false};
static double g_naaya_safety_last_peak = 0.0;
static double g_naaya_safety_last_rms = 0.0;
static double g_naaya_safety_last_dc = 0.0;
static uint32_t g_naaya_safety_last_clipped = 0;
static double g_naaya_safety_last_feedback = 0.0;
static bool g_naaya_safety_last_overload = false;

// === FX (creative effects) global state ===
static std::mutex g_naaya_fx_mutex;
static bool   g_naaya_fx_enabled = false;
// Compressor
static double g_naaya_fx_comp_threshold_db = -18.0;
static double g_naaya_fx_comp_ratio        = 3.0;
static double g_naaya_fx_comp_attack_ms    = 10.0;
static double g_naaya_fx_comp_release_ms   = 80.0;
static double g_naaya_fx_comp_makeup_db    = 0.0;
// Delay
static double g_naaya_fx_delay_ms          = 150.0;
static double g_naaya_fx_delay_feedback    = 0.3;
static double g_naaya_fx_delay_mix         = 0.25;
static std::atomic<bool> g_naaya_fx_dirty{false};

extern "C" bool NaayaEQ_IsEnabled() {
  std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
  return g_naaya_eq_enabled;
}

extern "C" double NaayaEQ_GetMasterGainDB() {
  std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
  return g_naaya_eq_master_gain;
}

extern "C" size_t NaayaEQ_CopyBandGains(double* out, size_t maxCount) {
  if (!out || maxCount == 0) return 0;
  std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
  size_t n = g_naaya_eq_num_bands < maxCount ? g_naaya_eq_num_bands : maxCount;
  for (size_t i = 0; i < n; ++i) out[i] = g_naaya_eq_band_gains[i];
  return n;
}

extern "C" size_t NaayaEQ_GetNumBands() {
  std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
  return g_naaya_eq_num_bands;
}

extern "C" bool NaayaEQ_HasPendingUpdate() {
  return g_naaya_eq_dirty.load();
}

extern "C" void NaayaEQ_ClearPendingUpdate() {
  g_naaya_eq_dirty.store(false);
}

// === NR C API ===
extern "C" bool NaayaNR_IsEnabled() {
  std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
  return g_naaya_nr_enabled;
}

extern "C" bool NaayaNR_HasPendingUpdate() {
  return g_naaya_nr_dirty.load();
}

extern "C" void NaayaNR_ClearPendingUpdate() {
  g_naaya_nr_dirty.store(false);
}

extern "C" int NaayaNR_GetMode() {
  std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
  return g_naaya_nr_mode;
}

extern "C" double NaayaRNNS_GetAggressiveness() {
  std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
  return g_naaya_rnns_aggr;
}

extern "C" void NaayaNR_GetConfig(bool* hpEnabled,
                                  double* hpHz,
                                  double* thresholdDb,
                                  double* ratio,
                                  double* floorDb,
                                  double* attackMs,
                                  double* releaseMs) {
  std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
  if (hpEnabled)   *hpEnabled   = g_naaya_nr_hp_enabled;
  if (hpHz)        *hpHz        = g_naaya_nr_hp_hz;
  if (thresholdDb) *thresholdDb = g_naaya_nr_threshold_db;
  if (ratio)       *ratio       = g_naaya_nr_ratio;
  if (floorDb)     *floorDb     = g_naaya_nr_floor_db;
  if (attackMs)    *attackMs    = g_naaya_nr_attack_ms;
  if (releaseMs)   *releaseMs   = g_naaya_nr_release_ms;
}

// === FX C API ===
extern "C" bool NaayaFX_IsEnabled() {
  std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
  return g_naaya_fx_enabled;
}

extern "C" bool NaayaFX_HasPendingUpdate() {
  return g_naaya_fx_dirty.load();
}

extern "C" void NaayaFX_ClearPendingUpdate() {
  g_naaya_fx_dirty.store(false);
}

extern "C" void NaayaFX_GetCompressor(double* thresholdDb,
                                       double* ratio,
                                       double* attackMs,
                                       double* releaseMs,
                                       double* makeupDb) {
  std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
  if (thresholdDb) *thresholdDb = g_naaya_fx_comp_threshold_db;
  if (ratio)       *ratio       = g_naaya_fx_comp_ratio;
  if (attackMs)    *attackMs    = g_naaya_fx_comp_attack_ms;
  if (releaseMs)   *releaseMs   = g_naaya_fx_comp_release_ms;
  if (makeupDb)    *makeupDb    = g_naaya_fx_comp_makeup_db;
}

extern "C" void NaayaFX_GetDelay(double* delayMs,
                                  double* feedback,
                                  double* mix) {
  std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
  if (delayMs)  *delayMs  = g_naaya_fx_delay_ms;
  if (feedback) *feedback = g_naaya_fx_delay_feedback;
  if (mix)      *mix      = g_naaya_fx_delay_mix;
}

#if NAAYA_AUDIO_EQ_ENABLED
#include <cmath>
#include <string>
#ifndef NAAYA_HAS_SPECTRUM
#define NAAYA_HAS_SPECTRUM 1
#endif
#if NAAYA_HAS_SPECTRUM
extern "C" {
void NaayaAudioSpectrumStart(void);
void NaayaAudioSpectrumStop(void);
size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount);
}
#endif

namespace facebook {
namespace react {

NativeAudioEqualizerModule::NativeAudioEqualizerModule(std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeAudioEqualizerModule", jsInvoker)
    , m_nextEqualizerId(1)
    , defaultEqualizerId_(0)
    , bypassed_(true)
    , currentPresetName_("flat")
    , analysisRunning_(false) {
    
    // Register methods
    methodMap_["createEqualizer"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return self.createEqualizer(rt, args[0].asNumber(), args[1].asNumber());
    }};
    
    methodMap_["destroyEqualizer"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.destroyEqualizer(rt, args[0].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["processAudio"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return self.processAudio(rt, args[0].asNumber(), args[1].asObject(rt));
    }};
    
    methodMap_["processAudioStereo"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return self.processAudioStereo(rt, args[0].asNumber(), args[1].asObject(rt), args[2].asObject(rt));
    }};
    
    // Band control methods
    methodMap_["setBandGain"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBandGain(rt, args[0].asNumber(), args[1].asNumber(), args[2].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["setBandFrequency"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBandFrequency(rt, args[0].asNumber(), args[1].asNumber(), args[2].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["setBandQ"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBandQ(rt, args[0].asNumber(), args[1].asNumber(), args[2].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["setBandType"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBandType(rt, args[0].asNumber(), args[1].asNumber(), args[2].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["setBandEnabled"] = MethodMetadata{3, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBandEnabled(rt, args[0].asNumber(), args[1].asNumber(), args[2].asBool());
        return jsi::Value::undefined();
    }};
    
    // Get band parameters
    methodMap_["getBandGain"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getBandGain(rt, args[0].asNumber(), args[1].asNumber()));
    }};
    
    methodMap_["getBandFrequency"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getBandFrequency(rt, args[0].asNumber(), args[1].asNumber()));
    }};
    
    methodMap_["getBandQ"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getBandQ(rt, args[0].asNumber(), args[1].asNumber()));
    }};
    
    methodMap_["getBandType"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getBandType(rt, args[0].asNumber(), args[1].asNumber()));
    }};
    
    methodMap_["isBandEnabled"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.isBandEnabled(rt, args[0].asNumber(), args[1].asNumber()));
    }};
    
    // Global controls (compat couche JS: pas d'ID requis)
    methodMap_["setMasterGain"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        double gainDb = args[0].asNumber();
        self.setMasterGain(rt, self.defaultEqualizerId_, gainDb);
        {
          std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
          g_naaya_eq_master_gain = gainDb;
          g_naaya_eq_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};
    
    methodMap_["getMasterGain"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        return jsi::Value(self.getMasterGain(rt, self.defaultEqualizerId_));
    }};
    
    methodMap_["setBypass"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setBypass(rt, args[0].asNumber(), args[1].asBool());
        return jsi::Value::undefined();
    }};
    
    methodMap_["isBypassed"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.isBypassed(rt, args[0].asNumber()));
    }};
    
    // Preset management
    methodMap_["loadPreset"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.loadPreset(rt, args[0].asNumber(), args[1].asObject(rt));
        return jsi::Value::undefined();
    }};
    
    methodMap_["savePreset"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return self.savePreset(rt, args[0].asNumber());
    }};
    
    methodMap_["resetAllBands"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.resetAllBands(rt, args[0].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["getAvailablePresets"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return self.getAvailablePresets(rt);
    }};
    
    methodMap_["loadPresetByName"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.loadPresetByName(rt, args[0].asNumber(), args[1].asString(rt));
        return jsi::Value::undefined();
    }};
    
    // Utility
    methodMap_["getNumBands"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getNumBands(rt, args[0].asNumber()));
    }};
    
    methodMap_["setSampleRate"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setSampleRate(rt, args[0].asNumber(), args[1].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["getSampleRate"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getSampleRate(rt, args[0].asNumber()));
    }};
    
    methodMap_["beginParameterUpdate"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.beginParameterUpdate(rt, args[0].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["endParameterUpdate"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.endParameterUpdate(rt, args[0].asNumber());
        return jsi::Value::undefined();
    }};

    // Compat helpers without passing equalizerId from JS
    methodMap_["beginBatch"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        self.beginParameterUpdate(rt, self.defaultEqualizerId_);
        return jsi::Value::undefined();
    }};

    methodMap_["endBatch"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        self.endParameterUpdate(rt, self.defaultEqualizerId_);
        return jsi::Value::undefined();
    }};

    // ==== WRAPPERS SIMPLES POUR L'API JS EXISTANTE ====
    methodMap_["setEQEnabled"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        bool enabled = args[0].getBool();
        self.setBypass(rt, self.defaultEqualizerId_, !enabled);
        self.bypassed_ = !enabled;
        {
          std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
          g_naaya_eq_enabled = enabled;
          g_naaya_eq_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["getEQEnabled"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(!self.bypassed_);
    }};

    methodMap_["setBandGain"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        double idx = args[0].asNumber();
        if (idx < 0) idx = 0;
        if (idx > 31) idx = 31;
        self.setBandGain(rt, self.defaultEqualizerId_, idx, args[1].asNumber());
        {
          std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
          size_t sidx = static_cast<size_t>(idx);
          if (sidx < 32) g_naaya_eq_band_gains[sidx] = args[1].asNumber();
          g_naaya_eq_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["getBandGain"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        return jsi::Value(self.getBandGain(rt, self.defaultEqualizerId_, args[0].asNumber()));
    }};

    methodMap_["setPreset"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        auto name = args[0].asString(rt).utf8(rt);
        self.loadPresetByName(rt, self.defaultEqualizerId_, args[0].asString(rt));
        self.currentPresetName_ = name;
        // Synchroniser gains globaux
        {
          std::lock_guard<std::mutex> lk(g_naaya_eq_mutex);
          auto* eq = self.getEqualizer(self.defaultEqualizerId_);
          if (eq) {
            size_t n = eq->getNumBands();
            g_naaya_eq_num_bands = n <= 32 ? n : 32;
            for (size_t i = 0; i < g_naaya_eq_num_bands; ++i) {
              g_naaya_eq_band_gains[i] = eq->getBandGain(i);
            }
          }
          g_naaya_eq_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["getCurrentPreset"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::String::createFromUtf8(rt, self.currentPresetName_);
    }};

    methodMap_["startSpectrumAnalysis"] = MethodMetadata{0, [](jsi::Runtime& /*rt*/, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.analysisRunning_ = true;
#if NAAYA_HAS_SPECTRUM
        NaayaAudioSpectrumStart();
#endif 
        return jsi::Value::undefined();
    }};

    methodMap_["stopSpectrumAnalysis"] = MethodMetadata{0, [](jsi::Runtime& /*rt*/, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.analysisRunning_ = false;
#if NAAYA_HAS_SPECTRUM
        NaayaAudioSpectrumStop();
#endif 
        return jsi::Value::undefined();
    }};

    methodMap_["getSpectrumData"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        const size_t numBars = 32;
        jsi::Array result(rt, numBars);
#if NAAYA_HAS_SPECTRUM
        float buffer[64];
        size_t n = NaayaAudioSpectrumCopyMagnitudes(buffer, 64);
        size_t count = std::min(numBars, n);
        for (size_t i = 0; i < count; ++i) {
            result.setValueAtIndex(rt, i, jsi::Value(static_cast<double>(buffer[i])));
        }
        for (size_t i = count; i < numBars; ++i) {
            result.setValueAtIndex(rt, i, jsi::Value(0));
        }
#else
        for (size_t i = 0; i < numBars; ++i) {
            result.setValueAtIndex(rt, i, jsi::Value(0));
        }
#endif
        return result;
    }};

    // ===== Noise Reduction (NR) controls exposed to JS =====
    methodMap_["nrSetEnabled"] = MethodMetadata{1, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        bool en = args[0].getBool();
        {
          std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
          g_naaya_nr_enabled = en;
          g_naaya_nr_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["nrGetEnabled"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
        return jsi::Value(g_naaya_nr_enabled);
    }};

    // NR mode: 'expander' | 'rnnoise' | 'off' (ou 0/1/2)
    methodMap_["nrSetMode"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        int mode = 0;
        if (args[0].isString()) {
          auto m = args[0].asString(rt).utf8(rt);
          if (m == "expander") mode = 0; else if (m == "rnnoise") mode = 1; else if (m == "off") mode = 2;
        } else if (args[0].isNumber()) {
          mode = (int)args[0].asNumber();
          if (mode < 0) mode = 0; if (mode > 2) mode = 2;
        }
        {
          std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
          g_naaya_nr_mode = mode;
          // Activer/désactiver global selon mode 'off'
          g_naaya_nr_enabled = (mode != 2);
          g_naaya_nr_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["nrGetMode"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
        return jsi::Value((double)g_naaya_nr_mode);
    }};

    methodMap_["rnnsSetAggressiveness"] = MethodMetadata{1, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        double a = args[0].asNumber();
        if (a < 0.0) a = 0.0; if (a > 3.0) a = 3.0;
        {
          std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
          g_naaya_rnns_aggr = a;
          g_naaya_nr_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["rnnsGetAggressiveness"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
        return jsi::Value(g_naaya_rnns_aggr);
    }};

    methodMap_["nrSetConfig"] = MethodMetadata{7, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        bool hpEn      = args[0].getBool();
        double hpHz    = args[1].asNumber();
        double thDb    = args[2].asNumber();
        double ratio   = args[3].asNumber();
        double floorDb = args[4].asNumber();
        double attMs   = args[5].asNumber();
        double relMs   = args[6].asNumber();
        {
          std::lock_guard<std::mutex> lk(g_naaya_nr_mutex);
          g_naaya_nr_hp_enabled  = hpEn;
          g_naaya_nr_hp_hz       = hpHz;
          g_naaya_nr_threshold_db= thDb;
          g_naaya_nr_ratio       = ratio;
          g_naaya_nr_floor_db    = floorDb;
          g_naaya_nr_attack_ms   = attMs;
          g_naaya_nr_release_ms  = relMs;
          g_naaya_nr_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["nrGetConfig"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto obj = jsi::Object(rt);
        bool hpEn; double hpHz, thDb, ratio, floorDb, attMs, relMs;
        NaayaNR_GetConfig(&hpEn, &hpHz, &thDb, &ratio, &floorDb, &attMs, &relMs);
        obj.setProperty(rt, "highPassEnabled", jsi::Value(hpEn));
        obj.setProperty(rt, "highPassHz", jsi::Value(hpHz));
        obj.setProperty(rt, "thresholdDb", jsi::Value(thDb));
        obj.setProperty(rt, "ratio", jsi::Value(ratio));
        obj.setProperty(rt, "floorDb", jsi::Value(floorDb));
        obj.setProperty(rt, "attackMs", jsi::Value(attMs));
        obj.setProperty(rt, "releaseMs", jsi::Value(relMs));
        return obj;
    }};

    // ===== Safety controls exposed to JS =====
    methodMap_["safetySetConfig"] = MethodMetadata{9, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        bool enabled = args[0].getBool();
        bool dcEn    = args[1].getBool();
        double dcTh  = args[2].asNumber();
        bool limEn   = args[3].getBool();
        double limDb = args[4].asNumber();
        bool softK   = args[5].getBool();
        double knee  = args[6].asNumber();
        bool fbEn    = args[7].getBool();
        double fbTh  = args[8].asNumber();
        std::lock_guard<std::mutex> lk(g_naaya_safety_mutex);
        g_naaya_safety_enabled = enabled;
        g_naaya_safety_dc_enabled = dcEn;
        g_naaya_safety_dc_threshold = dcTh;
        g_naaya_safety_limiter_enabled = limEn;
        g_naaya_safety_limiter_threshold_db = limDb;
        g_naaya_safety_softknee = softK;
        g_naaya_safety_knee_db = knee;
        g_naaya_safety_feedback_enabled = fbEn;
        g_naaya_safety_feedback_thresh = fbTh;
        g_naaya_safety_dirty.store(true);
        return jsi::Value::undefined();
    }};

    methodMap_["safetyGetReport"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_safety_mutex);
        auto obj = jsi::Object(rt);
        obj.setProperty(rt, "peak", jsi::Value(g_naaya_safety_last_peak));
        obj.setProperty(rt, "rms", jsi::Value(g_naaya_safety_last_rms));
        obj.setProperty(rt, "dcOffset", jsi::Value(g_naaya_safety_last_dc));
        obj.setProperty(rt, "clippedSamples", jsi::Value(static_cast<double>(g_naaya_safety_last_clipped)));
        obj.setProperty(rt, "feedbackScore", jsi::Value(g_naaya_safety_last_feedback));
        obj.setProperty(rt, "overload", jsi::Value(g_naaya_safety_last_overload));
        return obj;
    }};

    // ===== FX controls exposed to JS =====
    methodMap_["fxSetEnabled"] = MethodMetadata{1, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        bool en = args[0].getBool();
        std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
        g_naaya_fx_enabled = en;
        g_naaya_fx_dirty.store(true);
        return jsi::Value::undefined();
    }};

    methodMap_["fxGetEnabled"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
        return jsi::Value(g_naaya_fx_enabled);
    }};

    methodMap_["fxSetCompressor"] = MethodMetadata{5, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        double th = args[0].asNumber();
        double ra = args[1].asNumber();
        double at = args[2].asNumber();
        double rl = args[3].asNumber();
        double mk = args[4].asNumber();
        std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
        g_naaya_fx_comp_threshold_db = th;
        g_naaya_fx_comp_ratio = ra;
        g_naaya_fx_comp_attack_ms = at;
        g_naaya_fx_comp_release_ms = rl;
        g_naaya_fx_comp_makeup_db = mk;
        g_naaya_fx_dirty.store(true);
        return jsi::Value::undefined();
    }};

    methodMap_["fxSetDelay"] = MethodMetadata{3, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        double dm = args[0].asNumber();
        double fb = args[1].asNumber();
        double mx = args[2].asNumber();
        std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
        g_naaya_fx_delay_ms = dm;
        g_naaya_fx_delay_feedback = fb;
        g_naaya_fx_delay_mix = mx;
        g_naaya_fx_dirty.store(true);
        return jsi::Value::undefined();
    }};

    // ===== Creative Effects (FX) controls exposed to JS =====
    methodMap_["fxSetEnabled"] = MethodMetadata{1, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        bool en = args[0].getBool();
        {
          std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
          g_naaya_fx_enabled = en;
          g_naaya_fx_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["fxGetEnabled"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
        return jsi::Value(g_naaya_fx_enabled);
    }};

    methodMap_["fxSetCompressor"] = MethodMetadata{5, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        double th = args[0].asNumber();
        double ra = args[1].asNumber();
        double at = args[2].asNumber();
        double rl = args[3].asNumber();
        double mk = args[4].asNumber();
        {
          std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
          g_naaya_fx_comp_threshold_db = th;
          g_naaya_fx_comp_ratio        = ra;
          g_naaya_fx_comp_attack_ms    = at;
          g_naaya_fx_comp_release_ms   = rl;
          g_naaya_fx_comp_makeup_db    = mk;
          g_naaya_fx_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};

    methodMap_["fxSetDelay"] = MethodMetadata{3, [](jsi::Runtime& /*rt*/, TurboModule& /*turboModule*/, const jsi::Value* args, size_t /*count*/) -> jsi::Value {
        double dm = args[0].asNumber();
        double fb = args[1].asNumber();
        double mx = args[2].asNumber();
        {
          std::lock_guard<std::mutex> lk(g_naaya_fx_mutex);
          g_naaya_fx_delay_ms       = dm;
          g_naaya_fx_delay_feedback = fb;
          g_naaya_fx_delay_mix      = mx;
          g_naaya_fx_dirty.store(true);
        }
        return jsi::Value::undefined();
    }};
}

// === Safety C API to update metrics from platform recorders ===
extern "C" void NaayaSafety_UpdateReport(double peak,
                                          double rms,
                                          double dcOffset,
                                          uint32_t clippedSamples,
                                          double feedbackScore,
                                          bool overload) {
  std::lock_guard<std::mutex> lk(g_naaya_safety_mutex);
  g_naaya_safety_last_peak = peak;
  g_naaya_safety_last_rms = rms;
  g_naaya_safety_last_dc = dcOffset;
  g_naaya_safety_last_clipped = clippedSamples;
  g_naaya_safety_last_feedback = feedbackScore;
  g_naaya_safety_last_overload = overload;
}

void NativeAudioEqualizerModule::ensureDefaultEqualizer(jsi::Runtime& rt) {
    if (defaultEqualizerId_ == 0) {
        // 10 bandes, 48000Hz (par défaut)
        auto idVal = createEqualizer(rt, 10, 48000);
        defaultEqualizerId_ = static_cast<int32_t>(idVal.asNumber());
        // Par défaut désactivé (bypass activé)
        setBypass(rt, defaultEqualizerId_, true);
        bypassed_ = true;
    }
}

// Equalizer management
jsi::Value NativeAudioEqualizerModule::createEqualizer(jsi::Runtime& rt, double numBands, double sampleRate) {
    std::lock_guard<std::mutex> lock(m_equalizersMutex);
    
    int32_t equalizerId = m_nextEqualizerId++;
    auto equalizer = std::make_unique<AudioEqualizer::AudioEqualizer>(
        static_cast<size_t>(numBands), static_cast<uint32_t>(sampleRate));
    
    auto& instance = m_equalizers[equalizerId];
    instance.equalizer = std::move(equalizer);
    instance.refCount = 1;
    
    return jsi::Value(equalizerId);
}

void NativeAudioEqualizerModule::destroyEqualizer(jsi::Runtime& rt, double equalizerId) {
    std::lock_guard<std::mutex> lock(m_equalizersMutex);
    m_equalizers.erase(static_cast<int32_t>(equalizerId));
}

// Audio processing
jsi::Value NativeAudioEqualizerModule::processAudio(jsi::Runtime& rt, double equalizerId, jsi::Object inputBuffer) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    auto input = jsArrayToFloatVector(rt, inputBuffer);
    std::vector<float> output(input.size());
    
    eq->process(input.data(), output.data(), input.size());
    
    return floatVectorToJsArray(rt, output);
}

jsi::Value NativeAudioEqualizerModule::processAudioStereo(jsi::Runtime& rt, double equalizerId,
                                                         jsi::Object inputBufferL, jsi::Object inputBufferR) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    auto inputL = jsArrayToFloatVector(rt, inputBufferL);
    auto inputR = jsArrayToFloatVector(rt, inputBufferR);
    
    if (inputL.size() != inputR.size()) {
        throw jsi::JSError(rt, "Input buffers must have the same size");
    }
    
    std::vector<float> outputL(inputL.size());
    std::vector<float> outputR(inputR.size());
    
    eq->processStereo(inputL.data(), inputR.data(), outputL.data(), outputR.data(), inputL.size());
    
    auto result = jsi::Object(rt);
    result.setProperty(rt, "left", floatVectorToJsArray(rt, outputL));
    result.setProperty(rt, "right", floatVectorToJsArray(rt, outputR));
    
    return result;
}

// Band control
void NativeAudioEqualizerModule::setBandGain(jsi::Runtime& rt, double equalizerId, double bandIndex, double gainDB) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBandGain(static_cast<size_t>(bandIndex), gainDB);
}

void NativeAudioEqualizerModule::setBandFrequency(jsi::Runtime& rt, double equalizerId, double bandIndex, double frequency) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBandFrequency(static_cast<size_t>(bandIndex), frequency);
}

void NativeAudioEqualizerModule::setBandQ(jsi::Runtime& rt, double equalizerId, double bandIndex, double q) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBandQ(static_cast<size_t>(bandIndex), q);
}

void NativeAudioEqualizerModule::setBandType(jsi::Runtime& rt, double equalizerId, double bandIndex, double type) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBandType(static_cast<size_t>(bandIndex), jsNumberToFilterType(type));
}

void NativeAudioEqualizerModule::setBandEnabled(jsi::Runtime& rt, double equalizerId, double bandIndex, bool enabled) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBandEnabled(static_cast<size_t>(bandIndex), enabled);
}

// Get band parameters
double NativeAudioEqualizerModule::getBandGain(jsi::Runtime& rt, double equalizerId, double bandIndex) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->getBandGain(static_cast<size_t>(bandIndex));
}

double NativeAudioEqualizerModule::getBandFrequency(jsi::Runtime& rt, double equalizerId, double bandIndex) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->getBandFrequency(static_cast<size_t>(bandIndex));
}

double NativeAudioEqualizerModule::getBandQ(jsi::Runtime& rt, double equalizerId, double bandIndex) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->getBandQ(static_cast<size_t>(bandIndex));
}

double NativeAudioEqualizerModule::getBandType(jsi::Runtime& rt, double equalizerId, double bandIndex) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return filterTypeToJsNumber(eq->getBandType(static_cast<size_t>(bandIndex)));
}

bool NativeAudioEqualizerModule::isBandEnabled(jsi::Runtime& rt, double equalizerId, double bandIndex) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->isBandEnabled(static_cast<size_t>(bandIndex));
}

// Global controls
void NativeAudioEqualizerModule::setMasterGain(jsi::Runtime& rt, double equalizerId, double gainDB) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setMasterGain(gainDB);
}

double NativeAudioEqualizerModule::getMasterGain(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->getMasterGain();
}

void NativeAudioEqualizerModule::setBypass(jsi::Runtime& rt, double equalizerId, bool bypass) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setBypass(bypass);
}

bool NativeAudioEqualizerModule::isBypassed(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return eq->isBypassed();
}

// Preset management
void NativeAudioEqualizerModule::loadPreset(jsi::Runtime& rt, double equalizerId, jsi::Object preset) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    AudioEqualizer::EQPreset eqPreset;
    
    if (preset.hasProperty(rt, "name")) {
        eqPreset.name = preset.getProperty(rt, "name").asString(rt).utf8(rt);
    }
    
    if (preset.hasProperty(rt, "gains")) {
        auto gainsArray = preset.getProperty(rt, "gains").asObject(rt).asArray(rt);
        size_t length = gainsArray.length(rt);
        
        for (size_t i = 0; i < length; ++i) {
            eqPreset.gains.push_back(gainsArray.getValueAtIndex(rt, i).asNumber());
        }
    }
    
    eq->loadPreset(eqPreset);
}

jsi::Object NativeAudioEqualizerModule::savePreset(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    AudioEqualizer::EQPreset preset;
    eq->savePreset(preset);
    
    auto result = jsi::Object(rt);
    result.setProperty(rt, "name", jsi::String::createFromUtf8(rt, preset.name));
    
    auto gains = jsi::Array(rt, preset.gains.size());
    for (size_t i = 0; i < preset.gains.size(); ++i) {
        gains.setValueAtIndex(rt, i, jsi::Value(preset.gains[i]));
    }
    result.setProperty(rt, "gains", gains);
    
    return result;
}

void NativeAudioEqualizerModule::resetAllBands(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->resetAllBands();
}

jsi::Array NativeAudioEqualizerModule::getAvailablePresets(jsi::Runtime& rt) {
    std::vector<std::string> presetNames = {
        "Flat", "Rock", "Pop", "Jazz", "Classical", 
        "Electronic", "Vocal Boost", "Bass Boost", 
        "Treble Boost", "Loudness"
    };
    
    auto result = jsi::Array(rt, presetNames.size());
    for (size_t i = 0; i < presetNames.size(); ++i) {
        result.setValueAtIndex(rt, i, jsi::String::createFromUtf8(rt, presetNames[i]));
    }
    
    return result;
}

void NativeAudioEqualizerModule::loadPresetByName(jsi::Runtime& rt, double equalizerId, jsi::String presetName) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    std::string name = presetName.utf8(rt);
    AudioEqualizer::EQPreset preset;
    
    if (name == "Flat") {
        preset = AudioEqualizer::EQPresetFactory::createFlatPreset();
    } else if (name == "Rock") {
        preset = AudioEqualizer::EQPresetFactory::createRockPreset();
    } else if (name == "Pop") {
        preset = AudioEqualizer::EQPresetFactory::createPopPreset();
    } else if (name == "Jazz") {
        preset = AudioEqualizer::EQPresetFactory::createJazzPreset();
    } else if (name == "Classical") {
        preset = AudioEqualizer::EQPresetFactory::createClassicalPreset();
    } else if (name == "Electronic") {
        preset = AudioEqualizer::EQPresetFactory::createElectronicPreset();
    } else if (name == "Vocal Boost") {
        preset = AudioEqualizer::EQPresetFactory::createVocalBoostPreset();
    } else if (name == "Bass Boost") {
        preset = AudioEqualizer::EQPresetFactory::createBassBoostPreset();
    } else if (name == "Treble Boost") {
        preset = AudioEqualizer::EQPresetFactory::createTrebleBoostPreset();
    } else if (name == "Loudness") {
        preset = AudioEqualizer::EQPresetFactory::createLoudnessPreset();
    } else {
        throw jsi::JSError(rt, "Unknown preset name: " + name);
    }
    
    eq->loadPreset(preset);
}

// Utility
double NativeAudioEqualizerModule::getNumBands(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return static_cast<double>(eq->getNumBands());
}

void NativeAudioEqualizerModule::setSampleRate(jsi::Runtime& rt, double equalizerId, double sampleRate) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->setSampleRate(static_cast<uint32_t>(sampleRate));
}

double NativeAudioEqualizerModule::getSampleRate(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    return static_cast<double>(eq->getSampleRate());
}

void NativeAudioEqualizerModule::beginParameterUpdate(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->beginParameterUpdate();
}

void NativeAudioEqualizerModule::endParameterUpdate(jsi::Runtime& rt, double equalizerId) {
    auto* eq = getEqualizer(static_cast<int32_t>(equalizerId));
    if (!eq) {
        throw jsi::JSError(rt, "Invalid equalizer ID");
    }
    
    eq->endParameterUpdate();
}

// Helper methods
AudioEqualizer::AudioEqualizer* NativeAudioEqualizerModule::getEqualizer(int32_t equalizerId) {
    std::lock_guard<std::mutex> lock(m_equalizersMutex);
    
    auto it = m_equalizers.find(equalizerId);
    if (it != m_equalizers.end()) {
        return it->second.equalizer.get();
    }
    
    return nullptr;
}

AudioEqualizer::FilterType NativeAudioEqualizerModule::jsNumberToFilterType(double type) {
    int typeInt = static_cast<int>(type);
    switch (typeInt) {
        case 0: return AudioEqualizer::FilterType::LOWPASS;
        case 1: return AudioEqualizer::FilterType::HIGHPASS;
        case 2: return AudioEqualizer::FilterType::BANDPASS;
        case 3: return AudioEqualizer::FilterType::NOTCH;
        case 4: return AudioEqualizer::FilterType::PEAK;
        case 5: return AudioEqualizer::FilterType::LOWSHELF;
        case 6: return AudioEqualizer::FilterType::HIGHSHELF;
        case 7: return AudioEqualizer::FilterType::ALLPASS;
        default: return AudioEqualizer::FilterType::PEAK;
    }
}

double NativeAudioEqualizerModule::filterTypeToJsNumber(AudioEqualizer::FilterType type) {
    switch (type) {
        case AudioEqualizer::FilterType::LOWPASS: return 0.0;
        case AudioEqualizer::FilterType::HIGHPASS: return 1.0;
        case AudioEqualizer::FilterType::BANDPASS: return 2.0;
        case AudioEqualizer::FilterType::NOTCH: return 3.0;
        case AudioEqualizer::FilterType::PEAK: return 4.0;
        case AudioEqualizer::FilterType::LOWSHELF: return 5.0;
        case AudioEqualizer::FilterType::HIGHSHELF: return 6.0;
        case AudioEqualizer::FilterType::ALLPASS: return 7.0;
        default: return 4.0;
    }
}

std::vector<float> NativeAudioEqualizerModule::jsArrayToFloatVector(jsi::Runtime& rt, const jsi::Object& array) {
    if (!array.isArray(rt)) {
        throw jsi::JSError(rt, "Expected array");
    }
    
    auto jsArray = array.asArray(rt);
    size_t length = jsArray.length(rt);
    std::vector<float> result;
    result.reserve(length);
    
    for (size_t i = 0; i < length; ++i) {
        result.push_back(static_cast<float>(jsArray.getValueAtIndex(rt, i).asNumber()));
    }
    
    return result;
}

jsi::Object NativeAudioEqualizerModule::floatVectorToJsArray(jsi::Runtime& rt, const std::vector<float>& vector) {
    auto array = jsi::Array(rt, vector.size());
    
    for (size_t i = 0; i < vector.size(); ++i) {
        array.setValueAtIndex(rt, i, jsi::Value(static_cast<double>(vector[i])));
    }
    
    return array;
}

} // namespace react
} // namespace facebook
#endif // NAAYA_AUDIO_EQ_ENABLED