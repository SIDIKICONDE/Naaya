#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <CoreVideo/CoreVideo.h>
#import <AudioToolbox/AudioToolbox.h>
#import <TargetConditionals.h>
#import <Photos/Photos.h>

#include "VideoCaptureIOS.h"
#import "CameraSessionBridge.h"
#include <math.h>
#include <chrono>
#include "../../shared/Audio/core/AudioEqualizer.h"
#include <vector>
#import <Accelerate/Accelerate.h>
#include "../../shared/Audio/safety/AudioSafety.h"
#include "../../shared/Audio/noise/NoiseReducer.h"
#include "../../shared/Audio/noise/RNNoiseSuppressor.h"
#ifndef FFMPEG_AVAILABLE
#define FFMPEG_AVAILABLE 1
#endif
#include "../../shared/Audio/effects/EffectChain.h"
#include "../../shared/Audio/effects/Compressor.h"
#include "../../shared/Audio/effects/Delay.h"

// API C filtres exposée par le runtime C++
#ifdef __cplusplus
extern "C" {
#endif
bool NaayaFilters_HasFilter(void);
const char* NaayaFilters_GetCurrentName(void);
double NaayaFilters_GetCurrentIntensity(void);
// API de traitement FFmpeg (si disponible)
bool NaayaFilters_ProcessBGRA(const uint8_t* inData,
                              int inStride,
                              int width,
                              int height,
                              double fps,
                              uint8_t* outData,
                              int outStride);
// Paramètres avancés (exposés par le module C)
typedef struct {
  double brightness;
  double contrast;
  double saturation;
  double hue;
  double gamma;
  double warmth;
  double tint;
  double exposure;
  double shadows;
  double highlights;
  double vignette;
  double grain;
} NaayaAdvancedFilterParams;
bool NaayaFilters_GetAdvancedParams(NaayaAdvancedFilterParams* outParams);
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wstrict-prototypes"
bool NaayaEQ_IsEnabled(void);
double NaayaEQ_GetMasterGainDB(void);
size_t NaayaEQ_CopyBandGains(double* out, size_t maxCount);
size_t NaayaEQ_GetNumBands(void);
bool NaayaEQ_HasPendingUpdate(void);
void NaayaEQ_ClearPendingUpdate(void);
bool NaayaNR_IsEnabled(void);
bool NaayaNR_HasPendingUpdate(void);
void NaayaNR_ClearPendingUpdate(void);
void NaayaNR_GetConfig(bool* hpEnabled,
                       double* hpHz,
                       double* thresholdDb,
                       double* ratio,
                       double* floorDb,
                       double* attackMs,
                       double* releaseMs);
int NaayaNR_GetMode(void);
double NaayaRNNS_GetAggressiveness(void);
#if TARGET_OS_IOS
// API spectre (exigée par le module JSI)
void NaayaAudioSpectrumStart(void);
void NaayaAudioSpectrumStop(void);
size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount);
#endif
// FX C API (exposée par le TurboModule EQ)
bool NaayaFX_IsEnabled(void);
bool NaayaFX_HasPendingUpdate(void);
void NaayaFX_ClearPendingUpdate(void);
void NaayaFX_GetCompressor(double* thresholdDb,
                           double* ratio,
                           double* attackMs,
                           double* releaseMs,
                           double* makeupDb);
void NaayaFX_GetDelay(double* delayMs,
                      double* feedback,
                      double* mix);
// Safety report updater (globally exposed by TurboModule)
void NaayaSafety_UpdateReport(double peak,
                              double rms,
                              double dcOffset,
                              uint32_t clippedSamples,
                              double feedbackScore,
                              bool overload);
#pragma clang diagnostic pop
#ifdef __cplusplus
}
#endif

// === Implémentation iOS de l'API spectre attendue par le module JSI ===
// Variables spectre visibles dans ce TU
static BOOL sNaayaSpectrumRunning = NO;
static float sNaayaSpectrum[64] = {0};

extern "C" void NaayaAudioSpectrumStart(void) {
  sNaayaSpectrumRunning = YES;
}

extern "C" void NaayaAudioSpectrumStop(void) {
  sNaayaSpectrumRunning = NO;
}

extern "C" size_t NaayaAudioSpectrumCopyMagnitudes(float* outBuffer, size_t maxCount) {
  if (!outBuffer || maxCount == 0) return 0;
  size_t n = maxCount < 32 ? maxCount : 32;
  memcpy(outBuffer, sNaayaSpectrum, n * sizeof(float));
  return n;
}

@class NaayaFilteredVideoRecorder;

// Délégué Objective-C pour suivre la fin d'enregistrement
@interface NaayaMovieDelegate : NSObject <AVCaptureFileOutputRecordingDelegate>
@property(nonatomic, assign) dispatch_semaphore_t finishSem;
@property(nonatomic, strong) NSURL* outputURL;
@property(nonatomic, strong) NSError* error;
@property(nonatomic, assign) BOOL finished;
@end

@implementation NaayaMovieDelegate
- (void)captureOutput:(AVCaptureFileOutput *)captureOutput
didStartRecordingToOutputFileAtURL:(NSURL *)fileURL
         fromConnections:(NSArray<AVCaptureConnection *> *)connections {
  (void)captureOutput; (void)connections;
  self.finished = NO;
  self.outputURL = fileURL;
}

- (void)captureOutput:(AVCaptureFileOutput *)captureOutput
didFinishRecordingToOutputFileAtURL:(NSURL *)outputFileURL
        fromConnections:(NSArray<AVCaptureConnection *> *)connections
                      error:(NSError *)error {
  (void)captureOutput; (void)connections;
  self.finished = YES;
  self.outputURL = outputFileURL;
  self.error = error;
  if (self.finishSem) {
    dispatch_semaphore_signal(self.finishSem);
  }
}

- (void)fileOutput:(AVCaptureFileOutput *)output
didFinishRecordingToOutputFileAtURL:(NSURL *)outputFileURL
                    fromConnections:(NSArray<AVCaptureConnection *> *)connections
                              error:(NSError *)error {
  (void)output; (void)connections;
  self.finished = YES;
  self.outputURL = outputFileURL;
  self.error = error;
  if (self.finishSem) {
    dispatch_semaphore_signal(self.finishSem);
  }
}
@end

// Tap audio pour calcul du spectre lorsque MovieFileOutput est utilisé
@interface NaayaSpectrumTap : NSObject <AVCaptureAudioDataOutputSampleBufferDelegate>
@end

@implementation NaayaSpectrumTap
- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
  (void)output; (void)connection;
  if (!sNaayaSpectrumRunning) return;
  CMAudioFormatDescriptionRef fmt = (CMAudioFormatDescriptionRef)CMSampleBufferGetFormatDescription(sampleBuffer);
  const AudioStreamBasicDescription* asbd = fmt ? CMAudioFormatDescriptionGetStreamBasicDescription(fmt) : nullptr;
  if (!asbd) return;
  int channels = (int)asbd->mChannelsPerFrame;
  if (channels < 1) return;
  CMBlockBufferRef dataBuf = CMSampleBufferGetDataBuffer(sampleBuffer);
  if (!dataBuf) return;
  size_t totalLength = 0; size_t lenAtOffset = 0; char* dataPtr = nullptr;
  if (CMBlockBufferGetDataPointer(dataBuf, 0, &lenAtOffset, &totalLength, &dataPtr) != kCMBlockBufferNoErr || !dataPtr || totalLength == 0) return;
  size_t numFrames = (size_t)CMSampleBufferGetNumSamples(sampleBuffer);
  bool isPCM = (asbd->mFormatID == kAudioFormatLinearPCM);
  bool isInt16 = isPCM && asbd->mBitsPerChannel == 16;
  bool isPacked = (asbd->mFormatFlags & kAudioFormatFlagIsPacked) != 0;
  bool isSignedInt = (asbd->mFormatFlags & kAudioFormatFlagIsSignedInteger) != 0;
  if (!isInt16 || !isPacked || !isSignedInt || channels > 2) return;
  const size_t N = 1024;
  static FFTSetup setup = NULL;
  if (!setup) setup = vDSP_create_fftsetup(10, kFFTRadix2);
  static float realp[N]; static float imagp[N];
  static float monoBuf[N];
  size_t L = (numFrames < N ? numFrames : N);
  int16_t* in = reinterpret_cast<int16_t*>(dataPtr);
  if (channels == 1) {
    for (size_t i = 0; i < L; ++i) monoBuf[i] = (float)in[i] / 32768.0f;
  } else {
    for (size_t i = 0; i < L; ++i) monoBuf[i] = 0.5f * ((float)in[2*i] + (float)in[2*i+1]) / 32768.0f;
  }
  memcpy(realp, monoBuf, sizeof(float) * L);
  if (L < N) memset(realp + L, 0, sizeof(float) * (N - L));
  memset(imagp, 0, sizeof(float) * N);
  DSPSplitComplex split = { .realp = realp, .imagp = imagp };
  vDSP_fft_zip(setup, &split, 1, 10, FFT_FORWARD);
  static float mags[N/2];
  vDSP_zvabs(&split, 1, mags, 1, N/2);
  const int bars = 32; float outBars[bars];
  int per = (int)(N/2 / bars); if (per < 1) per = 1;
  for (int b = 0; b < bars; ++b) {
    int start = b * per; int end = start + per; if (end > (int)(N/2)) end = (int)(N/2);
    float sum = 0.f; int cnt = 0;
    for (int k = start; k < end; ++k) { sum += mags[k]; ++cnt; }
    outBars[b] = cnt > 0 ? (sum / cnt) : 0.f;
  }
  float maxv = 1.f; for (int b = 0; b < bars; ++b) if (outBars[b] > maxv) maxv = outBars[b];
  for (int b = 0; b < bars; ++b) {
    float norm = (float)(log1pf(outBars[b]) / log1pf(maxv));
    if (norm < 0.f) norm = 0.f; else if (norm > 1.f) norm = 1.f;
    sNaayaSpectrum[b] = norm;
  }
}
@end

// Enregistreur AVAssetWriter avec pipeline CoreImage (vidéo uniquement)
@interface NaayaFilteredVideoRecorder : NSObject <AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate> {
  std::unique_ptr<AudioEqualizer::AudioEqualizer> _eq;
  std::unique_ptr<AudioNR::NoiseReducer> _nr;
  std::unique_ptr<AudioNR::RNNoiseSuppressor> _rnns;
  std::unique_ptr<AudioSafety::AudioSafetyEngine> _safety;
  std::unique_ptr<AudioFX::EffectChain> _fx;
  // Tampons audio réutilisés (éviter allocations par frame)
  std::vector<float> _bufMono;
  std::vector<float> _tmpMono;
  std::vector<float> _outMono;
  std::vector<float> _left;
  std::vector<float> _right;
  std::vector<float> _tmpLeft;
  std::vector<float> _tmpRight;
  std::vector<float> _outLeft;
  std::vector<float> _outRight;
}
@property(nonatomic, assign) AVCaptureSession* session; // éviter weak sous MRC
@property(nonatomic, strong) NSURL* outputURL;
@property(nonatomic, strong) AVAssetWriter* writer;
@property(nonatomic, strong) AVAssetWriterInput* videoInput;
@property(nonatomic, strong) AVAssetWriterInputPixelBufferAdaptor* adaptor;
@property(nonatomic, strong) AVCaptureVideoDataOutput* videoOutput;
@property(nonatomic, strong) dispatch_queue_t videoQueue;
@property(nonatomic, strong) CIContext* ciContext;
@property(nonatomic, assign) BOOL configured;
@property(nonatomic, assign) BOOL recording;
@property(nonatomic, assign) CMTime startTime;
@property(nonatomic, assign) int targetFPS;
@property(nonatomic, strong) NSString* preferredCodec; // AVVideoCodecTypeH264/HEVC
@property(nonatomic, assign) int preferredBitrate;
@property(nonatomic, assign) CGSize targetSize;
// Audio (optionnel)
@property(nonatomic, strong) AVAssetWriterInput* audioInput;
@property(nonatomic, strong) AVCaptureAudioDataOutput* audioOutput;
@property(nonatomic, strong) dispatch_queue_t audioQueue;
@property(nonatomic, assign) BOOL enableAudio;
// Orientation/Stabilisation forcées par options
@property(nonatomic, assign) NSInteger forcedOrientation; // -1 = auto
@property(nonatomic, assign) NSInteger stabilizationMode; // -1 = auto
// EQ temps réel
@property(nonatomic, assign) double eqSampleRate;
@property(nonatomic, assign) int eqChannels;
@property(nonatomic, assign) BOOL eqConfigured;
@end

@implementation NaayaFilteredVideoRecorder

- (instancetype)init {
  if (self = [super init]) {
    _ciContext = [CIContext contextWithOptions:nil];
    _configured = NO;
    _recording = NO;
    _targetFPS = 30;
    _targetSize = CGSizeZero;
    _eqSampleRate = 48000.0;
    _eqChannels = 1;
    _eqConfigured = NO;
    _nr = nullptr;
    _fx = nullptr;
    _safety = nullptr;
    _forcedOrientation = -1;
    _stabilizationMode = -1;
  }
  return self;
}

static CGAffineTransform NaayaTransformForOrientation(AVCaptureVideoOrientation orientation, BOOL isFrontCamera) {
  // Basique: rotation pour obtenir une vidéo en portrait/landscape correcte
  switch (orientation) {
    case AVCaptureVideoOrientationPortrait:
      return isFrontCamera ? CGAffineTransformMakeRotation((CGFloat)-M_PI_2) : CGAffineTransformMakeRotation((CGFloat)M_PI_2);
    case AVCaptureVideoOrientationPortraitUpsideDown:
      return isFrontCamera ? CGAffineTransformMakeRotation((CGFloat)M_PI_2) : CGAffineTransformMakeRotation((CGFloat)-M_PI_2);
    case AVCaptureVideoOrientationLandscapeLeft:
      return isFrontCamera ? CGAffineTransformIdentity : CGAffineTransformMakeRotation((CGFloat)M_PI);
    case AVCaptureVideoOrientationLandscapeRight:
    default:
      return isFrontCamera ? CGAffineTransformMakeRotation((CGFloat)M_PI) : CGAffineTransformIdentity;
  }
}

- (BOOL)startWithSession:(AVCaptureSession*)session
                outputURL:(NSURL*)url
                    codec:(NSString*)codec
                      fps:(int)fps
                  bitrate:(int)bitrate
                recordAudio:(BOOL)recordAudio {
  self.session = session;
  self.outputURL = url;
  self.preferredCodec = codec;
  self.preferredBitrate = bitrate;
  if (fps > 0) { self.targetFPS = fps; }
  self.enableAudio = recordAudio;

  // Activer la session audio pour l'enregistrement si requis
  #if TARGET_OS_IOS
  if (recordAudio) {
    NSError* audioErr = nil;
    AVAudioSession* avs = [AVAudioSession sharedInstance];
    if (@available(iOS 10.0, *)) {
      [avs setCategory:AVAudioSessionCategoryPlayAndRecord
                  mode:AVAudioSessionModeVideoRecording
               options:0
                 error:&audioErr];
    } else {
      [avs setCategory:AVAudioSessionCategoryPlayAndRecord error:&audioErr];
    }
    [avs setActive:YES error:&audioErr];
  }
  #endif

  // Configurer DataOutput BGRA
  AVCaptureVideoDataOutput* output = [[AVCaptureVideoDataOutput alloc] init];
  output.videoSettings = @{ (NSString*)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA) };
  output.alwaysDiscardsLateVideoFrames = YES;
  dispatch_queue_t queue = dispatch_queue_create("naaya.video.filtered.recorder", DISPATCH_QUEUE_SERIAL);
  [output setSampleBufferDelegate:self queue:queue];
  self.videoQueue = queue;
  if ([session canAddOutput:output]) {
    [session beginConfiguration];
    [session addOutput:output];
    [session commitConfiguration];
    self.videoOutput = output;
  } else {
    return NO;
  }

  // Déterminer FPS/format/orientation & transform
  AVCaptureConnection* conn = [output connectionWithMediaType:AVMediaTypeVideo];
  AVCaptureVideoOrientation vOrient = conn.isVideoOrientationSupported ? conn.videoOrientation : AVCaptureVideoOrientationPortrait;
  if (self.forcedOrientation >= 0) {
    vOrient = (AVCaptureVideoOrientation)self.forcedOrientation;
  }
  BOOL isFront = NO;
  AVCaptureDeviceInput* input = NaayaGetCurrentInput();
  if (input) {
    isFront = (input.device.position == AVCaptureDevicePositionFront);
    CMFormatDescriptionRef desc = input.device.activeFormat.formatDescription;
    if (desc) {
      CMVideoDimensions dim = CMVideoFormatDescriptionGetDimensions(desc);
      self.targetSize = CGSizeMake(dim.width, dim.height);
    }
    NSArray<AVFrameRateRange*>* ranges = input.device.activeFormat.videoSupportedFrameRateRanges;
    if (ranges.count > 0) { self.targetFPS = (int)llround(ranges.firstObject.maxFrameRate); }
    // Forcer FPS demandé si possible
    int desiredFPS = (fps > 0 ? fps : 60);
    // Clamp au maximum supporté
    if (ranges.count > 0) {
      double maxSupported = ranges.firstObject.maxFrameRate;
      if (desiredFPS > (int)maxSupported) desiredFPS = (int)maxSupported;
    }
    NSError* cfgErr = nil;
    if ([input.device lockForConfiguration:&cfgErr]) {
      CMTime frameDur = CMTimeMake(1, desiredFPS);
      if ([input.device respondsToSelector:@selector(setActiveVideoMinFrameDuration:)] && [input.device respondsToSelector:@selector(setActiveVideoMaxFrameDuration:)]) {
        input.device.activeVideoMinFrameDuration = frameDur;
        input.device.activeVideoMaxFrameDuration = frameDur;
      }
      [input.device unlockForConfiguration];
      self.targetFPS = desiredFPS;
    }
  }
  if (conn.isVideoOrientationSupported) {
    conn.videoOrientation = vOrient;
  }
  #if TARGET_OS_IOS
  if (conn.isVideoStabilizationSupported) {
    if (self.stabilizationMode >= 0) {
      conn.preferredVideoStabilizationMode = (AVCaptureVideoStabilizationMode)self.stabilizationMode;
    } else {
      conn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeAuto;
    }
  }
  #endif

  // Préparer writer (type selon extension)
  NSError* err = nil;
  NSString* ext = [[url pathExtension] lowercaseString];
  NSString* fileType = [ext isEqualToString:@"mov"] ? AVFileTypeQuickTimeMovie : AVFileTypeMPEG4;
  self.writer = [AVAssetWriter assetWriterWithURL:url fileType:fileType error:&err];
  if (err || !self.writer) {
    return NO;
  }
  self.writer.movieFragmentInterval = kCMTimeInvalid;

  int width = (int)(self.targetSize.width > 0 ? self.targetSize.width : 1080);
  int height = (int)(self.targetSize.height > 0 ? self.targetSize.height : 1920);
  // S'assurer que width/height correspondent à l’orientation paysage attendu par H264
  if (vOrient == AVCaptureVideoOrientationPortrait || vOrient == AVCaptureVideoOrientationPortraitUpsideDown) {
    // Writer attend landscape par défaut; on garde W/H tels quels et on applique un transform rotatif
  }
  // Choix codec
  // Choisir automatiquement HEVC si possible et pas explicitement contredit
  NSString* avCodec = AVVideoCodecTypeH264;
  BOOL wantHEVC = NO;
  if (self.preferredCodec == nil || [self.preferredCodec length] == 0 || [[self.preferredCodec lowercaseString] isEqualToString:@"auto"]) {
    wantHEVC = YES;
  } else if ([[self.preferredCodec lowercaseString] isEqualToString:@"hevc"]) {
    wantHEVC = YES;
  }
  if (wantHEVC) {
    if (@available(iOS 11.0, *)) {
      avCodec = AVVideoCodecTypeHEVC;
    }
  }

  int bitRate = self.preferredBitrate > 0 ? self.preferredBitrate : MAX(4 * 1000 * 1000, width * height * 4);
  NSDictionary* compress = @{ AVVideoAverageBitRateKey: @(bitRate),
                              AVVideoExpectedSourceFrameRateKey: @(self.targetFPS),
                              AVVideoMaxKeyFrameIntervalKey: @(self.targetFPS) };
  NSDictionary* settings = @{ AVVideoCodecKey: avCodec,
                              AVVideoWidthKey: @(width),
                              AVVideoHeightKey: @(height),
                              AVVideoCompressionPropertiesKey: compress };
  self.videoInput = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:settings];
  self.videoInput.expectsMediaDataInRealTime = YES;
  self.videoInput.transform = NaayaTransformForOrientation(vOrient, isFront);

  NSDictionary* sourceAttrs = @{ (NSString*)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA),
                                 (NSString*)kCVPixelBufferWidthKey: @(width),
                                 (NSString*)kCVPixelBufferHeightKey: @(height) };
  self.adaptor = [AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:self.videoInput sourcePixelBufferAttributes:sourceAttrs];
  if ([self.writer canAddInput:self.videoInput]) {
    [self.writer addInput:self.videoInput];
  }

  // Audio: configurer input + output si demandé
  if (self.enableAudio) {
    // Paramètres audio par défaut (seront adaptés dynamiquement au 1er buffer)
    NSDictionary* audioSettings = @{ AVFormatIDKey: @(kAudioFormatMPEG4AAC),
                                     AVNumberOfChannelsKey: @(2),
                                     AVSampleRateKey: @(44100),
                                     AVEncoderBitRateKey: @(128000) };
    self.audioInput = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeAudio outputSettings:audioSettings];
    self.audioInput.expectsMediaDataInRealTime = YES;
    if ([self.writer canAddInput:self.audioInput]) {
      [self.writer addInput:self.audioInput];
    }

    AVCaptureAudioDataOutput* aout = [[AVCaptureAudioDataOutput alloc] init];
    dispatch_queue_t aq = dispatch_queue_create("naaya.audio.filtered.recorder", DISPATCH_QUEUE_SERIAL);
    [aout setSampleBufferDelegate:self queue:aq];
    self.audioQueue = aq;
    if ([session canAddOutput:aout]) {
      [session beginConfiguration];
      [session addOutput:aout];
      [session commitConfiguration];
      self.audioOutput = aout;
    }
  }

  self.configured = NO; // démarrera à la première frame avec le PTS
  self.recording = YES;
  return YES;
}

- (void)stopWithCompletion:(void(^)(void))completion {
  self.recording = NO;
  if (self.videoOutput && self.session) {
    [self.session beginConfiguration];
    [self.session removeOutput:self.videoOutput];
    [self.session commitConfiguration];
    self.videoOutput = nil;
  }
  if (self.audioOutput && self.session) {
    [self.session beginConfiguration];
    [self.session removeOutput:self.audioOutput];
    [self.session commitConfiguration];
    self.audioOutput = nil;
  }
  AVAssetWriter* writer = self.writer;
  AVAssetWriterInput* input = self.videoInput;
  self.videoInput = nil;
  self.adaptor = nil;
  self.writer = nil;
  self.configured = NO;
  if (writer) {
    if (input) { [input markAsFinished]; }
    [writer finishWritingWithCompletionHandler:^{ if (completion) completion(); }];
  } else {
    if (completion) completion();
  }
}

- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer fromConnection:(AVCaptureConnection *)connection {
  (void)output; (void)connection;
  if (!self.recording || !self.writer) return;

  // Différencier flux vidéo / audio
  if (output == self.videoOutput) {
    CVImageBufferRef pb = CMSampleBufferGetImageBuffer(sampleBuffer);

  size_t width = CVPixelBufferGetWidth(pb);
  size_t height = CVPixelBufferGetHeight(pb);
  
  // === Traitement FFmpeg pour l'enregistrement ===
  BOOL ffmpegProcessed = NO;
  CVImageBufferRef processedBuffer = pb; // par défaut, utiliser l'original
  
  // Vérifier s'il y a un filtre actif
  extern bool NaayaFilters_HasFilter();
  if (NaayaFilters_HasFilter()) {
    CVPixelBufferLockBaseAddress(pb, kCVPixelBufferLock_ReadOnly);
    
    uint8_t* baseAddress = (uint8_t*)CVPixelBufferGetBaseAddress(pb);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pb);
    
    if (baseAddress) {
      // Créer buffer de sortie pour FFmpeg
      CVPixelBufferRef outputBuffer = NULL;
      NSDictionary* attrs = @{
        (NSString*)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA),
        (NSString*)kCVPixelBufferWidthKey: @(width),
        (NSString*)kCVPixelBufferHeightKey: @(height),
        (NSString*)kCVPixelBufferIOSurfacePropertiesKey: @{}
      };
      
      CVReturn status = CVPixelBufferCreate(kCFAllocatorDefault,
                                            width, height,
                                            kCVPixelFormatType_32BGRA,
                                            (__bridge CFDictionaryRef)attrs,
                                            &outputBuffer);
      
      if (status == kCVReturnSuccess && outputBuffer) {
        CVPixelBufferLockBaseAddress(outputBuffer, 0);
        uint8_t* outBase = (uint8_t*)CVPixelBufferGetBaseAddress(outputBuffer);
        size_t outStride = CVPixelBufferGetBytesPerRow(outputBuffer);
        
        // Traitement FFmpeg (fps basé sur la config d'enregistrement)
        double fps = 30.0; // TODO: récupérer fps depuis la config
        ffmpegProcessed = NaayaFilters_ProcessBGRA(baseAddress, (int)bytesPerRow,
                                                   (int)width, (int)height, fps,
                                                   outBase, (int)outStride);
        
        CVPixelBufferUnlockBaseAddress(outputBuffer, 0);
        
        if (ffmpegProcessed) {
          processedBuffer = outputBuffer; // utiliser le buffer traité
        } else {
          CVPixelBufferRelease(outputBuffer); // libérer si échec
        }
      }
    }
    
    CVPixelBufferUnlockBaseAddress(pb, kCVPixelBufferLock_ReadOnly);
  }

  if (!self.configured) {
    if ([self.writer status] == AVAssetWriterStatusUnknown) {
      [self.writer startWriting];
      CMTime ts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer);
      self.startTime = ts;
      [self.writer startSessionAtSourceTime:ts];
      self.configured = YES;
    }
  }

  if (!self.videoInput || !self.videoInput.isReadyForMoreMediaData) {
    return;
  }

  // Utiliser le buffer traité (FFmpeg si dispo, sinon original)
  CIImage* inImg = [CIImage imageWithCVPixelBuffer:processedBuffer];
  if (!inImg) return;
  CIImage* outImg = inImg;
  
  // Si FFmpeg n'a pas traité, appliquer Core Image en fallback
  if (!ffmpegProcessed && NaayaFilters_HasFilter()) {
    NSString* name = NaayaFilters_GetCurrentName() ? [NSString stringWithUTF8String:NaayaFilters_GetCurrentName()] : @"";
    if ([name hasPrefix:@"lut3d:"]) {
      NSRange qpos = [name rangeOfString:@"?"];
      if (qpos.location != NSNotFound) {
        name = [name substringToIndex:qpos.location];
      }
    }
    double intensity = NaayaFilters_GetCurrentIntensity();
    if ([name isEqualToString:@"sepia"]) {
      CIFilter* f = [CIFilter filterWithName:@"CISepiaTone"];
      [f setValue:inImg forKey:kCIInputImageKey];
      [f setValue:@(MAX(0, MIN(1, intensity))) forKey:kCIInputIntensityKey];
      outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"noir"]) {
      CIFilter* f = [CIFilter filterWithName:@"CIPhotoEffectNoir"];
      [f setValue:inImg forKey:kCIInputImageKey];
      outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"monochrome"]) {
      CIFilter* f = [CIFilter filterWithName:@"CIColorMonochrome"];
      [f setValue:inImg forKey:kCIInputImageKey];
      [f setValue:@(1.0) forKey:@"inputIntensity"];
      outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"color_controls"]) {
      NaayaAdvancedFilterParams adv; bool hasAdv = NaayaFilters_GetAdvancedParams(&adv);
      if (hasAdv) {
        CIImage* tmp = inImg;
        {
          CIFilter* c = [CIFilter filterWithName:@"CIColorControls"];
          [c setValue:tmp forKey:kCIInputImageKey];
          [c setValue:@(MAX(-1.0, MIN(1.0, adv.brightness))) forKey:@"inputBrightness"];
          [c setValue:@(MAX(0.0, MIN(2.0, adv.contrast))) forKey:@"inputContrast"];
          [c setValue:@(MAX(0.0, MIN(2.0, adv.saturation))) forKey:@"inputSaturation"];
          tmp = c.outputImage ?: tmp;
        }
        if (fabs(adv.hue) > 0.01) { CIFilter* h = [CIFilter filterWithName:@"CIHueAdjust"]; [h setValue:tmp forKey:kCIInputImageKey]; double radians = adv.hue * M_PI / 180.0; [h setValue:@(radians) forKey:@"inputAngle"]; tmp = h.outputImage ?: tmp; }
        if (fabs(adv.gamma - 1.0) > 0.01) { CIFilter* g = [CIFilter filterWithName:@"CIGammaAdjust"]; [g setValue:tmp forKey:kCIInputImageKey]; [g setValue:@(MAX(0.1, MIN(3.0, adv.gamma))) forKey:@"inputPower"]; tmp = g.outputImage ?: tmp; }
        if (fabs(adv.exposure) > 0.01) { CIFilter* e = [CIFilter filterWithName:@"CIExposureAdjust"]; [e setValue:tmp forKey:kCIInputImageKey]; [e setValue:@(MAX(-2.0, MIN(2.0, adv.exposure))) forKey:@"inputEV"]; tmp = e.outputImage ?: tmp; }
        if (fabs(adv.shadows) > 0.01 || fabs(adv.highlights) > 0.01) { CIFilter* sh = [CIFilter filterWithName:@"CIHighlightShadowAdjust"]; [sh setValue:tmp forKey:kCIInputImageKey]; double s = (adv.shadows + 1.0) / 2.0; double hl = (adv.highlights + 1.0) / 2.0; [sh setValue:@(MAX(0.0, MIN(1.0, s))) forKey:@"inputShadowAmount"]; [sh setValue:@(MAX(0.0, MIN(1.0, hl))) forKey:@"inputHighlightAmount"]; tmp = sh.outputImage ?: tmp; }
        if (fabs(adv.warmth) > 0.01 || fabs(adv.tint) > 0.01) { CIFilter* tt = [CIFilter filterWithName:@"CITemperatureAndTint"]; [tt setValue:tmp forKey:kCIInputImageKey]; CGFloat temp = (CGFloat)(6500.0 + adv.warmth * 2000.0); CGFloat tint = (CGFloat)(adv.tint * 50.0); CIVector* neutral = [CIVector vectorWithX:temp Y:tint]; CIVector* target = [CIVector vectorWithX:6500 Y:0]; [tt setValue:neutral forKey:@"inputNeutral"]; [tt setValue:target forKey:@"inputTargetNeutral"]; tmp = tt.outputImage ?: tmp; }
        if (adv.vignette > 0.01) { CIFilter* v = [CIFilter filterWithName:@"CIVignette"]; [v setValue:tmp forKey:kCIInputImageKey]; [v setValue:@(MIN(1.0, MAX(0.0, adv.vignette)) * 2.0) forKey:@"inputIntensity"]; [v setValue:@(1.0) forKey:@"inputRadius"]; tmp = v.outputImage ?: tmp; }
        if (adv.grain > 0.01) { CGRect extent = inImg.extent; CIFilter* rnd = [CIFilter filterWithName:@"CIRandomGenerator"]; CIImage* noise = rnd.outputImage; if (noise) { noise = [noise imageByCroppingToRect:extent]; CIFilter* ctrl = [CIFilter filterWithName:@"CIColorControls"]; [ctrl setValue:noise forKey:kCIInputImageKey]; [ctrl setValue:@(0.0) forKey:@"inputSaturation"]; [ctrl setValue:@(0.0) forKey:@"inputBrightness"]; [ctrl setValue:@(1.0 + MIN(1.0, MAX(0.0, adv.grain)) * 0.5) forKey:@"inputContrast"]; noise = ctrl.outputImage ?: noise; CIFilter* blur = [CIFilter filterWithName:@"CIGaussianBlur"]; [blur setValue:noise forKey:kCIInputImageKey]; [blur setValue:@(0.5) forKey:@"inputRadius"]; noise = [blur.outputImage imageByCroppingToRect:extent] ?: noise; CIFilter* mat = [CIFilter filterWithName:@"CIColorMatrix"]; [mat setValue:noise forKey:kCIInputImageKey]; [mat setValue:[CIVector vectorWithX:1 Y:0 Z:0 W:0] forKey:@"inputRVector"]; [mat setValue:[CIVector vectorWithX:0 Y:1 Z:0 W:0] forKey:@"inputGVector"]; [mat setValue:[CIVector vectorWithX:0 Y:0 Z:1 W:0] forKey:@"inputBVector"]; [mat setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:0] forKey:@"inputAVector"]; CGFloat alpha = (CGFloat)(MIN(1.0, MAX(0.0, adv.grain)) * 0.18); [mat setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:alpha] forKey:@"inputBiasVector"]; CIImage* noiseA = mat.outputImage ?: noise; CIFilter* comp = [CIFilter filterWithName:@"CISourceOverCompositing"]; [comp setValue:noiseA forKey:kCIInputImageKey]; [comp setValue:tmp forKey:kCIInputBackgroundImageKey]; tmp = [comp.outputImage imageByCroppingToRect:extent] ?: tmp; } }
        outImg = tmp;
      } else {
        CIFilter* f = [CIFilter filterWithName:@"CIColorControls"]; [f setValue:inImg forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputSaturation"]; [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"]; [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"]; outImg = f.outputImage ?: inImg;
      }
    } else if ([name hasPrefix:@"lut3d:"]) {
      static NSMutableDictionary<NSString*, NSData*>* sCubeCache = nil;
      static NSMutableDictionary<NSString*, NSNumber*>* sCubeSizeCache = nil;
      if (!sCubeCache) sCubeCache = [NSMutableDictionary new];
      if (!sCubeSizeCache) sCubeSizeCache = [NSMutableDictionary new];
      NSString* lutPath = [name substringFromIndex:6];
      NSData* cubeData = sCubeCache[lutPath];
      NSNumber* cubeSizeNum = sCubeSizeCache[lutPath];
      if (!cubeData || !cubeSizeNum) {
        int cubeSize = 0; NSError* err = nil; NSString* fileText = [NSString stringWithContentsOfFile:lutPath encoding:NSUTF8StringEncoding error:&err];
        if (fileText && fileText.length > 0) {
          NSArray<NSString*>* lines = [fileText componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]];
          NSInteger lutSize = 0; NSMutableArray<NSNumber*>* values = [NSMutableArray arrayWithCapacity:1024];
          for (NSString* raw in lines) {
            NSString* line = [raw stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
            if (line.length == 0) continue;
            if ([line hasPrefix:@"#"] || [line hasPrefix:@"TITLE"] || [line hasPrefix:@"DOMAIN_MIN"] || [line hasPrefix:@"DOMAIN_MAX"]) continue;
            if ([line hasPrefix:@"LUT_3D_SIZE"]) {
              NSArray* parts = [line componentsSeparatedByCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
              for (NSString* p in parts) { if (p.length == 0) continue; NSScanner* sc = [NSScanner scannerWithString:p]; NSInteger n = 0; if ([sc scanInteger:&n]) { lutSize = n; break; } }
              continue;
            }
            NSArray* comps = [line componentsSeparatedByCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
            NSMutableArray<NSString*>* tokens = [NSMutableArray new];
            for (NSString* c in comps) { if (c.length > 0) [tokens addObject:c]; }
            if (tokens.count >= 3) {
              double r = [tokens[0] doubleValue]; double g = [tokens[1] doubleValue]; double b = [tokens[2] doubleValue];
              r = r < 0.0 ? 0.0 : (r > 1.0 ? 1.0 : r); g = g < 0.0 ? 0.0 : (g > 1.0 ? 1.0 : g); b = b < 0.0 ? 0.0 : (b > 1.0 ? 1.0 : b);
              [values addObject:@(r)]; [values addObject:@(g)]; [values addObject:@(b)]; [values addObject:@(1.0)];
            }
          }
          if (lutSize > 1) {
            NSUInteger expected = (NSUInteger)lutSize * (NSUInteger)lutSize * (NSUInteger)lutSize * 4;
            if (values.count >= expected) {
              cubeSize = (int)lutSize; NSMutableData* data = [NSMutableData dataWithLength:expected * sizeof(float)]; float* ptr = (float*)data.mutableBytes; for (NSUInteger i = 0; i < expected; ++i) { ptr[i] = (float)values[i].doubleValue; } cubeData = data;
            }
          }
        }
        if (cubeData && cubeSize > 1) { sCubeCache[lutPath] = cubeData; sCubeSizeCache[lutPath] = @(cubeSize); cubeSizeNum = @(cubeSize); }
      }
      if (cubeData && cubeSizeNum) {
        CIFilter* cube = [CIFilter filterWithName:@"CIColorCube"];
        [cube setValue:inImg forKey:kCIInputImageKey];
        [cube setValue:cubeData forKey:@"inputCubeData"];
        [cube setValue:cubeSizeNum forKey:@"inputCubeDimension"];
        CIImage* lutApplied = cube.outputImage ?: inImg; CGFloat mix = (CGFloat)MAX(0.0, MIN(1.0, intensity));
        if (mix < 1.0 - 1e-3) {
          CIFilter* mat = [CIFilter filterWithName:@"CIColorMatrix"]; [mat setValue:lutApplied forKey:kCIInputImageKey]; [mat setValue:[CIVector vectorWithX:1 Y:0 Z:0 W:0] forKey:@"inputRVector"]; [mat setValue:[CIVector vectorWithX:0 Y:1 Z:0 W:0] forKey:@"inputGVector"]; [mat setValue:[CIVector vectorWithX:0 Y:0 Z:1 W:0] forKey:@"inputBVector"]; [mat setValue:[CIVector vectorWithX:0 Y:0 Z:0 W:mix] forKey:@"inputAVector"]; CIImage* withAlpha = mat.outputImage ?: lutApplied; CIFilter* comp = [CIFilter filterWithName:@"CISourceOverCompositing"]; [comp setValue:withAlpha forKey:kCIInputImageKey]; [comp setValue:inImg forKey:kCIInputBackgroundImageKey]; outImg = [comp.outputImage imageByCroppingToRect:inImg.extent] ?: lutApplied;
        } else { outImg = lutApplied; }
      } else { outImg = inImg; }
    }
  }

  // Rendu vers pixel buffer de sortie
  CVPixelBufferRef outPb = NULL;
  if (!self.adaptor || !self.adaptor.pixelBufferPool) return;
  CVReturn cr = CVPixelBufferPoolCreatePixelBuffer(NULL, self.adaptor.pixelBufferPool, &outPb);
  if (cr != kCVReturnSuccess || !outPb) return;
  [self.ciContext render:outImg toCVPixelBuffer:outPb bounds:CGRectMake(0, 0, width, height) colorSpace:nil];
  CMTime ts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer);
  [self.adaptor appendPixelBuffer:outPb withPresentationTime:ts];
  CVPixelBufferRelease(outPb);
  return;
  }

  // Audio
  if (self.enableAudio && output == self.audioOutput) {
    if (!self.audioInput || !self.audioInput.isReadyForMoreMediaData) return;
    // Initialiser EQ au 1er buffer
    if (!_eq) {
      _eq = std::make_unique<AudioEqualizer::AudioEqualizer>(10, 48000);
      self.eqConfigured = NO;
    }
    // Lire format
    CMAudioFormatDescriptionRef fmt = (CMAudioFormatDescriptionRef)CMSampleBufferGetFormatDescription(sampleBuffer);
    const AudioStreamBasicDescription* asbd = fmt ? CMAudioFormatDescriptionGetStreamBasicDescription(fmt) : nullptr;
    if (!asbd) { [self.audioInput appendSampleBuffer:sampleBuffer]; return; }
    double sr = asbd->mSampleRate > 0 ? asbd->mSampleRate : 48000.0;
    int channels = (int)asbd->mChannelsPerFrame;
    if (!self.eqConfigured || fabs(self.eqSampleRate - sr) > 1.0 || self.eqChannels != channels) {
      _eq->setSampleRate((uint32_t)sr);
      self.eqSampleRate = sr;
      self.eqChannels = channels;
      self.eqConfigured = YES;
      // Init NR moteur simple (expander + passe-haut)
      _nr = std::make_unique<AudioNR::NoiseReducer>((uint32_t)sr, channels);
      // Init RNNoise wrapper (squelette; actif lorsque vendorisé)
      _rnns = std::make_unique<AudioNR::RNNoiseSuppressor>();
      _rnns->initialize((uint32_t)sr, channels);
      _safety = std::make_unique<AudioSafety::AudioSafetyEngine>((uint32_t)sr, channels);
      // FX chain setup
      _fx = std::make_unique<AudioFX::EffectChain>();
      _fx->setEnabled(NaayaFX_IsEnabled());
      _fx->setSampleRate((uint32_t)sr, channels);
      {
        auto* comp = _fx->emplaceEffect<AudioFX::CompressorEffect>();
        auto* del = _fx->emplaceEffect<AudioFX::DelayEffect>();
        comp->setEnabled(true); del->setEnabled(true);
        double th, ra, at, rl, mk; NaayaFX_GetCompressor(&th, &ra, &at, &rl, &mk);
        comp->setParameters(th, ra, at, rl, mk);
        double dm, fb, mx; NaayaFX_GetDelay(&dm, &fb, &mx);
        del->setParameters(dm, fb, mx);
      }
      AudioNR::NoiseReducerConfig cfg; bool hpE; double hpHz, thDb, ratio, flDb, aMs, rMs;
      NaayaNR_GetConfig(&hpE, &hpHz, &thDb, &ratio, &flDb, &aMs, &rMs);
      cfg.enabled = NaayaNR_IsEnabled(); cfg.enableHighPass = hpE; cfg.highPassHz = hpHz; cfg.thresholdDb = thDb; cfg.ratio = ratio; cfg.floorDb = flDb; cfg.attackMs = aMs; cfg.releaseMs = rMs; _nr->setConfig(cfg);
      // Charger gains initiaux
      double gains[32] = {0};
      size_t nb = NaayaEQ_CopyBandGains(gains, 32);
      _eq->beginParameterUpdate();
      for (size_t i = 0; i < nb; ++i) { _eq->setBandGain(i, gains[i]); }
      _eq->endParameterUpdate();
      _eq->setMasterGain(NaayaEQ_GetMasterGainDB());
      _eq->setBypass(!NaayaEQ_IsEnabled());
    }
    // Appliquer mises à jour si besoin
    if (NaayaEQ_HasPendingUpdate()) {
      double gains[32] = {0};
      size_t nb = NaayaEQ_CopyBandGains(gains, 32);
      _eq->beginParameterUpdate();
      for (size_t i = 0; i < nb; ++i) { _eq->setBandGain(i, gains[i]); }
      _eq->endParameterUpdate();
      _eq->setMasterGain(NaayaEQ_GetMasterGainDB());
      _eq->setBypass(!NaayaEQ_IsEnabled());
      NaayaEQ_ClearPendingUpdate();
    }
    if (NaayaFX_HasPendingUpdate()) {
      if (_fx) {
        _fx->setEnabled(NaayaFX_IsEnabled());
        _fx->setSampleRate((uint32_t)sr, channels);
        _fx->clear();
        auto* comp = _fx->emplaceEffect<AudioFX::CompressorEffect>();
        auto* del = _fx->emplaceEffect<AudioFX::DelayEffect>();
        comp->setEnabled(true); del->setEnabled(true);
        double th, ra, at, rl, mk; NaayaFX_GetCompressor(&th, &ra, &at, &rl, &mk);
        comp->setParameters(th, ra, at, rl, mk);
        double dm, fb, mx; NaayaFX_GetDelay(&dm, &fb, &mx);
        del->setParameters(dm, fb, mx);
      }
      NaayaFX_ClearPendingUpdate();
    }

    CMBlockBufferRef dataBuf = CMSampleBufferGetDataBuffer(sampleBuffer);
    if (!dataBuf) { [self.audioInput appendSampleBuffer:sampleBuffer]; return; }
    size_t totalLength = 0; size_t lenAtOffset = 0; char* dataPtr = nullptr;
    if (CMBlockBufferGetDataPointer(dataBuf, 0, &lenAtOffset, &totalLength, &dataPtr) != kCMBlockBufferNoErr || !dataPtr || totalLength == 0) {
      [self.audioInput appendSampleBuffer:sampleBuffer];
      return;
    }

    size_t numFrames = (size_t)CMSampleBufferGetNumSamples(sampleBuffer);
    // Formats supportés: PCM S16 interleaved OU PCM float32 interleaved
    bool isPCM = (asbd->mFormatID == kAudioFormatLinearPCM);
    bool isInt16 = isPCM && asbd->mBitsPerChannel == 16;
    bool isPacked = (asbd->mFormatFlags & kAudioFormatFlagIsPacked) != 0;
    bool isSignedInt = (asbd->mFormatFlags & kAudioFormatFlagIsSignedInteger) != 0;
    bool isFloat32 = isPCM && ((asbd->mFormatFlags & kAudioFormatFlagIsFloat) != 0) && asbd->mBitsPerChannel == 32;
    if (!(channels >= 1 && channels <= 2 && isPCM && ((isInt16 && isPacked && isSignedInt) || isFloat32))) {
      // Fallback: format PCM non géré → append brut
      [self.audioInput appendSampleBuffer:sampleBuffer];
      return;
    }

    // Convertir → float, traiter, reconvertir selon format
    if (channels == 1) {
      _bufMono.resize(numFrames);
      if (isInt16) {
        int16_t* in16 = reinterpret_cast<int16_t*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) _bufMono[i] = (float)in16[i] / 32768.0f;
      } else {
        float* inF = reinterpret_cast<float*>(dataPtr);
        // Copier tel quel dans tampon float
        memcpy(_bufMono.data(), inF, numFrames * sizeof(float));
      }
      // NR temps-réel (sélection): RNNoise si dispo+activé, sinon expander
      bool useRNNS = (NaayaNR_GetMode() == 1);
      if (useRNNS && _rnns && _rnns->isAvailable()) {
        _tmpMono.resize(numFrames);
        _rnns->setAggressiveness(NaayaRNNS_GetAggressiveness());
        _rnns->processMono(_bufMono.data(), _tmpMono.data(), numFrames);
        _bufMono.swap(_tmpMono);
      } else if (_nr) {
        if (NaayaNR_HasPendingUpdate()) {
          AudioNR::NoiseReducerConfig cfg; bool hpE; double hpHz, thDb, ratio, flDb, aMs, rMs;
          NaayaNR_GetConfig(&hpE, &hpHz, &thDb, &ratio, &flDb, &aMs, &rMs);
          cfg.enabled = NaayaNR_IsEnabled(); cfg.enableHighPass = hpE; cfg.highPassHz = hpHz; cfg.thresholdDb = thDb; cfg.ratio = ratio; cfg.floorDb = flDb; cfg.attackMs = aMs; cfg.releaseMs = rMs; _nr->setConfig(cfg);
          NaayaNR_ClearPendingUpdate();
        }
        _tmpMono.resize(numFrames);
        _nr->processMono(_bufMono.data(), _tmpMono.data(), numFrames);
        _bufMono.swap(_tmpMono);
      }
      // Spectre (optionnel)
      if (sNaayaSpectrumRunning) {
          const size_t N = 1024;
          static FFTSetup setup = NULL;
          if (!setup) setup = vDSP_create_fftsetup(10, kFFTRadix2);
          static float realp[N]; static float imagp[N];
          size_t L = (numFrames < N ? numFrames : N);
          // Copier mono -> realp et zero-pad
          memcpy(realp, _bufMono.data(), sizeof(float) * L);
          if (L < N) memset(realp + L, 0, sizeof(float) * (N - L));
          memset(imagp, 0, sizeof(float) * N);
          DSPSplitComplex split = { .realp = realp, .imagp = imagp };
          vDSP_fft_zip(setup, &split, 1, 10, FFT_FORWARD);
          // Magnitudes sur N/2
          static float mags[N/2];
          vDSP_zvabs(&split, 1, mags, 1, N/2);
          // Agg 32 barres
          const int bars = 32;
          float outBars[bars];
          int per = (int)(N/2 / bars);
          if (per < 1) per = 1;
          for (int b = 0; b < bars; ++b) {
            int start = b * per;
            int end = start + per;
            if (end > (int)(N/2)) end = (int)(N/2);
            float sum = 0.f; int cnt = 0;
            for (int k = start; k < end; ++k) { sum += mags[k]; ++cnt; }
            float avg = cnt > 0 ? (sum / cnt) : 0.f;
            outBars[b] = avg;
          }
          // Normalisation log 0..1
          float maxv = 1.f;
          for (int b = 0; b < bars; ++b) if (outBars[b] > maxv) maxv = outBars[b];
          for (int b = 0; b < bars; ++b) {
            float norm = (float)(log1pf(outBars[b]) / log1pf(maxv));
            if (norm < 0.f) norm = 0.f; else if (norm > 1.f) norm = 1.f;
            sNaayaSpectrum[b] = norm;
          }
        
      }
      // Effets créatifs (FX)
      if (_fx && _fx->isEnabled()) {
        _tmpMono.resize(numFrames);
        _fx->processMono(_bufMono.data(), _tmpMono.data(), numFrames);
        _bufMono.swap(_tmpMono);
      }
       // Sécurité audio (DC offset / limiter / validation)
       if (_safety) {
        _safety->processMono(_bufMono.data(), numFrames);
        auto rep = _safety->getLastReport();
        NaayaSafety_UpdateReport(rep.peak, rep.rms, rep.dcOffset, rep.clippedSamples, rep.feedbackScore, rep.overloadActive);
       }
       _outMono.resize(numFrames);
      _eq->process(_bufMono.data(), _outMono.data(), numFrames);
      if (isInt16) {
        int16_t* in16 = reinterpret_cast<int16_t*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          float v = std::max(-1.0f, std::min(1.0f, _outMono[i]));
          in16[i] = (int16_t)lrintf(v * 32767.0f);
        }
      } else {
        float* inF = reinterpret_cast<float*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          float v = std::max(-1.0f, std::min(1.0f, _outMono[i]));
          inF[i] = v;
        }
      }
      [self.audioInput appendSampleBuffer:sampleBuffer];
    } else {
      // stéréo interleaved LR LR ...
      _left.resize(numFrames); _right.resize(numFrames);
      if (isInt16) {
        int16_t* in16 = reinterpret_cast<int16_t*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          _left[i] = (float)in16[2*i] / 32768.0f;
          _right[i] = (float)in16[2*i+1] / 32768.0f;
        }
      } else {
        float* inF = reinterpret_cast<float*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          _left[i] = inF[2*i];
          _right[i] = inF[2*i+1];
        }
      }
      if (NaayaNR_GetMode() == 1 && _rnns && _rnns->isAvailable()) {
        _tmpLeft.resize(numFrames); _tmpRight.resize(numFrames);
        _rnns->setAggressiveness(NaayaRNNS_GetAggressiveness());
        _rnns->processStereo(_left.data(), _right.data(), _tmpLeft.data(), _tmpRight.data(), numFrames);
        _left.swap(_tmpLeft); _right.swap(_tmpRight);
      } else if (_nr) {
        if (NaayaNR_HasPendingUpdate()) {
          AudioNR::NoiseReducerConfig cfg; bool hpE; double hpHz, thDb, ratio, flDb, aMs, rMs;
          NaayaNR_GetConfig(&hpE, &hpHz, &thDb, &ratio, &flDb, &aMs, &rMs);
          cfg.enabled = NaayaNR_IsEnabled(); cfg.enableHighPass = hpE; cfg.highPassHz = hpHz; cfg.thresholdDb = thDb; cfg.ratio = ratio; cfg.floorDb = flDb; cfg.attackMs = aMs; cfg.releaseMs = rMs; _nr->setConfig(cfg);
          NaayaNR_ClearPendingUpdate();
        }
        _tmpLeft.resize(numFrames); _tmpRight.resize(numFrames);
        _nr->processStereo(_left.data(), _right.data(), _tmpLeft.data(), _tmpRight.data(), numFrames);
        _left.swap(_tmpLeft); _right.swap(_tmpRight);
      }
      // Spectre (optionnel)
      if (sNaayaSpectrumRunning) {
          const size_t N = 1024;
          static FFTSetup setup = NULL;
          if (!setup) setup = vDSP_create_fftsetup(10, kFFTRadix2);
          static float realp[N]; static float imagp[N];
          // moyenne L/R
          static float monoBuf[N];
          size_t L = (numFrames < N ? numFrames : N);
          for (size_t i = 0; i < L; ++i) monoBuf[i] = 0.5f * (_left[i] + _right[i]);
          memcpy(realp, monoBuf, sizeof(float) * L);
          if (L < N) memset(realp + L, 0, sizeof(float) * (N - L));
          memset(imagp, 0, sizeof(float) * N);
          DSPSplitComplex split = { .realp = realp, .imagp = imagp };
          vDSP_fft_zip(setup, &split, 1, 10, FFT_FORWARD);
          static float mags[N/2];
          vDSP_zvabs(&split, 1, mags, 1, N/2);
          const int bars = 32;
          float outBars[bars];
          int per = (int)(N/2 / bars);
          if (per < 1) per = 1;
          for (int b = 0; b < bars; ++b) {
            int start = b * per;
            int end = start + per;
            if (end > (int)(N/2)) end = (int)(N/2);
            float sum = 0.f; int cnt = 0;
            for (int k = start; k < end; ++k) { sum += mags[k]; ++cnt; }
            float avg = cnt > 0 ? (sum / cnt) : 0.f;
            outBars[b] = avg;
          }
          float maxv = 1.f;
          for (int b = 0; b < bars; ++b) if (outBars[b] > maxv) maxv = outBars[b];
          for (int b = 0; b < bars; ++b) {
            float norm = (float)(log1pf(outBars[b]) / log1pf(maxv));
            if (norm < 0.f) norm = 0.f; else if (norm > 1.f) norm = 1.f;
            sNaayaSpectrum[b] = norm;
          }
      }
      // Effets créatifs (FX)
      if (_fx && _fx->isEnabled()) {
        _tmpLeft.resize(numFrames); _tmpRight.resize(numFrames);
        _fx->processStereo(_left.data(), _right.data(), _tmpLeft.data(), _tmpRight.data(), numFrames);
        _left.swap(_tmpLeft); _right.swap(_tmpRight);
      }
       // Sécurité audio
       if (_safety) {
        _safety->processStereo(_left.data(), _right.data(), numFrames);
        auto repL = _safety->getLastReport();
        NaayaSafety_UpdateReport(repL.peak, repL.rms, repL.dcOffset, repL.clippedSamples, repL.feedbackScore, repL.overloadActive);
       }
       _outLeft.resize(numFrames); _outRight.resize(numFrames);
      _eq->processStereo(_left.data(), _right.data(), _outLeft.data(), _outRight.data(), numFrames);
      if (isInt16) {
        int16_t* in16 = reinterpret_cast<int16_t*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          float vl = std::max(-1.0f, std::min(1.0f, _outLeft[i]));
          float vr = std::max(-1.0f, std::min(1.0f, _outRight[i]));
          in16[2*i]   = (int16_t)lrintf(vl * 32767.0f);
          in16[2*i+1] = (int16_t)lrintf(vr * 32767.0f);
        }
      } else {
        float* inF = reinterpret_cast<float*>(dataPtr);
        for (size_t i = 0; i < numFrames; ++i) {
          float vl = std::max(-1.0f, std::min(1.0f, _outLeft[i]));
          float vr = std::max(-1.0f, std::min(1.0f, _outRight[i]));
          inF[2*i]   = vl;
          inF[2*i+1] = vr;
        }
      }
      [self.audioInput appendSampleBuffer:sampleBuffer];
    }
  }
}

@end

namespace Camera {

class IOSVideoCapture final : public VideoCapture {
public:
  IOSVideoCapture() = default;
  ~IOSVideoCapture() override { cleanup(); }

protected:
  bool initializePlatform() override { return true; }

  void shutdownPlatform() override { cleanup(); }

  bool startRecordingPlatform(const VideoCaptureOptions& options) override {
    AVCaptureSession* session = NaayaGetSharedSession();
    if (!session) return false;

    // Utiliser l'enregistreur filtré (AVAssetWriter) pour unifier NR/EQ/spectre
    {
      // Préparer fichier de sortie
      std::string dir = this->getSaveDirectory();
      if (dir.empty()) { dir = "/tmp/naaya/videos"; }
      NSString* nsDir = [NSString stringWithUTF8String:dir.c_str()];
      [[NSFileManager defaultManager] createDirectoryAtPath:nsDir withIntermediateDirectories:YES attributes:nil error:nil];
      std::string ext = (options.container == "mov" ? "mov" : "mp4");
      std::string fileName = this->generateFileName(ext);
      NSString* nsPath = [nsDir stringByAppendingPathComponent:[NSString stringWithUTF8String:fileName.c_str()]];
      outputURL_ = [NSURL fileURLWithPath:nsPath];

      filteredRecorder_ = [NaayaFilteredVideoRecorder new];
      // Appliquer dimensions demandées si fournies (sinon, fallback format actif)
      if (options.width > 0 && options.height > 0) {
        filteredRecorder_.targetSize = CGSizeMake(options.width, options.height);
      }
      // Valeurs par défaut: HEVC auto + 60fps + 12Mbps si non spécifié
      NSString* codec = options.codec.empty() ? @"auto" : [NSString stringWithUTF8String:options.codec.c_str()];
      int fps = fps_ > 0 ? fps_ : 60;
      int bitrate = options.videoBitrate > 0 ? options.videoBitrate : 12 * 1000 * 1000;
      // Orientation demandée
      NSInteger forced = -1;
      if (!options.orientation.empty()) {
        std::string o = options.orientation;
        if (o == "portrait") forced = (NSInteger)AVCaptureVideoOrientationPortrait;
        else if (o == "portraitUpsideDown") forced = (NSInteger)AVCaptureVideoOrientationPortraitUpsideDown;
        else if (o == "landscapeLeft") forced = (NSInteger)AVCaptureVideoOrientationLandscapeLeft;
        else if (o == "landscapeRight") forced = (NSInteger)AVCaptureVideoOrientationLandscapeRight;
      }
      filteredRecorder_.forcedOrientation = forced;
      // Stabilisation demandée (iOS uniquement)
      NSInteger stab = -1;
      if (!options.stabilization.empty()) {
        std::string s = options.stabilization;
        #if defined(AVCaptureVideoStabilizationModeAuto)
        if (s == "off") stab = (NSInteger)AVCaptureVideoStabilizationModeOff;
        else if (s == "standard") stab = (NSInteger)AVCaptureVideoStabilizationModeStandard;
        else if (s == "cinematic") stab = (NSInteger)AVCaptureVideoStabilizationModeCinematic;
        else if (s == "auto") stab = (NSInteger)AVCaptureVideoStabilizationModeAuto;
        #endif
      }
      filteredRecorder_.stabilizationMode = stab;
      // Verrous AE/AWB/AF
      AVCaptureDeviceInput* input = NaayaGetCurrentInput();
      if (input) {
        NSError* cfgErr = nil;
        if ([input.device lockForConfiguration:&cfgErr]) {
          if (options.lockAE && [input.device isExposureModeSupported:AVCaptureExposureModeLocked]) {
            input.device.exposureMode = AVCaptureExposureModeLocked;
          }
          if (options.lockAWB && [input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeLocked]) {
            input.device.whiteBalanceMode = AVCaptureWhiteBalanceModeLocked;
          }
          if (options.lockAF && [input.device isFocusModeSupported:AVCaptureFocusModeLocked]) {
            input.device.focusMode = AVCaptureFocusModeLocked;
          }
          [input.device unlockForConfiguration];
        }
      }
      // mémoriser options d'auto-sauvegarde
      saveToPhotos_ = options.saveToPhotos;
      albumName_ = options.albumName;
      if (![filteredRecorder_ startWithSession:session outputURL:outputURL_ codec:codec fps:fps bitrate:bitrate recordAudio:options.recordAudio]) {
        filteredRecorder_ = nil; // fallback
      } else {
        startTime_ = std::chrono::steady_clock::now();
        return true;
      }
    }
    // Sortie vidéo non filtrée (fallback MovieFileOutput)
    AVCaptureMovieFileOutput* movie = NaayaGetMovieOutput();
    if (!movie) {
      movie = [[AVCaptureMovieFileOutput alloc] init];
      if ([session canAddOutput:movie]) {
        [session beginConfiguration];
        [session addOutput:movie];
        [session commitConfiguration];
        NaayaSetMovieOutput(movie);
      } else {
        return false;
      }
    }

  // Input audio optionnel (et nécessaire pour spectre MovieFileOutput)
    if (options.recordAudio) {
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
    // Brancher un AudioDataOutput pour spectre (MovieFileOutput) – NR/EQ restent sur pipeline filtré
    AVCaptureAudioDataOutput* aout = [[AVCaptureAudioDataOutput alloc] init];
    dispatch_queue_t aq = dispatch_queue_create("naaya.audio.mfo.tap", DISPATCH_QUEUE_SERIAL);
    NaayaSpectrumTap* tap = [NaayaSpectrumTap new];
    [aout setSampleBufferDelegate:tap queue:aq];
    if ([session canAddOutput:aout]) { [session beginConfiguration]; [session addOutput:aout]; [session commitConfiguration]; }
    }

    // Préparer fichier de sortie
    std::string dir = this->getSaveDirectory();
    if (dir.empty()) { dir = "/tmp/naaya/videos"; }
    NSString* nsDir = [NSString stringWithUTF8String:dir.c_str()];
    [[NSFileManager defaultManager] createDirectoryAtPath:nsDir withIntermediateDirectories:YES attributes:nil error:nil];
    std::string ext = (options.container == "mov" ? "mov" : "mp4");
    std::string fileName = this->generateFileName(ext);
    NSString* nsPath = [nsDir stringByAppendingPathComponent:[NSString stringWithUTF8String:fileName.c_str()]];
    outputURL_ = [NSURL fileURLWithPath:nsPath];

    // Dimensions/FPS courants
    AVCaptureDeviceInput* currentInput = NaayaGetCurrentInput();
    if (currentInput) {
      CMFormatDescriptionRef desc = currentInput.device.activeFormat.formatDescription;
      if (desc) {
        CMVideoDimensions dim = CMVideoFormatDescriptionGetDimensions(desc);
        width_ = (int)dim.width;
        height_ = (int)dim.height;
      }
      NSArray<AVFrameRateRange*>* ranges = currentInput.device.activeFormat.videoSupportedFrameRateRanges;
      if (ranges.count > 0) { fps_ = (int)llround(ranges.firstObject.maxFrameRate); }
    }

    // Délégué et timer progression
    movieDelegate_ = [NaayaMovieDelegate new];
    startTime_ = std::chrono::steady_clock::now();
    if (progressTimer_) { dispatch_source_cancel(progressTimer_); progressTimer_ = nil; }
    progressTimer_ = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_global_queue(QOS_CLASS_UTILITY, 0));
    if (progressTimer_) {
      dispatch_source_set_timer(progressTimer_, dispatch_time(DISPATCH_TIME_NOW, 0), (uint64_t)(0.5 * NSEC_PER_SEC), (uint64_t)(0.1 * NSEC_PER_SEC));
      __block NSURL* fileURL = outputURL_;
      dispatch_source_set_event_handler(progressTimer_, ^{
        if (!fileURL) return;
        NSDictionary* attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:fileURL.path error:nil];
        unsigned long long fsize = [[attrs objectForKey:NSFileSize] unsignedLongLongValue];
        lastSize_ = (size_t)fsize;
      });
      dispatch_resume(progressTimer_);
    }

    // Appliquer orientation/stabilisation sur la connexion si demandé
    AVCaptureConnection* mconn = [movie connectionWithMediaType:AVMediaTypeVideo];
    if (mconn) {
      if (!options.orientation.empty() && mconn.isVideoOrientationSupported) {
        std::string o = options.orientation;
        if (o == "portrait") mconn.videoOrientation = AVCaptureVideoOrientationPortrait;
        else if (o == "portraitUpsideDown") mconn.videoOrientation = AVCaptureVideoOrientationPortraitUpsideDown;
        else if (o == "landscapeLeft") mconn.videoOrientation = AVCaptureVideoOrientationLandscapeLeft;
        else if (o == "landscapeRight") mconn.videoOrientation = AVCaptureVideoOrientationLandscapeRight;
      }
      #if TARGET_OS_IOS
      if (mconn.isVideoStabilizationSupported) {
        // Mac Catalyst/macOS headers peuvent marquer ces constantes indisponibles.
        // On ne les référence que lorsqu'on compile iOS pur.
        #if TARGET_OS_IOS
        if (!options.stabilization.empty()) {
          std::string s = options.stabilization;
          if (s == "off") mconn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeOff;
          else if (s == "standard") mconn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeStandard;
          else if (s == "cinematic") mconn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeCinematic;
          else mconn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeAuto;
        } else {
          mconn.preferredVideoStabilizationMode = AVCaptureVideoStabilizationModeAuto;
        }
        #endif
      }
      #endif
    }
    // Mémoriser auto-sauvegarde
    saveToPhotos_ = options.saveToPhotos;
    albumName_ = options.albumName;
    // Démarrer l'enregistrement avec délégué
    [movie startRecordingToOutputFileURL:outputURL_ recordingDelegate:(NaayaMovieDelegate*)movieDelegate_];
    return true;
  }

  VideoResult stopRecordingPlatform() override {
    // Stop pipeline filtré si actif
    if (filteredRecorder_) {
      dispatch_semaphore_t sem = dispatch_semaphore_create(0);
      [filteredRecorder_ stopWithCompletion:^{ dispatch_semaphore_signal(sem); }];
      dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
      filteredRecorder_ = nil;
      if (outputURL_) {
        VideoResult result;
        AVURLAsset* asset = [AVURLAsset URLAssetWithURL:outputURL_ options:nil];
        double dur = CMTimeGetSeconds(asset.duration);
        result.duration = dur > 0 ? dur : 0.0;
        NSArray<AVAssetTrack*>* vtracks = [asset tracksWithMediaType:AVMediaTypeVideo];
        if (vtracks.count > 0) {
          CGSize ns = vtracks.firstObject.naturalSize;
          result.width = (int)ns.width;
          result.height = (int)ns.height;
          float rate = vtracks.firstObject.nominalFrameRate;
          result.fps = rate > 0 ? (int)llround(rate) : fps_;
        } else {
          result.width = width_;
          result.height = height_;
          result.fps = fps_;
        }
        NSDictionary* attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:outputURL_.path error:nil];
        unsigned long long fsize = [[attrs objectForKey:NSFileSize] unsignedLongLongValue];
        result.fileSize = (size_t)fsize;
        std::string suri = std::string("file://") + outputURL_.path.UTF8String;
        result.uri = suri;
        result.codec = "H264";
        // Auto-sauvegarde dans Pellicule si demandé
        if (saveToPhotos_) {
          __block BOOL savedOK = NO;
          dispatch_semaphore_t sem = dispatch_semaphore_create(0);
          [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
            PHAssetChangeRequest* req = [PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:outputURL_];
            if (!albumName_.empty()) {
              NSString* albumTitle = [NSString stringWithUTF8String:albumName_.c_str()];
              PHFetchOptions* fetchOptions = [PHFetchOptions new];
              fetchOptions.predicate = [NSPredicate predicateWithFormat:@"title = %@", albumTitle];
              PHFetchResult<PHAssetCollection*>* collections = [PHAssetCollection fetchAssetCollectionsWithType:PHAssetCollectionTypeAlbum subtype:PHAssetCollectionSubtypeAny options:fetchOptions];
              PHAssetCollection* existing = collections.firstObject;
              if (existing) {
                PHAssetCollectionChangeRequest* albReq = [PHAssetCollectionChangeRequest changeRequestForAssetCollection:existing];
                [albReq addAssets:@[[req placeholderForCreatedAsset]]];
              } else {
                PHAssetCollectionChangeRequest* createAlbum = [PHAssetCollectionChangeRequest creationRequestForAssetCollectionWithTitle:albumTitle];
                [createAlbum addAssets:@[[req placeholderForCreatedAsset]]];
              }
            }
          } completionHandler:^(BOOL success, NSError * _Nullable error) {
            (void)error; savedOK = success; dispatch_semaphore_signal(sem);
          }];
          dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
          (void)savedOK;
        }
        return result;
      }
      return VideoResult{};
    }

    AVCaptureMovieFileOutput* movie = NaayaGetMovieOutput();
    if (!movie) { return VideoResult{}; }

    NaayaMovieDelegate* delegate = (NaayaMovieDelegate*)movieDelegate_;
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    delegate.finishSem = sem;
    [movie stopRecording];
    dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);

    if (progressTimer_) { dispatch_source_cancel(progressTimer_); progressTimer_ = nil; }

    VideoResult result;
    NSURL* url = delegate.outputURL ?: outputURL_;
    if (url) {
      AVURLAsset* asset = [AVURLAsset URLAssetWithURL:url options:nil];
      double dur = CMTimeGetSeconds(asset.duration);
      result.duration = dur > 0 ? dur : 0.0;
      NSArray<AVAssetTrack*>* vtracks = [asset tracksWithMediaType:AVMediaTypeVideo];
      if (vtracks.count > 0) {
        CGSize ns = vtracks.firstObject.naturalSize;
        result.width = (int)ns.width;
        result.height = (int)ns.height;
        float rate = vtracks.firstObject.nominalFrameRate;
        result.fps = rate > 0 ? (int)llround(rate) : fps_;
      } else {
        result.width = width_;
        result.height = height_;
        result.fps = fps_;
      }
      NSDictionary* attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:url.path error:nil];
      unsigned long long fsize = [[attrs objectForKey:NSFileSize] unsignedLongLongValue];
      result.fileSize = (size_t)fsize;
      std::string suri = std::string("file://") + url.path.UTF8String;
      result.uri = suri;
      result.codec = "H264";
      // Auto-sauvegarde dans Pellicule si demandé
      if (saveToPhotos_) {
        __block BOOL savedOK = NO;
        dispatch_semaphore_t sem = dispatch_semaphore_create(0);
        [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
          PHAssetChangeRequest* req = [PHAssetChangeRequest creationRequestForAssetFromVideoAtFileURL:url];
          if (!albumName_.empty()) {
            NSString* albumTitle = [NSString stringWithUTF8String:albumName_.c_str()];
            PHFetchOptions* fetchOptions = [PHFetchOptions new];
            fetchOptions.predicate = [NSPredicate predicateWithFormat:@"title = %@", albumTitle];
            PHFetchResult<PHAssetCollection*>* collections = [PHAssetCollection fetchAssetCollectionsWithType:PHAssetCollectionTypeAlbum subtype:PHAssetCollectionSubtypeAny options:fetchOptions];
            PHAssetCollection* existing = collections.firstObject;
            if (existing) {
              PHAssetCollectionChangeRequest* albReq = [PHAssetCollectionChangeRequest changeRequestForAssetCollection:existing];
              [albReq addAssets:@[[req placeholderForCreatedAsset]]];
            } else {
              PHAssetCollectionChangeRequest* createAlbum = [PHAssetCollectionChangeRequest creationRequestForAssetCollectionWithTitle:albumTitle];
              [createAlbum addAssets:@[[req placeholderForCreatedAsset]]];
            }
          }
        } completionHandler:^(BOOL success, NSError * _Nullable error) {
          (void)error; savedOK = success; dispatch_semaphore_signal(sem);
        }];
        dispatch_semaphore_wait(sem, DISPATCH_TIME_FOREVER);
        (void)savedOK;
      }
    }
    return result;
  }

  bool pauseRecordingPlatform() override { return false; }
  bool resumeRecordingPlatform() override { return false; }
  bool cancelRecordingPlatform() override {
    AVCaptureMovieFileOutput* movie = NaayaGetMovieOutput();
    if (movie && movie.isRecording) { [movie stopRecording]; }
    if (progressTimer_) { dispatch_source_cancel(progressTimer_); progressTimer_ = nil; }
    return true;
  }

  double getCurrentDurationPlatform() const override {
    auto now = std::chrono::steady_clock::now();
    auto elapsed = now - startTime_;
    double dur = std::chrono::duration_cast<std::chrono::duration<double>>(elapsed).count();
    return dur > 0.0 ? dur : 0.0;
  }

  size_t getCurrentFileSizePlatform() const override {
    if (!outputURL_) return 0;
    NSDictionary* attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:outputURL_.path error:nil];
    unsigned long long fsize = [[attrs objectForKey:NSFileSize] unsignedLongLongValue];
    return (size_t)fsize;
  }

private:
  void cleanup() {
    if (progressTimer_) { dispatch_source_cancel(progressTimer_); progressTimer_ = nil; }
    movieDelegate_ = nil;
    outputURL_ = nil;
  }

  // État iOS
  NSURL* outputURL_ = nil;
  id movieDelegate_ = nil;
  dispatch_source_t progressTimer_ = nil;
  std::chrono::steady_clock::time_point startTime_{};
  mutable size_t lastSize_ = 0;
  int width_ = 0;
  int height_ = 0;
  int fps_ = 30;
  // Enregistreur vidéo filtré (ObjC) lorsqu'un filtre est actif
  NaayaFilteredVideoRecorder* filteredRecorder_ = nil;
  // Auto-sauvegarde (Pellicule)
  bool saveToPhotos_ = false;
  std::string albumName_;
};

std::unique_ptr<VideoCapture> createIOSVideoCapture() {
  return std::make_unique<IOSVideoCapture>();
}

} // namespace Camera


