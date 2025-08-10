/**
 * Tests d'intégration entre les turbomodules
 */
import { NativeModules } from 'react-native';
import NativeCameraModule from '../../specs/NativeCameraModule';
import NativeCameraFiltersModule from '../../specs/NativeCameraFiltersModule';
import NativeAudioEqualizerModule from '../../specs/NativeAudioEqualizerModule';
import {
  mockDevices,
  mockPermissionsGranted,
  mockPhotoResult,
  mockVideoResult,
  mockPhotoCaptureOptions,
  mockVideoCaptureOptions,
  mockFilterState,
  mockAdvancedFilterParams,
} from '../fixtures/testData';

describe('Modules Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Camera + Filters Integration', () => {
    it('should apply filter before capturing photo', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      // Setup mocks
      cameraModule.startCamera.mockReturnValue(true);
      cameraModule.isActive.mockReturnValue(true);
      filtersModule.setFilter.mockReturnValue(true);
      cameraModule.capturePhoto.mockReturnValue(mockPhotoResult);

      // Start camera
      expect(NativeCameraModule.startCamera('back-camera')).toBe(true);
      
      // Apply filter
      expect(NativeCameraFiltersModule.setFilter('vintage', 0.8)).toBe(true);
      
      // Capture photo with filter
      const photo = NativeCameraModule.capturePhoto(mockPhotoCaptureOptions);
      
      expect(photo).toEqual(mockPhotoResult);
      expect(cameraModule.startCamera).toHaveBeenCalledTimes(1);
      expect(filtersModule.setFilter).toHaveBeenCalledTimes(1);
      expect(cameraModule.capturePhoto).toHaveBeenCalledTimes(1);
    });

    it('should apply advanced filter parameters before video recording', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      // Setup mocks
      cameraModule.startCamera.mockReturnValue(true);
      filtersModule.setFilterWithParams.mockReturnValue(true);
      cameraModule.startRecording.mockReturnValue(true);
      cameraModule.stopRecording.mockReturnValue(mockVideoResult);

      // Start camera
      NativeCameraModule.startCamera('back-camera');
      
      // Apply advanced filter
      NativeCameraFiltersModule.setFilterWithParams(
        'cinematic',
        0.9,
        mockAdvancedFilterParams
      );
      
      // Start recording with filter
      NativeCameraModule.startRecording(mockVideoCaptureOptions);
      
      // Stop recording
      const video = NativeCameraModule.stopRecording();
      
      expect(video).toEqual(mockVideoResult);
      expect(filtersModule.setFilterWithParams).toHaveBeenCalledWith(
        'cinematic',
        0.9,
        mockAdvancedFilterParams
      );
    });

    it('should switch filters during camera session', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      cameraModule.isActive.mockReturnValue(true);
      filtersModule.setFilter.mockReturnValue(true);
      filtersModule.clearFilter.mockReturnValue(true);

      // Camera is active
      expect(NativeCameraModule.isActive()).toBe(true);
      
      // Apply multiple filters in sequence
      const filters = ['vintage', 'sepia', 'blackwhite'];
      filters.forEach(filter => {
        expect(NativeCameraFiltersModule.setFilter(filter, 0.7)).toBe(true);
      });
      
      // Clear filter
      expect(NativeCameraFiltersModule.clearFilter()).toBe(true);
      
      expect(filtersModule.setFilter).toHaveBeenCalledTimes(3);
      expect(filtersModule.clearFilter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Camera + Audio Integration', () => {
    it('should configure audio before video recording', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks
      cameraModule.startCamera.mockReturnValue(true);
      audioModule.setEQEnabled.mockReturnValue(undefined);
      audioModule.nrSetEnabled.mockReturnValue(undefined);
      cameraModule.startRecording.mockReturnValue(true);

      // Start camera
      NativeCameraModule.startCamera('back-camera');
      
      // Configure audio processing
      NativeAudioEqualizerModule.setEQEnabled(true);
      NativeAudioEqualizerModule.setPreset('Vocal');
      NativeAudioEqualizerModule.nrSetEnabled(true);
      
      // Start recording with audio processing
      const options = { ...mockVideoCaptureOptions, recordAudio: true };
      NativeCameraModule.startRecording(options);
      
      expect(audioModule.setEQEnabled).toHaveBeenCalledWith(true);
      expect(audioModule.nrSetEnabled).toHaveBeenCalledWith(true);
      expect(cameraModule.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ recordAudio: true })
      );
    });

    it('should monitor audio levels during recording', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks
      cameraModule.isRecording.mockReturnValue(true);
      audioModule.startSpectrumAnalysis.mockReturnValue(undefined);
      audioModule.getSpectrumData.mockReturnValue([0.5, 0.6, 0.7, 0.4, 0.3]);
      audioModule.stopSpectrumAnalysis.mockReturnValue(undefined);

      // Start spectrum analysis during recording
      if (NativeCameraModule.isRecording()) {
        NativeAudioEqualizerModule.startSpectrumAnalysis();
        
        // Poll spectrum data
        const spectrumData = NativeAudioEqualizerModule.getSpectrumData();
        expect(spectrumData).toHaveLength(5);
        
        // Stop analysis
        NativeAudioEqualizerModule.stopSpectrumAnalysis();
      }
      
      expect(audioModule.startSpectrumAnalysis).toHaveBeenCalledTimes(1);
      expect(audioModule.getSpectrumData).toHaveBeenCalledTimes(1);
      expect(audioModule.stopSpectrumAnalysis).toHaveBeenCalledTimes(1);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should execute complete photo capture pipeline', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      // Setup all mocks
      cameraModule.checkPermissions.mockReturnValue(mockPermissionsGranted);
      cameraModule.getAvailableDevices.mockReturnValue(mockDevices);
      cameraModule.selectDevice.mockReturnValue(true);
      cameraModule.startCamera.mockReturnValue(true);
      cameraModule.setFlashMode.mockReturnValue(true);
      cameraModule.setZoom.mockReturnValue(true);
      filtersModule.setFilter.mockReturnValue(true);
      cameraModule.capturePhoto.mockReturnValue(mockPhotoResult);
      cameraModule.stopCamera.mockReturnValue(true);

      // Complete pipeline
      // 1. Check permissions
      const permissions = NativeCameraModule.checkPermissions();
      expect(permissions.camera).toBe('granted');
      
      // 2. Get devices
      const devices = NativeCameraModule.getAvailableDevices();
      expect(devices).toHaveLength(2);
      
      // 3. Select device
      NativeCameraModule.selectDevice(devices[0].id);
      
      // 4. Start camera
      NativeCameraModule.startCamera(devices[0].id);
      
      // 5. Configure camera
      NativeCameraModule.setFlashMode('auto');
      NativeCameraModule.setZoom(2.0);
      
      // 6. Apply filter
      NativeCameraFiltersModule.setFilter('vintage', 0.7);
      
      // 7. Capture photo
      const photo = NativeCameraModule.capturePhoto(mockPhotoCaptureOptions);
      expect(photo.uri).toBeDefined();
      
      // 8. Stop camera
      NativeCameraModule.stopCamera();
      
      // Verify call order
      expect(cameraModule.checkPermissions).toHaveBeenCalledBefore(
        cameraModule.getAvailableDevices as jest.Mock
      );
      expect(cameraModule.startCamera).toHaveBeenCalledBefore(
        cameraModule.capturePhoto as jest.Mock
      );
    });

    it('should execute complete video recording pipeline with audio', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup all mocks
      cameraModule.requestPermissions.mockReturnValue(mockPermissionsGranted);
      cameraModule.startCamera.mockReturnValue(true);
      filtersModule.setFilterWithParams.mockReturnValue(true);
      audioModule.setEQEnabled.mockReturnValue(undefined);
      audioModule.nrSetEnabled.mockReturnValue(undefined);
      audioModule.safetySetConfig.mockReturnValue(undefined);
      cameraModule.startRecording.mockReturnValue(true);
      cameraModule.getRecordingProgress.mockReturnValue({ duration: 5, size: 500000 });
      cameraModule.stopRecording.mockReturnValue(mockVideoResult);

      // Complete pipeline
      // 1. Request permissions
      NativeCameraModule.requestPermissions();
      
      // 2. Start camera
      NativeCameraModule.startCamera('back-camera');
      
      // 3. Configure video filters
      NativeCameraFiltersModule.setFilterWithParams(
        'cinematic',
        0.8,
        mockAdvancedFilterParams
      );
      
      // 4. Configure audio
      NativeAudioEqualizerModule.setEQEnabled(true);
      NativeAudioEqualizerModule.nrSetEnabled(true);
      NativeAudioEqualizerModule.safetySetConfig(
        true, true, 0.002, true, -1, true, 6, true, 0.95
      );
      
      // 5. Start recording
      NativeCameraModule.startRecording(mockVideoCaptureOptions);
      
      // 6. Check progress
      const progress = NativeCameraModule.getRecordingProgress();
      expect(progress.duration).toBeGreaterThan(0);
      
      // 7. Stop recording
      const video = NativeCameraModule.stopRecording();
      expect(video.uri).toBeDefined();
      expect(video.duration).toBeGreaterThan(0);
      
      // Verify audio was configured before recording
      expect(audioModule.setEQEnabled).toHaveBeenCalledBefore(
        cameraModule.startRecording as jest.Mock
      );
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle camera failure with filter active', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      // Setup mocks
      cameraModule.startCamera.mockReturnValue(false);
      filtersModule.clearFilter.mockReturnValue(true);

      // Try to start camera (fails)
      const cameraStarted = NativeCameraModule.startCamera('invalid-device');
      expect(cameraStarted).toBe(false);
      
      // Clean up filter state
      NativeCameraFiltersModule.clearFilter();
      
      expect(filtersModule.clearFilter).toHaveBeenCalledTimes(1);
    });

    it('should handle recording failure with audio processing', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks
      cameraModule.startRecording.mockReturnValue(false);
      audioModule.setEQEnabled.mockReturnValue(undefined);
      audioModule.stopSpectrumAnalysis.mockReturnValue(undefined);

      // Enable audio processing
      NativeAudioEqualizerModule.setEQEnabled(true);
      NativeAudioEqualizerModule.startSpectrumAnalysis();
      
      // Try to start recording (fails)
      const recordingStarted = NativeCameraModule.startRecording(mockVideoCaptureOptions);
      expect(recordingStarted).toBe(false);
      
      // Clean up audio state
      NativeAudioEqualizerModule.stopSpectrumAnalysis();
      NativeAudioEqualizerModule.setEQEnabled(false);
      
      expect(audioModule.stopSpectrumAnalysis).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid filter changes during recording', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;

      // Setup mocks
      cameraModule.isRecording.mockReturnValue(true);
      filtersModule.setFilter.mockReturnValue(true);

      const filters = ['vintage', 'sepia', 'cool', 'warm', 'none'];
      const startTime = Date.now();
      
      // Rapid filter switching during recording
      for (let i = 0; i < 50; i++) {
        const filter = filters[i % filters.length];
        NativeCameraFiltersModule.setFilter(filter, 0.5 + (i % 5) * 0.1);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(filtersModule.setFilter).toHaveBeenCalledTimes(50);
      expect(duration).toBeLessThan(500); // Should be fast
    });

    it('should handle concurrent audio and filter updates', () => {
      const filtersModule = NativeModules.NativeCameraFiltersModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks
      filtersModule.setFilterWithParams.mockReturnValue(true);
      audioModule.setBandGain.mockReturnValue(undefined);

      const startTime = Date.now();
      
      // Concurrent updates
      for (let i = 0; i < 20; i++) {
        // Update filter
        const filterParams = {
          brightness: Math.random() * 2 - 1,
          contrast: Math.random() * 2,
          saturation: Math.random() * 2,
        };
        NativeCameraFiltersModule.setFilterWithParams('custom', 1, filterParams as any);
        
        // Update audio EQ
        for (let band = 0; band < 10; band++) {
          NativeAudioEqualizerModule.setBandGain(band, Math.random() * 12 - 6);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(filtersModule.setFilterWithParams).toHaveBeenCalledTimes(20);
      expect(audioModule.setBandGain).toHaveBeenCalledTimes(200);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across modules', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks for state queries
      cameraModule.isActive.mockReturnValue(true);
      cameraModule.isRecording.mockReturnValue(false);
      filtersModule.getFilter.mockReturnValue(mockFilterState);
      audioModule.getEQEnabled.mockReturnValue(true);
      audioModule.getCurrentPreset.mockReturnValue('Rock');

      // Query state across all modules
      const cameraActive = NativeCameraModule.isActive();
      const recording = NativeCameraModule.isRecording();
      const currentFilter = NativeCameraFiltersModule.getFilter();
      const eqEnabled = NativeAudioEqualizerModule.getEQEnabled();
      const eqPreset = NativeAudioEqualizerModule.getCurrentPreset();

      // Verify state consistency
      expect(cameraActive).toBe(true);
      expect(recording).toBe(false);
      expect(currentFilter).toEqual(mockFilterState);
      expect(eqEnabled).toBe(true);
      expect(eqPreset).toBe('Rock');

      // State should be queryable multiple times
      expect(NativeCameraModule.isActive()).toBe(cameraActive);
      expect(NativeCameraFiltersModule.getFilter()).toEqual(currentFilter);
      expect(NativeAudioEqualizerModule.getEQEnabled()).toBe(eqEnabled);
    });

    it('should handle module cleanup in correct order', () => {
      const cameraModule = NativeModules.NativeCameraModule;
      const filtersModule = NativeModules.NativeCameraFiltersModule;
      const audioModule = NativeModules.NativeAudioEqualizerModule;

      // Setup mocks
      cameraModule.stopRecording.mockReturnValue(mockVideoResult);
      cameraModule.stopCamera.mockReturnValue(true);
      filtersModule.clearFilter.mockReturnValue(true);
      audioModule.setEQEnabled.mockReturnValue(undefined);
      audioModule.stopSpectrumAnalysis.mockReturnValue(undefined);

      // Cleanup in correct order
      // 1. Stop recording first
      if (cameraModule.isRecording?.()) {
        NativeCameraModule.stopRecording();
      }
      
      // 2. Stop audio analysis
      NativeAudioEqualizerModule.stopSpectrumAnalysis();
      
      // 3. Clear filters
      NativeCameraFiltersModule.clearFilter();
      
      // 4. Disable audio processing
      NativeAudioEqualizerModule.setEQEnabled(false);
      
      // 5. Stop camera last
      NativeCameraModule.stopCamera();

      // Verify cleanup was called
      expect(filtersModule.clearFilter).toHaveBeenCalled();
      expect(audioModule.stopSpectrumAnalysis).toHaveBeenCalled();
      expect(cameraModule.stopCamera).toHaveBeenCalled();
    });
  });
});
