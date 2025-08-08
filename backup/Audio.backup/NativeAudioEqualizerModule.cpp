#include "NativeAudioEqualizerModule.h"
#include <cmath>
#include <string>
#if __APPLE__
extern "C" {
void NaayaAudioSpectrumStart(void);
void NaayaAudioSpectrumStop(void);
size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount);
}
#elif defined(__ANDROID__)
#include <fbjni/fbjni.h>
#include <algorithm>

namespace {
JNIEnv* getEnv() {
    return facebook::jni::Environment::current();
}

void androidStartSpectrum() {
    JNIEnv* env = getEnv();
    if (!env) return;
    jclass cls = env->FindClass("com/naaya/audio/AudioSpectrumManager");
    if (!cls) return;
    jmethodID mid = env->GetStaticMethodID(cls, "start", "()V");
    if (mid) {
        env->CallStaticVoidMethod(cls, mid);
    }
    env->DeleteLocalRef(cls);
}

void androidStopSpectrum() {
    JNIEnv* env = getEnv();
    if (!env) return;
    jclass cls = env->FindClass("com/naaya/audio/AudioSpectrumManager");
    if (!cls) return;
    jmethodID mid = env->GetStaticMethodID(cls, "stop", "()V");
    if (mid) {
        env->CallStaticVoidMethod(cls, mid);
    }
    env->DeleteLocalRef(cls);
}
} // namespace

static int androidCopyMagnitudes(float* out, size_t maxCount) {
    JNIEnv* env = getEnv();
    if (!env) return 0;
    jclass cls = env->FindClass("com/naaya/audio/AudioSpectrumManager");
    if (!cls) return 0;
    jmethodID mid = env->GetStaticMethodID(cls, "copyMagnitudes", "([FI)I");
    if (!mid) { env->DeleteLocalRef(cls); return 0; }
    jfloatArray arr = env->NewFloatArray(static_cast<jsize>(maxCount));
    if (!arr) { env->DeleteLocalRef(cls); return 0; }
    jint n = env->CallStaticIntMethod(cls, mid, arr, static_cast<jint>(maxCount));
    jsize toCopy = std::min(static_cast<jsize>(maxCount), env->GetArrayLength(arr));
    env->GetFloatArrayRegion(arr, 0, toCopy, out);
    env->DeleteLocalRef(arr);
    env->DeleteLocalRef(cls);
    return static_cast<int>(n);
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
    
    // Global controls
    methodMap_["setMasterGain"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.setMasterGain(rt, args[0].asNumber(), args[1].asNumber());
        return jsi::Value::undefined();
    }};
    
    methodMap_["getMasterGain"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(self.getMasterGain(rt, args[0].asNumber()));
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

    // ==== WRAPPERS SIMPLES POUR L'API JS EXISTANTE ====
    methodMap_["setEQEnabled"] = MethodMetadata{1, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        bool enabled = args[0].getBool();
        self.setBypass(rt, self.defaultEqualizerId_, !enabled);
        self.bypassed_ = !enabled;
        return jsi::Value::undefined();
    }};

    methodMap_["getEQEnabled"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::Value(!self.bypassed_);
    }};

    methodMap_["setBandGain"] = MethodMetadata{2, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* args, size_t count) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.ensureDefaultEqualizer(rt);
        self.setBandGain(rt, self.defaultEqualizerId_, args[0].asNumber(), args[1].asNumber());
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
        return jsi::Value::undefined();
    }};

    methodMap_["getCurrentPreset"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        return jsi::String::createFromUtf8(rt, self.currentPresetName_);
    }};

    methodMap_["startSpectrumAnalysis"] = MethodMetadata{0, [](jsi::Runtime& /*rt*/, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.analysisRunning_ = true;
#if __APPLE__
        NaayaAudioSpectrumStart();
#endif
        return jsi::Value::undefined();
    }};

    methodMap_["stopSpectrumAnalysis"] = MethodMetadata{0, [](jsi::Runtime& /*rt*/, TurboModule& turboModule, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        auto& self = static_cast<NativeAudioEqualizerModule&>(turboModule);
        self.analysisRunning_ = false;
#if __APPLE__
        NaayaAudioSpectrumStop();
#endif
        return jsi::Value::undefined();
    }};

    methodMap_["getSpectrumData"] = MethodMetadata{0, [](jsi::Runtime& rt, TurboModule& /*turboModule*/, const jsi::Value* /*args*/, size_t /*count*/) -> jsi::Value {
        const size_t numBars = 32;
        jsi::Array result(rt, numBars);
#if __APPLE__
        float buffer[64];
        size_t n = NaayaAudioSpectrumCopyMagnitudes(buffer, 64);
        size_t count = std::min(numBars, n);
        for (size_t i = 0; i < count; ++i) {
            result.setValueAtIndex(rt, i, jsi::Value(static_cast<double>(buffer[i])));
        }
        for (size_t i = count; i < numBars; ++i) {
            result.setValueAtIndex(rt, i, jsi::Value(0));
        }
#elif defined(__ANDROID__)
        float buffer[64];
        size_t n = static_cast<size_t>(androidCopyMagnitudes(buffer, 64));
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
}

void NativeAudioEqualizerModule::ensureDefaultEqualizer(jsi::Runtime& rt) {
    if (defaultEqualizerId_ == 0) {
        // 10 bandes, 44100Hz
        auto idVal = createEqualizer(rt, 10, 44100);
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