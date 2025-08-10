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

// Ajout: gestion globale simple du mode flash
static int s_flashMode = 0; // 0=off, 1=on, 2=auto, 3=torch

// État global de la balance des blancs
static NSString* s_wbMode = @"auto";
static double s_wbTemperature = 6500.0;
static double s_wbTint = 0.0;
static double s_wbGainRed = 1.0;
static double s_wbGainGreen = 1.0;
static double s_wbGainBlue = 1.0;

#ifdef __cplusplus
extern "C" {
#endif

int NaayaGetFlashMode(void) { return s_flashMode; }
void NaayaSetFlashMode(int mode) { s_flashMode = mode; }

// Implémentations balance des blancs iOS
void NaayaSetWhiteBalanceMode(const char* mode) {
    s_wbMode = mode ? [NSString stringWithUTF8String:mode] : @"auto";
    
    AVCaptureDeviceInput* input = NaayaGetCurrentInput();
    if (!input || !input.device) return;
    
    NSError* error = nil;
    if (![input.device lockForConfiguration:&error]) return;
    
    if ([s_wbMode isEqualToString:@"locked"]) {
        if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeLocked]) {
            input.device.whiteBalanceMode = AVCaptureWhiteBalanceModeLocked;
        }
    } else if ([s_wbMode isEqualToString:@"auto"]) {
        if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeAutoWhiteBalance]) {
            input.device.whiteBalanceMode = AVCaptureWhiteBalanceModeAutoWhiteBalance;
        }
    } else if ([s_wbMode isEqualToString:@"continuous"]) {
        if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeContinuousAutoWhiteBalance]) {
            input.device.whiteBalanceMode = AVCaptureWhiteBalanceModeContinuousAutoWhiteBalance;
        }
    }
    
    [input.device unlockForConfiguration];
}

void NaayaSetWhiteBalanceTemperature(double kelvin) {
    s_wbTemperature = kelvin;
    
    AVCaptureDeviceInput* input = NaayaGetCurrentInput();
    if (!input || !input.device) return;
    
    NSError* error = nil;
    if (![input.device lockForConfiguration:&error]) return;
    
    if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeLocked]) {
        // Conversion Kelvin vers gains RGB (approximation)
        AVCaptureWhiteBalanceTemperatureAndTintValues tempTint = {
            .temperature = (float)kelvin,
            .tint = (float)s_wbTint
        };
        AVCaptureWhiteBalanceGains gains = [input.device deviceWhiteBalanceGainsForTemperatureAndTintValues:tempTint];
        if (gains.redGain >= 1.0 && gains.greenGain >= 1.0 && gains.blueGain >= 1.0) {
            [input.device setWhiteBalanceModeLockedWithDeviceWhiteBalanceGains:gains completionHandler:nil];
            s_wbGainRed = gains.redGain;
            s_wbGainGreen = gains.greenGain;
            s_wbGainBlue = gains.blueGain;
        }
    }
    
    [input.device unlockForConfiguration];
}

void NaayaSetWhiteBalanceTint(double tint) {
    s_wbTint = tint;
    
    AVCaptureDeviceInput* input = NaayaGetCurrentInput();
    if (!input || !input.device) return;
    
    NSError* error = nil;
    if (![input.device lockForConfiguration:&error]) return;
    
    if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeLocked]) {
        AVCaptureWhiteBalanceTemperatureAndTintValues tempTint = {
            .temperature = (float)s_wbTemperature,
            .tint = (float)tint
        };
        AVCaptureWhiteBalanceGains gains = [input.device deviceWhiteBalanceGainsForTemperatureAndTintValues:tempTint];
        if (gains.redGain >= 1.0 && gains.greenGain >= 1.0 && gains.blueGain >= 1.0) {
            [input.device setWhiteBalanceModeLockedWithDeviceWhiteBalanceGains:gains completionHandler:nil];
            s_wbGainRed = gains.redGain;
            s_wbGainGreen = gains.greenGain;
            s_wbGainBlue = gains.blueGain;
        }
    }
    
    [input.device unlockForConfiguration];
}

void NaayaSetWhiteBalanceGains(double red, double green, double blue) {
    s_wbGainRed = red;
    s_wbGainGreen = green;
    s_wbGainBlue = blue;
    
    AVCaptureDeviceInput* input = NaayaGetCurrentInput();
    if (!input || !input.device) return;
    
    NSError* error = nil;
    if (![input.device lockForConfiguration:&error]) return;
    
    if ([input.device isWhiteBalanceModeSupported:AVCaptureWhiteBalanceModeLocked]) {
        AVCaptureWhiteBalanceGains gains = {
            .redGain = (float)red,
            .greenGain = (float)green,
            .blueGain = (float)blue
        };
        [input.device setWhiteBalanceModeLockedWithDeviceWhiteBalanceGains:gains completionHandler:nil];
    }
    
    [input.device unlockForConfiguration];
}

const char* NaayaGetWhiteBalanceMode(void) {
    return [s_wbMode UTF8String];
}

double NaayaGetWhiteBalanceTemperature(void) {
    return s_wbTemperature;
}

double NaayaGetWhiteBalanceTint(void) {
    return s_wbTint;
}

void NaayaGetWhiteBalanceGains(double* red, double* green, double* blue) {
    if (red) *red = s_wbGainRed;
    if (green) *green = s_wbGainGreen;
    if (blue) *blue = s_wbGainBlue;
}

const char** NaayaGetSupportedWhiteBalanceModes(int* count) {
    static const char* modes[] = {"auto", "continuous", "locked"};
    if (count) *count = 3;
    return modes;
}

void NaayaGetWhiteBalanceTemperatureRange(double* min, double* max) {
    if (min) *min = 2500.0;
    if (max) *max = 8000.0;
}

#ifdef __cplusplus
}
#endif


