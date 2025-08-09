#ifdef __ANDROID__
#include <jni.h>
#include <fbjni/fbjni.h>
#include <string>
#include <memory>
#include "../../../../../shared/Camera/capture/VideoCapture.hpp"

namespace Camera {

static std::string JStringToStd(JNIEnv* env, jstring js) {
  if (!js) return std::string();
  const char* chars = env->GetStringUTFChars(js, nullptr);
  std::string out = chars ? std::string(chars) : std::string();
  if (chars) env->ReleaseStringUTFChars(js, chars);
  return out;
}

class AndroidVideoCapture : public VideoCapture {
 public:
  AndroidVideoCapture() = default;
  ~AndroidVideoCapture() override = default;

 protected:
  bool initializePlatform() override { return true; }
  void shutdownPlatform() override {}

  bool startRecordingPlatform(const VideoCaptureOptions& options) override {
    JNIEnv* env = facebook::jni::Environment::current();
    jclass cls = env->FindClass("com/naaya/camera/LegacyVideoRecorder");
    if (!cls) return false;
    jmethodID mGetInstance = env->GetStaticMethodID(cls, "getInstance", "()Lcom/naaya/camera/LegacyVideoRecorder;");
    jobject inst = env->CallStaticObjectMethod(cls, mGetInstance);
    if (!inst) return false;

    jclass optsCls = env->FindClass("com/naaya/camera/LegacyVideoRecorder$StartOptions");
    if (!optsCls) return false;
    jmethodID ctor = env->GetMethodID(optsCls, "<init>", "()V");
    jobject startOpts = env->NewObject(optsCls, ctor);
    if (!startOpts) return false;

    // Set fields
    jfieldID fCodec = env->GetFieldID(optsCls, "codec", "Ljava/lang/String;");
    jfieldID fVb = env->GetFieldID(optsCls, "videoBitrate", "I");
    jfieldID fRecA = env->GetFieldID(optsCls, "recordAudio", "Z");
    jfieldID fAb = env->GetFieldID(optsCls, "audioBitrate", "I");
    jfieldID fMaxDur = env->GetFieldID(optsCls, "maxDurationSec", "I");
    jfieldID fMaxSize = env->GetFieldID(optsCls, "maxFileSize", "J");
    jfieldID fWidth = env->GetFieldID(optsCls, "width", "I");
    jfieldID fHeight = env->GetFieldID(optsCls, "height", "I");
    jfieldID fFps = env->GetFieldID(optsCls, "fps", "I");
    jfieldID fDev = env->GetFieldID(optsCls, "deviceId", "Ljava/lang/String;");
    // Advanced fields
    jfieldID fSaveDir = env->GetFieldID(optsCls, "saveDirectory", "Ljava/lang/String;");
    jfieldID fFilePrefix = env->GetFieldID(optsCls, "fileNamePrefix", "Ljava/lang/String;");
    jfieldID fOrientation = env->GetFieldID(optsCls, "orientation", "Ljava/lang/String;");
    jfieldID fStab = env->GetFieldID(optsCls, "stabilization", "Ljava/lang/String;");
    jfieldID fLockAE = env->GetFieldID(optsCls, "lockAE", "Z");
    jfieldID fLockAWB = env->GetFieldID(optsCls, "lockAWB", "Z");
    jfieldID fLockAF = env->GetFieldID(optsCls, "lockAF", "Z");

    jstring jCodec = env->NewStringUTF(options.codec.c_str());
    env->SetObjectField(startOpts, fCodec, jCodec);
    env->SetIntField(startOpts, fVb, (jint)options.videoBitrate);
    env->SetBooleanField(startOpts, fRecA, (jboolean)options.recordAudio);
    env->SetIntField(startOpts, fAb, (jint)options.audioBitrate);
    env->SetIntField(startOpts, fMaxDur, (jint)options.maxDuration);
    env->SetLongField(startOpts, fMaxSize, (jlong)options.maxFileSize);
    env->SetIntField(startOpts, fWidth, (jint)options.width);
    env->SetIntField(startOpts, fHeight, (jint)options.height);
    env->SetIntField(startOpts, fFps, (jint)options.fps);
    jstring jDev = env->NewStringUTF(options.deviceId.c_str());
    env->SetObjectField(startOpts, fDev, jDev);
    // Advanced values
    jstring jSave = env->NewStringUTF(options.saveDirectory.c_str());
    env->SetObjectField(startOpts, fSaveDir, jSave);
    jstring jPrefix = env->NewStringUTF(options.fileNamePrefix.c_str());
    env->SetObjectField(startOpts, fFilePrefix, jPrefix);
    jstring jOrient = env->NewStringUTF(options.orientation.c_str());
    env->SetObjectField(startOpts, fOrientation, jOrient);
    jstring jStab = env->NewStringUTF(options.stabilization.c_str());
    env->SetObjectField(startOpts, fStab, jStab);
    env->SetBooleanField(startOpts, fLockAE, (jboolean)options.lockAE);
    env->SetBooleanField(startOpts, fLockAWB, (jboolean)options.lockAWB);
    env->SetBooleanField(startOpts, fLockAF, (jboolean)options.lockAF);
    // TODO: étendre StartOptions Java pour dossier/filename/orientation si besoin
    env->DeleteLocalRef(jDev);
    env->DeleteLocalRef(jCodec);
    env->DeleteLocalRef(jSave);
    env->DeleteLocalRef(jPrefix);
    env->DeleteLocalRef(jOrient);
    env->DeleteLocalRef(jStab);

    jmethodID mStart = env->GetMethodID(cls, "start", "(Lcom/naaya/camera/LegacyVideoRecorder$StartOptions;)Z");
    jboolean ok = env->CallBooleanMethod(inst, mStart, startOpts);
    env->DeleteLocalRef(startOpts);
    env->DeleteLocalRef(optsCls);
    env->DeleteLocalRef(inst);
    env->DeleteLocalRef(cls);
    return ok == JNI_TRUE;
  }

  VideoResult stopRecordingPlatform() override {
    VideoResult vr;
    JNIEnv* env = facebook::jni::Environment::current();
    jclass cls = env->FindClass("com/naaya/camera/LegacyVideoRecorder");
    if (!cls) return vr;
    jmethodID mGetInstance = env->GetStaticMethodID(cls, "getInstance", "()Lcom/naaya/camera/LegacyVideoRecorder;");
    jobject inst = env->CallStaticObjectMethod(cls, mGetInstance);
    if (!inst) { env->DeleteLocalRef(cls); return vr; }

    jmethodID mStop = env->GetMethodID(cls, "stop", "()Lcom/naaya/camera/LegacyVideoRecorder$StopResult;");
    jobject res = env->CallObjectMethod(inst, mStop);
    if (!res) { env->DeleteLocalRef(inst); env->DeleteLocalRef(cls); return vr; }

    jclass stopCls = env->FindClass("com/naaya/camera/LegacyVideoRecorder$StopResult");
    jfieldID fUri = env->GetFieldID(stopCls, "uri", "Ljava/lang/String;");
    jfieldID fDur = env->GetFieldID(stopCls, "duration", "D");
    jfieldID fSize = env->GetFieldID(stopCls, "size", "J");
    jfieldID fW = env->GetFieldID(stopCls, "width", "I");
    jfieldID fH = env->GetFieldID(stopCls, "height", "I");
    jfieldID fFps = env->GetFieldID(stopCls, "fps", "I");
    jfieldID fCodec = env->GetFieldID(stopCls, "codec", "Ljava/lang/String;");

    jstring jUri = (jstring)env->GetObjectField(res, fUri);
    vr.uri = JStringToStd(env, jUri);
    vr.duration = env->GetDoubleField(res, fDur);
    vr.fileSize = (size_t)env->GetLongField(res, fSize);
    vr.width = env->GetIntField(res, fW);
    vr.height = env->GetIntField(res, fH);
    vr.fps = env->GetIntField(res, fFps);
    jstring jCodec = (jstring)env->GetObjectField(res, fCodec);
    vr.codec = JStringToStd(env, jCodec);

    if (jUri) env->DeleteLocalRef(jUri);
    if (jCodec) env->DeleteLocalRef(jCodec);
    env->DeleteLocalRef(stopCls);
    env->DeleteLocalRef(res);
    env->DeleteLocalRef(inst);
    env->DeleteLocalRef(cls);
    return vr;
  }

  bool pauseRecordingPlatform() override { return false; }
  bool resumeRecordingPlatform() override { return false; }
  bool cancelRecordingPlatform() override { return false; }
  double getCurrentDurationPlatform() const override { return 0.0; }
  size_t getCurrentFileSizePlatform() const override { return 0; }
};

} // namespace Camera

namespace Camera {
std::unique_ptr<VideoCapture> createAndroidVideoCapture() {
  return std::make_unique<AndroidVideoCapture>();
}
}
#else
#include "../../../../../shared/Camera/capture/VideoCapture.hpp"
#include <memory>
namespace Camera { std::unique_ptr<VideoCapture> createAndroidVideoCapture() { return nullptr; } }
#endif


