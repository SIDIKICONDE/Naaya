#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <CoreVideo/CoreVideo.h>
#import <AudioToolbox/AudioToolbox.h>

#include "VideoCaptureIOS.h"
#import "CameraSessionBridge.h"
#include <math.h>
#include <chrono>
#include "../../shared/Audio/core/AudioEqualizer.h"
#include <vector>

// API C filtres exposée par le runtime C++
#ifdef __cplusplus
extern "C" {
#endif
bool NaayaFilters_HasFilter(void);
const char* NaayaFilters_GetCurrentName(void);
double NaayaFilters_GetCurrentIntensity(void);
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wstrict-prototypes"
bool NaayaEQ_IsEnabled(void);
double NaayaEQ_GetMasterGainDB(void);
size_t NaayaEQ_CopyBandGains(double* out, size_t maxCount);
size_t NaayaEQ_GetNumBands(void);
bool NaayaEQ_HasPendingUpdate(void);
void NaayaEQ_ClearPendingUpdate(void);
#pragma clang diagnostic pop
#ifdef __cplusplus
}
#endif

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

// Enregistreur AVAssetWriter avec pipeline CoreImage (vidéo uniquement)
@interface NaayaFilteredVideoRecorder : NSObject <AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate> {
  std::unique_ptr<AudioEqualizer::AudioEqualizer> _eq;
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

  // Appliquer filtre CoreImage
  CIImage* inImg = [CIImage imageWithCVPixelBuffer:pb];
  if (!inImg) return;
  CIImage* outImg = inImg;
  if (NaayaFilters_HasFilter()) {
    NSString* name = NaayaFilters_GetCurrentName() ? [NSString stringWithUTF8String:NaayaFilters_GetCurrentName()] : @"";
    double intensity = NaayaFilters_GetCurrentIntensity();
    if ([name isEqualToString:@"sepia"]) {
      CIFilter* f = [CIFilter filterWithName:@"CISepiaTone"]; [f setValue:inImg forKey:kCIInputImageKey]; [f setValue:@(MAX(0, MIN(1, intensity))) forKey:kCIInputIntensityKey]; outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"noir"]) {
      CIFilter* f = [CIFilter filterWithName:@"CIPhotoEffectNoir"]; [f setValue:inImg forKey:kCIInputImageKey]; outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"monochrome"]) {
      CIFilter* f = [CIFilter filterWithName:@"CIColorMonochrome"]; [f setValue:inImg forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputIntensity"]; outImg = f.outputImage ?: inImg;
    } else if ([name isEqualToString:@"color_controls"]) {
      CIFilter* f = [CIFilter filterWithName:@"CIColorControls"]; [f setValue:inImg forKey:kCIInputImageKey]; [f setValue:@(1.0) forKey:@"inputSaturation"]; [f setValue:@(intensity * 0.2) forKey:@"inputBrightness"]; [f setValue:@(1.0 + intensity * 0.5) forKey:@"inputContrast"]; outImg = f.outputImage ?: inImg;
    }
  }

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

    CMBlockBufferRef dataBuf = CMSampleBufferGetDataBuffer(sampleBuffer);
    if (!dataBuf) { [self.audioInput appendSampleBuffer:sampleBuffer]; return; }
    size_t totalLength = 0; size_t lenAtOffset = 0; char* dataPtr = nullptr;
    if (CMBlockBufferGetDataPointer(dataBuf, 0, &lenAtOffset, &totalLength, &dataPtr) != kCMBlockBufferNoErr || !dataPtr || totalLength == 0) {
      [self.audioInput appendSampleBuffer:sampleBuffer];
      return;
    }

    size_t numFrames = (size_t)CMSampleBufferGetNumSamples(sampleBuffer);
    // Gérer 16-bit PCM interleaved
    bool isPCM = (asbd->mFormatID == kAudioFormatLinearPCM);
    bool isInt16 = isPCM && asbd->mBitsPerChannel == 16;
    bool isPacked = (asbd->mFormatFlags & kAudioFormatFlagIsPacked) != 0;
    bool isSignedInt = (asbd->mFormatFlags & kAudioFormatFlagIsSignedInteger) != 0;
    if (!isInt16 || !isPacked || !isSignedInt || channels < 1 || channels > 2) {
      // Fallback: pas supporté → append brut
      [self.audioInput appendSampleBuffer:sampleBuffer];
      return;
    }

    // Convertir → float, traiter, reconvertir
    if (channels == 1) {
      std::vector<float> mono(numFrames);
      int16_t* in = reinterpret_cast<int16_t*>(dataPtr);
      for (size_t i = 0; i < numFrames; ++i) mono[i] = (float)in[i] / 32768.0f;
      std::vector<float> out(mono.size());
      _eq->process(mono.data(), out.data(), numFrames);
      for (size_t i = 0; i < numFrames; ++i) {
        float v = std::max(-1.0f, std::min(1.0f, out[i]));
        in[i] = (int16_t)lrintf(v * 32767.0f);
      }
      [self.audioInput appendSampleBuffer:sampleBuffer];
    } else {
      // stéréo interleaved LR LR ...
      std::vector<float> left(numFrames), right(numFrames);
      int16_t* in = reinterpret_cast<int16_t*>(dataPtr);
      for (size_t i = 0; i < numFrames; ++i) {
        left[i] = (float)in[2*i] / 32768.0f;
        right[i] = (float)in[2*i+1] / 32768.0f;
      }
      std::vector<float> outL(numFrames), outR(numFrames);
      _eq->processStereo(left.data(), right.data(), outL.data(), outR.data(), numFrames);
      for (size_t i = 0; i < numFrames; ++i) {
        float vl = std::max(-1.0f, std::min(1.0f, outL[i]));
        float vr = std::max(-1.0f, std::min(1.0f, outR[i]));
        in[2*i]   = (int16_t)lrintf(vl * 32767.0f);
        in[2*i+1] = (int16_t)lrintf(vr * 32767.0f);
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

    // Si un filtre est actif, utiliser l'enregistreur filtré (AVAssetWriter)
    if (NaayaFilters_HasFilter()) {
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
      // Valeurs par défaut: HEVC auto + 60fps + 12Mbps si non spécifié
      NSString* codec = options.codec.empty() ? @"auto" : [NSString stringWithUTF8String:options.codec.c_str()];
      int fps = fps_ > 0 ? fps_ : 60;
      int bitrate = options.videoBitrate > 0 ? options.videoBitrate : 12 * 1000 * 1000;
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

    // Input audio optionnel
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
};

std::unique_ptr<VideoCapture> createIOSVideoCapture() {
  return std::make_unique<IOSVideoCapture>();
}

} // namespace Camera


