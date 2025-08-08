#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

#import "CameraSessionBridge.h"

static AVCaptureSession* s_session = nil;
static AVCaptureDeviceInput* s_input = nil;
static AVCapturePhotoOutput* s_photo = nil;
static AVCaptureMovieFileOutput* s_movie = nil;
static AVCaptureDeviceInput* s_audio = nil;

AVCaptureSession* NaayaGetSharedSession(void) {
  return s_session;
}

AVCaptureDeviceInput* NaayaGetCurrentInput(void) {
  return s_input;
}

void NaayaSetSharedSession(AVCaptureSession* session, AVCaptureDeviceInput* input) {
  s_session = session;
  s_input = input;
}

AVCapturePhotoOutput* NaayaGetPhotoOutput(void) { return s_photo; }
void NaayaSetPhotoOutput(AVCapturePhotoOutput* output) { s_photo = output; }
AVCaptureMovieFileOutput* NaayaGetMovieOutput(void) { return s_movie; }
void NaayaSetMovieOutput(AVCaptureMovieFileOutput* output) { s_movie = output; }
AVCaptureDeviceInput* NaayaGetAudioInput(void) { return s_audio; }
void NaayaSetAudioInput(AVCaptureDeviceInput* input) { s_audio = input; }


