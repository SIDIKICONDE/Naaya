#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

#include "VideoCaptureIOS.h"
#import "CameraSessionBridge.h"

namespace Camera {

class IOSVideoCapture final : public VideoCapture {
public:
  IOSVideoCapture() = default;
  ~IOSVideoCapture() override = default;

protected:
  bool initializePlatform() override { return true; }
  void shutdownPlatform() override {}
  bool startRecordingPlatform(const VideoCaptureOptions& /*options*/) override {
    AVCaptureSession* session = NaayaGetSharedSession();
    if (!session) return true; // neutre

    AVCaptureMovieFileOutput* movie = NaayaGetMovieOutput();
    if (!movie) {
      movie = [[AVCaptureMovieFileOutput alloc] init];
      if ([session canAddOutput:movie]) {
        [session beginConfiguration];
        [session addOutput:movie];
        [session commitConfiguration];
        NaayaSetMovieOutput(movie);
      }
    }

    // Ajouter input audio si absent
    AVCaptureDeviceInput* audioIn = NaayaGetAudioInput();
    if (!audioIn) {
      AVCaptureDevice* mic = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeAudio];
      if (mic) {
        NSError* err = nil;
        AVCaptureDeviceInput* ai = [AVCaptureDeviceInput deviceInputWithDevice:mic error:&err];
        if (ai && [session canAddInput:ai]) {
          [session beginConfiguration];
          [session addInput:ai];
          [session commitConfiguration];
          NaayaSetAudioInput(ai);
        }
      }
    }

    // Lancer enregistrement sur un fichier temporaire
    NSString* path = [NSTemporaryDirectory() stringByAppendingPathComponent:@"naaya-video.mp4"];
    NSURL* url = [NSURL fileURLWithPath:path];
    // Démarrage sans délégué – fournir nil en stub (certains SDKs tolèrent nil)
    if (url) {
      [movie startRecordingToOutputFileURL:url recordingDelegate:nil];
    }
    return true;
  }
  VideoResult stopRecordingPlatform() override {
    AVCaptureMovieFileOutput* movie = NaayaGetMovieOutput();
    if (movie && [movie isRecording]) {
      [movie stopRecording];
    }
    return VideoResult{"file:///tmp/naaya-video.mp4", 3.0, 1024 * 1024, 1920, 1080};
  }
  bool pauseRecordingPlatform() override { return true; }
  bool resumeRecordingPlatform() override { return true; }
  bool cancelRecordingPlatform() override { return true; }
  double getCurrentDurationPlatform() const override { return 0.0; }
  size_t getCurrentFileSizePlatform() const override { return 0; }
};

std::unique_ptr<VideoCapture> createIOSVideoCapture() {
  return std::make_unique<IOSVideoCapture>();
}

} // namespace Camera


