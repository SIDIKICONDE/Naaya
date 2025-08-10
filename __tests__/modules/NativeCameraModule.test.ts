/**
 * Tests complets pour NativeCameraModule
 */
import { NativeModules } from 'react-native';
import NativeCameraModule from '../../specs/NativeCameraModule';
import {
  mockDevices,
  mockPermissionsDenied,
  mockPermissionsGranted,
  mockPermissionsPartial,
  mockPhotoCaptureOptions,
  mockPhotoResult,
  mockSupportedFormats,
  mockVideoCaptureOptions,
  mockVideoResult,
  mockWhiteBalanceGains,
  mockWhiteBalanceModes,
  mockWhiteBalanceRange,
} from '../fixtures/testData';

describe('NativeCameraModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Management', () => {
    describe('checkPermissions', () => {
      it('should return current permission status', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.checkPermissions.mockReturnValue(mockPermissionsGranted);

        const result = NativeCameraModule.checkPermissions();

        expect(mockModule.checkPermissions).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockPermissionsGranted);
      });

      it('should handle partial permissions correctly', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.checkPermissions.mockReturnValue(mockPermissionsPartial);

        const result = NativeCameraModule.checkPermissions();

        expect(result.camera).toBe('granted');
        expect(result.microphone).toBe('denied');
        expect(result.storage).toBe('granted');
      });
    });

    describe('requestPermissions', () => {
      it('should request all permissions', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.requestPermissions.mockReturnValue(mockPermissionsGranted);

        const result = NativeCameraModule.requestPermissions();

        expect(mockModule.requestPermissions).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockPermissionsGranted);
      });

      it('should handle permission denial', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.requestPermissions.mockReturnValue(mockPermissionsDenied);

        const result = NativeCameraModule.requestPermissions();

        expect(result.camera).toBe('denied');
        expect(result.microphone).toBe('denied');
        expect(result.storage).toBe('denied');
      });

      it('should retry on permission failure', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.requestPermissions
          .mockReturnValueOnce(mockPermissionsDenied)
          .mockReturnValueOnce(mockPermissionsGranted);

        const result1 = NativeCameraModule.requestPermissions();
        const result2 = NativeCameraModule.requestPermissions();

        expect(mockModule.requestPermissions).toHaveBeenCalledTimes(2);
        expect(result1).toEqual(mockPermissionsDenied);
        expect(result2).toEqual(mockPermissionsGranted);
      });
    });
  });

  describe('Device Management', () => {
    describe('getAvailableDevices', () => {
      it('should return list of available camera devices', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getAvailableDevices.mockReturnValue(mockDevices);

        const devices = NativeCameraModule.getAvailableDevices();

        expect(mockModule.getAvailableDevices).toHaveBeenCalledTimes(1);
        expect(devices).toHaveLength(2);
        expect(devices[0].position).toBe('back');
        expect(devices[1].position).toBe('front');
      });

      it('should handle no devices available', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getAvailableDevices.mockReturnValue([]);

        const devices = NativeCameraModule.getAvailableDevices();

        expect(devices).toHaveLength(0);
      });
    });

    describe('getCurrentDevice', () => {
      it('should return current active device', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getCurrentDevice.mockReturnValue(mockDevices[0]);

        const device = NativeCameraModule.getCurrentDevice();

        expect(device).toEqual(mockDevices[0]);
        expect(device?.id).toBe('back-camera');
      });

      it('should return null when no device is active', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getCurrentDevice.mockReturnValue(null);

        const device = NativeCameraModule.getCurrentDevice();

        expect(device).toBeNull();
      });
    });

    describe('selectDevice', () => {
      it('should select device by ID', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.selectDevice.mockReturnValue(true);

        const result = NativeCameraModule.selectDevice('back-camera');

        expect(mockModule.selectDevice).toHaveBeenCalledWith('back-camera');
        expect(result).toBe(true);
      });

      it('should return false for invalid device ID', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.selectDevice.mockReturnValue(false);

        const result = NativeCameraModule.selectDevice('invalid-id');

        expect(result).toBe(false);
      });
    });

    describe('switchDevice', () => {
      it('should switch between front and back cameras', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.switchDevice.mockReturnValue(true);

        const result = NativeCameraModule.switchDevice('front');

        expect(mockModule.switchDevice).toHaveBeenCalledWith('front');
        expect(result).toBe(true);
      });

      it('should handle invalid position gracefully', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.switchDevice.mockReturnValue(false);

        const result = NativeCameraModule.switchDevice('side');

        expect(result).toBe(false);
      });
    });
  });

  describe('Camera Control', () => {
    describe('startCamera', () => {
      it('should start camera with device ID', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.startCamera.mockReturnValue(true);

        const result = NativeCameraModule.startCamera('back-camera');

        expect(mockModule.startCamera).toHaveBeenCalledWith('back-camera');
        expect(result).toBe(true);
      });

      it('should handle camera start failure', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.startCamera.mockReturnValue(false);

        const result = NativeCameraModule.startCamera('back-camera');

        expect(result).toBe(false);
      });
    });

    describe('stopCamera', () => {
      it('should stop active camera', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.stopCamera.mockReturnValue(true);

        const result = NativeCameraModule.stopCamera();

        expect(mockModule.stopCamera).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });
    });

    describe('isActive', () => {
      it('should return camera active state', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.isActive.mockReturnValue(true);

        const result = NativeCameraModule.isActive();

        expect(result).toBe(true);
      });

      it('should return false when camera is inactive', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.isActive.mockReturnValue(false);

        const result = NativeCameraModule.isActive();

        expect(result).toBe(false);
      });
    });
  });

  describe('Photo Capture', () => {
    describe('capturePhoto', () => {
      it('should capture photo with default options', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.capturePhoto.mockReturnValue(mockPhotoResult);

        const result = NativeCameraModule.capturePhoto({});

        expect(mockModule.capturePhoto).toHaveBeenCalledWith({});
        expect(result.uri).toBe('file:///mock/photo.jpg');
        expect(result.width).toBe(1920);
        expect(result.height).toBe(1080);
      });

      it('should capture photo with custom options', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.capturePhoto.mockReturnValue(mockPhotoResult);

        const result = NativeCameraModule.capturePhoto(mockPhotoCaptureOptions);

        expect(mockModule.capturePhoto).toHaveBeenCalledWith(mockPhotoCaptureOptions);
        expect(result).toEqual(mockPhotoResult);
      });

      it('should include base64 when requested', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.capturePhoto.mockReturnValue(mockPhotoResult);

        const options = { ...mockPhotoCaptureOptions, base64: true };
        const result = NativeCameraModule.capturePhoto(options);

        expect(result.base64).toBeDefined();
        expect(result.base64).toBe('mockBase64String');
      });

      it('should include EXIF data when requested', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.capturePhoto.mockReturnValue(mockPhotoResult);

        const options = { ...mockPhotoCaptureOptions, exif: true };
        const result = NativeCameraModule.capturePhoto(options);

        expect(result.exif).toBeDefined();
        expect(result.exif?.Make).toBe('Mock');
      });

      it('should handle capture failure', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.capturePhoto.mockImplementation(() => {
          throw new Error('Camera not ready');
        });

        expect(() => {
          NativeCameraModule.capturePhoto({});
        }).toThrow('Camera not ready');
      });
    });
  });

  describe('Video Recording', () => {
    describe('startRecording', () => {
      it('should start video recording with options', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.startRecording.mockReturnValue(true);

        const result = NativeCameraModule.startRecording(mockVideoCaptureOptions);

        expect(mockModule.startRecording).toHaveBeenCalledWith(mockVideoCaptureOptions);
        expect(result).toBe(true);
      });

      it('should handle recording start failure', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.startRecording.mockReturnValue(false);

        const result = NativeCameraModule.startRecording(mockVideoCaptureOptions);

        expect(result).toBe(false);
      });

      it('should validate video options', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.startRecording.mockReturnValue(true);

        const options = {
          ...mockVideoCaptureOptions,
          quality: 'high',
          fps: 60,
        };

        const result = NativeCameraModule.startRecording(options);

        expect(mockModule.startRecording).toHaveBeenCalledWith(
          expect.objectContaining({
            quality: 'high',
            fps: 60,
          })
        );
        expect(result).toBe(true);
      });
    });

    describe('stopRecording', () => {
      it('should stop recording and return video result', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.stopRecording.mockReturnValue(mockVideoResult);

        const result = NativeCameraModule.stopRecording();

        expect(mockModule.stopRecording).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockVideoResult);
        expect(result.duration).toBe(10.5);
      });

      it('should handle stop when not recording', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.stopRecording.mockImplementation(() => {
          throw new Error('Not recording');
        });

        expect(() => {
          NativeCameraModule.stopRecording();
        }).toThrow('Not recording');
      });
    });

    describe('isRecording', () => {
      it('should return recording state', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.isRecording.mockReturnValue(true);

        const result = NativeCameraModule.isRecording();

        expect(result).toBe(true);
      });
    });

    describe('getRecordingProgress', () => {
      it('should return recording progress', () => {
        const mockModule = NativeModules.NativeCameraModule;
        const mockProgress = { duration: 5.5, size: 524288 };
        mockModule.getRecordingProgress.mockReturnValue(mockProgress);

        const result = NativeCameraModule.getRecordingProgress();

        expect(result).toEqual(mockProgress);
        expect(result.duration).toBe(5.5);
        expect(result.size).toBe(524288);
      });
    });
  });

  describe('Flash Control', () => {
    describe('hasFlash', () => {
      it('should return flash availability', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.hasFlash.mockReturnValue(true);

        const result = NativeCameraModule.hasFlash();

        expect(result).toBe(true);
      });
    });

    describe('setFlashMode', () => {
      it('should set flash mode', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setFlashMode.mockReturnValue(true);

        const result = NativeCameraModule.setFlashMode('on');

        expect(mockModule.setFlashMode).toHaveBeenCalledWith('on');
        expect(result).toBe(true);
      });

      it('should handle invalid flash mode', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setFlashMode.mockReturnValue(false);

        const result = NativeCameraModule.setFlashMode('invalid');

        expect(result).toBe(false);
      });
    });

    describe('setTorchMode', () => {
      it('should enable/disable torch', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setTorchMode.mockReturnValue(true);

        const result = NativeCameraModule.setTorchMode(true);

        expect(mockModule.setTorchMode).toHaveBeenCalledWith(true);
        expect(result).toBe(true);
      });
    });
  });

  describe('Zoom Control', () => {
    describe('zoom range', () => {
      it('should get min zoom level', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getMinZoom.mockReturnValue(1.0);

        const result = NativeCameraModule.getMinZoom();

        expect(result).toBe(1.0);
      });

      it('should get max zoom level', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getMaxZoom.mockReturnValue(10.0);

        const result = NativeCameraModule.getMaxZoom();

        expect(result).toBe(10.0);
      });
    });

    describe('setZoom', () => {
      it('should set zoom level within range', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setZoom.mockReturnValue(true);

        const result = NativeCameraModule.setZoom(2.5);

        expect(mockModule.setZoom).toHaveBeenCalledWith(2.5);
        expect(result).toBe(true);
      });

      it('should reject zoom level outside range', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setZoom.mockReturnValue(false);

        const result = NativeCameraModule.setZoom(100);

        expect(result).toBe(false);
      });

      it('should handle smooth zoom transitions', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setZoom.mockReturnValue(true);

        const zoomLevels = [1.0, 1.5, 2.0, 2.5, 3.0];
        zoomLevels.forEach(level => {
          const result = NativeCameraModule.setZoom(level);
          expect(result).toBe(true);
        });

        expect(mockModule.setZoom).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('White Balance Control', () => {
    describe('white balance modes', () => {
      it('should get current white balance mode', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getWhiteBalanceMode.mockReturnValue('auto');

        const result = NativeCameraModule.getWhiteBalanceMode();

        expect(result).toBe('auto');
      });

      it('should set white balance mode', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setWhiteBalanceMode.mockReturnValue(true);

        const result = NativeCameraModule.setWhiteBalanceMode('daylight');

        expect(mockModule.setWhiteBalanceMode).toHaveBeenCalledWith('daylight');
        expect(result).toBe(true);
      });

      it('should get supported white balance modes', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getSupportedWhiteBalanceModes.mockReturnValue(mockWhiteBalanceModes);

        const result = NativeCameraModule.getSupportedWhiteBalanceModes();

        expect(result).toEqual(mockWhiteBalanceModes);
        expect(result).toContain('auto');
        expect(result).toContain('manual');
      });
    });

    describe('white balance temperature', () => {
      it('should get white balance temperature', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getWhiteBalanceTemperature.mockReturnValue(5500);

        const result = NativeCameraModule.getWhiteBalanceTemperature();

        expect(result).toBe(5500);
      });

      it('should set white balance temperature', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setWhiteBalanceTemperature.mockReturnValue(true);

        const result = NativeCameraModule.setWhiteBalanceTemperature(6000);

        expect(mockModule.setWhiteBalanceTemperature).toHaveBeenCalledWith(6000);
        expect(result).toBe(true);
      });

      it('should get temperature range', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getWhiteBalanceTemperatureRange.mockReturnValue(mockWhiteBalanceRange);

        const result = NativeCameraModule.getWhiteBalanceTemperatureRange();

        expect(result.min).toBe(2000);
        expect(result.max).toBe(8000);
      });

      it('should validate temperature within range', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setWhiteBalanceTemperature.mockReturnValue(false);

        const result = NativeCameraModule.setWhiteBalanceTemperature(10000);

        expect(result).toBe(false);
      });
    });

    describe('white balance tint', () => {
      it('should get white balance tint', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getWhiteBalanceTint.mockReturnValue(0.5);

        const result = NativeCameraModule.getWhiteBalanceTint();

        expect(result).toBe(0.5);
      });

      it('should set white balance tint', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setWhiteBalanceTint.mockReturnValue(true);

        const result = NativeCameraModule.setWhiteBalanceTint(-0.3);

        expect(mockModule.setWhiteBalanceTint).toHaveBeenCalledWith(-0.3);
        expect(result).toBe(true);
      });
    });

    describe('white balance gains', () => {
      it('should get white balance gains', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getWhiteBalanceGains.mockReturnValue(mockWhiteBalanceGains);

        const result = NativeCameraModule.getWhiteBalanceGains();

        expect(result).toEqual(mockWhiteBalanceGains);
        expect(result.red).toBe(1.2);
        expect(result.green).toBe(1.0);
        expect(result.blue).toBe(0.8);
      });

      it('should set white balance gains', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.setWhiteBalanceGains.mockReturnValue(true);

        const result = NativeCameraModule.setWhiteBalanceGains(1.5, 1.0, 0.7);

        expect(mockModule.setWhiteBalanceGains).toHaveBeenCalledWith(1.5, 1.0, 0.7);
        expect(result).toBe(true);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getPreviewSize', () => {
      it('should return preview dimensions', () => {
        const mockModule = NativeModules.NativeCameraModule;
        const mockSize = { width: 1920, height: 1080 };
        mockModule.getPreviewSize.mockReturnValue(mockSize);

        const result = NativeCameraModule.getPreviewSize();

        expect(result).toEqual(mockSize);
      });
    });

    describe('getSupportedFormats', () => {
      it('should return supported formats for device', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getSupportedFormats.mockReturnValue(mockSupportedFormats);

        const result = NativeCameraModule.getSupportedFormats('back-camera');

        expect(mockModule.getSupportedFormats).toHaveBeenCalledWith('back-camera');
        expect(result).toEqual(mockSupportedFormats);
        expect(result).toHaveLength(5);
      });

      it('should filter formats by resolution', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getSupportedFormats.mockReturnValue(mockSupportedFormats);

        const formats = NativeCameraModule.getSupportedFormats('back-camera');
        const hdFormats = formats.filter(f => f.width >= 1920 && f.height >= 1080);

        expect(hdFormats).toHaveLength(3);
      });

      it('should filter formats by frame rate', () => {
        const mockModule = NativeModules.NativeCameraModule;
        mockModule.getSupportedFormats.mockReturnValue(mockSupportedFormats);

        const formats = NativeCameraModule.getSupportedFormats('back-camera');
        const highFpsFormats = formats.filter(f => f.fps >= 60);

        expect(highFpsFormats).toHaveLength(1);
        expect(highFpsFormats[0].fps).toBe(60);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle module not available', () => {
      const originalModule = NativeModules.NativeCameraModule;
      NativeModules.NativeCameraModule = undefined;

      expect(() => {
        NativeCameraModule.startCamera('back-camera');
      }).toThrow();

      NativeModules.NativeCameraModule = originalModule;
    });

    it('should handle concurrent operations', () => {
      const mockModule = NativeModules.NativeCameraModule;
      mockModule.capturePhoto.mockReturnValue(mockPhotoResult);
      mockModule.startRecording.mockReturnValue(true);

      const photoPromise = NativeCameraModule.capturePhoto({});
      const videoPromise = NativeCameraModule.startRecording(mockVideoCaptureOptions);

      expect(photoPromise).toEqual(mockPhotoResult);
      expect(videoPromise).toBe(true);
    });

    it('should handle rapid state changes', () => {
      const mockModule = NativeModules.NativeCameraModule;
      mockModule.startCamera.mockReturnValue(true);
      mockModule.stopCamera.mockReturnValue(true);

      for (let i = 0; i < 10; i++) {
        NativeCameraModule.startCamera('back-camera');
        NativeCameraModule.stopCamera();
      }

      expect(mockModule.startCamera).toHaveBeenCalledTimes(10);
      expect(mockModule.stopCamera).toHaveBeenCalledTimes(10);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency capture requests', () => {
      const mockModule = NativeModules.NativeCameraModule;
      mockModule.capturePhoto.mockReturnValue(mockPhotoResult);

      const startTime = Date.now();
      const captures = [];

      for (let i = 0; i < 100; i++) {
        captures.push(NativeCameraModule.capturePhoto({}));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(captures).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle memory-intensive operations', () => {
      const mockModule = NativeModules.NativeCameraModule;
      const largePhotoResult = {
        ...mockPhotoResult,
        base64: 'x'.repeat(10 * 1024 * 1024), // 10MB string
      };
      mockModule.capturePhoto.mockReturnValue(largePhotoResult);

      const result = NativeCameraModule.capturePhoto({ base64: true });

      expect(result.base64).toHaveLength(10 * 1024 * 1024);
    });
  });
});
