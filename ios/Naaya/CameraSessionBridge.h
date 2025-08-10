#pragma once

#ifdef __OBJC__
#import <AVFoundation/AVFoundation.h>

// Lorsque ce header est inclus depuis des TU Objective-C++ (.mm),
// il faut imposer un linkage C pour être compatible avec les appels C++.
#ifdef __cplusplus
extern "C" {
#endif

AVCaptureSession* NaayaGetSharedSession(void);
AVCaptureDeviceInput* NaayaGetCurrentInput(void);
void NaayaSetSharedSession(AVCaptureSession* session, AVCaptureDeviceInput* input);

// Outputs & audio input shared
AVCapturePhotoOutput* NaayaGetPhotoOutput(void);
void NaayaSetPhotoOutput(AVCapturePhotoOutput* output);
AVCaptureMovieFileOutput* NaayaGetMovieOutput(void);
void NaayaSetMovieOutput(AVCaptureMovieFileOutput* output);
AVCaptureDeviceInput* NaayaGetAudioInput(void);
void NaayaSetAudioInput(AVCaptureDeviceInput* input);

// État global simple du mode flash (0=off,1=on,2=auto,3=torch)
int NaayaGetFlashMode(void);
void NaayaSetFlashMode(int mode);

#ifdef __cplusplus
}
#endif

#else
// Forward declarations for non-ObjC translation units
struct AVCaptureSession;
struct AVCaptureDeviceInput;
struct AVCapturePhotoOutput;
struct AVCaptureMovieFileOutput;

#ifdef __cplusplus
extern "C" {
#endif
struct AVCaptureSession* NaayaGetSharedSession(void);
struct AVCaptureDeviceInput* NaayaGetCurrentInput(void);
void NaayaSetSharedSession(struct AVCaptureSession* session, struct AVCaptureDeviceInput* input);
struct AVCapturePhotoOutput* NaayaGetPhotoOutput(void);
void NaayaSetPhotoOutput(struct AVCapturePhotoOutput* output);
struct AVCaptureMovieFileOutput* NaayaGetMovieOutput(void);
void NaayaSetMovieOutput(struct AVCaptureMovieFileOutput* output);
struct AVCaptureDeviceInput* NaayaGetAudioInput(void);
void NaayaSetAudioInput(struct AVCaptureDeviceInput* input);

// État global simple du mode flash (0=off,1=on,2=auto,3=torch)
int NaayaGetFlashMode(void);
void NaayaSetFlashMode(int mode);
#ifdef __cplusplus
}
#endif
#endif


