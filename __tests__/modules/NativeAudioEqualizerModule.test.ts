/**
 * Tests complets pour NativeAudioEqualizerModule
 */
import { NativeModules } from 'react-native';
import NativeAudioEqualizerModule from '../../specs/NativeAudioEqualizerModule';
import {
  mockEQPresets,
  mockNoiseReductionConfig,
  mockAudioSafetyReport,
  mockSpectrumData,
} from '../fixtures/testData';

describe('NativeAudioEqualizerModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Equalizer Control', () => {
    describe('setEQEnabled / getEQEnabled', () => {
      it('should enable equalizer', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setEQEnabled.mockReturnValue(undefined);
        mockModule.getEQEnabled.mockReturnValue(true);

        NativeAudioEqualizerModule.setEQEnabled(true);
        const isEnabled = NativeAudioEqualizerModule.getEQEnabled();

        expect(mockModule.setEQEnabled).toHaveBeenCalledWith(true);
        expect(isEnabled).toBe(true);
      });

      it('should disable equalizer', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setEQEnabled.mockReturnValue(undefined);
        mockModule.getEQEnabled.mockReturnValue(false);

        NativeAudioEqualizerModule.setEQEnabled(false);
        const isEnabled = NativeAudioEqualizerModule.getEQEnabled();

        expect(mockModule.setEQEnabled).toHaveBeenCalledWith(false);
        expect(isEnabled).toBe(false);
      });

      it('should toggle equalizer state', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setEQEnabled.mockReturnValue(undefined);
        mockModule.getEQEnabled
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true);

        // Initially disabled
        expect(NativeAudioEqualizerModule.getEQEnabled()).toBe(false);

        // Enable
        NativeAudioEqualizerModule.setEQEnabled(true);
        expect(NativeAudioEqualizerModule.getEQEnabled()).toBe(true);
      });
    });

    describe('Master Gain', () => {
      it('should set master gain', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setMasterGain.mockReturnValue(undefined);

        NativeAudioEqualizerModule.setMasterGain(3.5);

        expect(mockModule.setMasterGain).toHaveBeenCalledWith(3.5);
      });

      it('should get master gain', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getMasterGain.mockReturnValue(2.0);

        const gain = NativeAudioEqualizerModule.getMasterGain();

        expect(gain).toBe(2.0);
      });

      it('should handle negative master gain', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setMasterGain.mockReturnValue(undefined);
        mockModule.getMasterGain.mockReturnValue(-6.0);

        NativeAudioEqualizerModule.setMasterGain(-6.0);
        const gain = NativeAudioEqualizerModule.getMasterGain();

        expect(mockModule.setMasterGain).toHaveBeenCalledWith(-6.0);
        expect(gain).toBe(-6.0);
      });
    });
  });

  describe('Band Management', () => {
    describe('setBandGain / getBandGain', () => {
      it('should set gain for specific band', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setBandGain.mockReturnValue(undefined);

        NativeAudioEqualizerModule.setBandGain(0, 3.0);
        NativeAudioEqualizerModule.setBandGain(5, -2.0);

        expect(mockModule.setBandGain).toHaveBeenCalledWith(0, 3.0);
        expect(mockModule.setBandGain).toHaveBeenCalledWith(5, -2.0);
      });

      it('should get gain for specific band', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getBandGain.mockReturnValue(4.5);

        const gain = NativeAudioEqualizerModule.getBandGain(3);

        expect(mockModule.getBandGain).toHaveBeenCalledWith(3);
        expect(gain).toBe(4.5);
      });

      it('should handle all 10 bands', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setBandGain.mockReturnValue(undefined);

        // Set gains for all 10 bands
        for (let i = 0; i < 10; i++) {
          const gain = (i - 5) * 0.5; // -2.5 to 2.0
          NativeAudioEqualizerModule.setBandGain(i, gain);
        }

        expect(mockModule.setBandGain).toHaveBeenCalledTimes(10);
      });

      it('should handle out of range band index gracefully', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setBandGain.mockReturnValue(undefined);
        mockModule.getBandGain.mockReturnValue(0);

        NativeAudioEqualizerModule.setBandGain(99, 1.0);
        const gain = NativeAudioEqualizerModule.getBandGain(99);

        expect(mockModule.setBandGain).toHaveBeenCalledWith(99, 1.0);
        expect(gain).toBe(0);
      });
    });
  });

  describe('Presets', () => {
    describe('setPreset / getCurrentPreset', () => {
      it('should set equalizer preset', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setPreset.mockReturnValue(undefined);

        NativeAudioEqualizerModule.setPreset('Rock');

        expect(mockModule.setPreset).toHaveBeenCalledWith('Rock');
      });

      it('should get current preset', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getCurrentPreset.mockReturnValue('Jazz');

        const preset = NativeAudioEqualizerModule.getCurrentPreset();

        expect(preset).toBe('Jazz');
      });

      it('should switch between presets', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.setPreset.mockReturnValue(undefined);

        const presets = ['Rock', 'Pop', 'Jazz', 'Classical'];
        presets.forEach(preset => {
          NativeAudioEqualizerModule.setPreset(preset);
        });

        expect(mockModule.setPreset).toHaveBeenCalledTimes(4);
      });
    });

    describe('getAvailablePresets', () => {
      it('should return list of available presets', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getAvailablePresets.mockReturnValue(mockEQPresets);

        const presets = NativeAudioEqualizerModule.getAvailablePresets();

        expect(presets).toEqual(mockEQPresets);
        expect(presets).toContain('Rock');
        expect(presets).toContain('Flat');
      });

      it('should include custom preset option', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getAvailablePresets.mockReturnValue(mockEQPresets);

        const presets = NativeAudioEqualizerModule.getAvailablePresets();

        expect(presets).toContain('Custom');
      });
    });
  });

  describe('Spectrum Analysis', () => {
    describe('getSpectrumData', () => {
      it('should return spectrum data array', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getSpectrumData.mockReturnValue(mockSpectrumData);

        const data = NativeAudioEqualizerModule.getSpectrumData();

        expect(data).toEqual(mockSpectrumData);
        expect(data.length).toBeGreaterThan(0);
      });

      it('should return values between 0 and 1', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.getSpectrumData.mockReturnValue(mockSpectrumData);

        const data = NativeAudioEqualizerModule.getSpectrumData();

        data.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('startSpectrumAnalysis / stopSpectrumAnalysis', () => {
      it('should start spectrum analysis', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.startSpectrumAnalysis.mockReturnValue(undefined);

        NativeAudioEqualizerModule.startSpectrumAnalysis();

        expect(mockModule.startSpectrumAnalysis).toHaveBeenCalledTimes(1);
      });

      it('should stop spectrum analysis', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.stopSpectrumAnalysis.mockReturnValue(undefined);

        NativeAudioEqualizerModule.stopSpectrumAnalysis();

        expect(mockModule.stopSpectrumAnalysis).toHaveBeenCalledTimes(1);
      });

      it('should handle start/stop cycle', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.startSpectrumAnalysis.mockReturnValue(undefined);
        mockModule.stopSpectrumAnalysis.mockReturnValue(undefined);

        NativeAudioEqualizerModule.startSpectrumAnalysis();
        NativeAudioEqualizerModule.stopSpectrumAnalysis();
        NativeAudioEqualizerModule.startSpectrumAnalysis();

        expect(mockModule.startSpectrumAnalysis).toHaveBeenCalledTimes(2);
        expect(mockModule.stopSpectrumAnalysis).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Batching', () => {
    describe('beginBatch / endBatch', () => {
      it('should begin batch operation', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.beginBatch?.mockReturnValue(undefined);

        NativeAudioEqualizerModule.beginBatch?.();

        expect(mockModule.beginBatch).toHaveBeenCalledTimes(1);
      });

      it('should end batch operation', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.endBatch?.mockReturnValue(undefined);

        NativeAudioEqualizerModule.endBatch?.();

        expect(mockModule.endBatch).toHaveBeenCalledTimes(1);
      });

      it('should batch multiple band updates', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.beginBatch?.mockReturnValue(undefined);
        mockModule.setBandGain.mockReturnValue(undefined);
        mockModule.endBatch?.mockReturnValue(undefined);

        // Begin batch
        NativeAudioEqualizerModule.beginBatch?.();

        // Update multiple bands
        for (let i = 0; i < 10; i++) {
          NativeAudioEqualizerModule.setBandGain(i, i * 0.5);
        }

        // End batch
        NativeAudioEqualizerModule.endBatch?.();

        expect(mockModule.beginBatch).toHaveBeenCalledTimes(1);
        expect(mockModule.setBandGain).toHaveBeenCalledTimes(10);
        expect(mockModule.endBatch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Noise Reduction', () => {
    describe('nrSetEnabled / nrGetEnabled', () => {
      it('should enable noise reduction', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.nrSetEnabled.mockReturnValue(undefined);
        mockModule.nrGetEnabled.mockReturnValue(true);

        NativeAudioEqualizerModule.nrSetEnabled(true);
        const isEnabled = NativeAudioEqualizerModule.nrGetEnabled();

        expect(mockModule.nrSetEnabled).toHaveBeenCalledWith(true);
        expect(isEnabled).toBe(true);
      });

      it('should disable noise reduction', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.nrSetEnabled.mockReturnValue(undefined);
        mockModule.nrGetEnabled.mockReturnValue(false);

        NativeAudioEqualizerModule.nrSetEnabled(false);
        const isEnabled = NativeAudioEqualizerModule.nrGetEnabled();

        expect(mockModule.nrSetEnabled).toHaveBeenCalledWith(false);
        expect(isEnabled).toBe(false);
      });
    });

    describe('nrSetConfig / nrGetConfig', () => {
      it('should set noise reduction configuration', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.nrSetConfig.mockReturnValue(undefined);

        const { 
          highPassEnabled,
          highPassHz,
          thresholdDb,
          ratio,
          floorDb,
          attackMs,
          releaseMs
        } = mockNoiseReductionConfig;

        NativeAudioEqualizerModule.nrSetConfig(
          highPassEnabled,
          highPassHz,
          thresholdDb,
          ratio,
          floorDb,
          attackMs,
          releaseMs
        );

        expect(mockModule.nrSetConfig).toHaveBeenCalledWith(
          highPassEnabled,
          highPassHz,
          thresholdDb,
          ratio,
          floorDb,
          attackMs,
          releaseMs
        );
      });

      it('should get noise reduction configuration', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.nrGetConfig.mockReturnValue(mockNoiseReductionConfig);

        const config = NativeAudioEqualizerModule.nrGetConfig();

        expect(config).toEqual(mockNoiseReductionConfig);
        expect(config.highPassEnabled).toBe(true);
        expect(config.highPassHz).toBe(80);
      });

      it('should handle high-pass filter settings', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.nrSetConfig.mockReturnValue(undefined);

        // Disable high-pass filter
        NativeAudioEqualizerModule.nrSetConfig(
          false, // highPassEnabled
          0,     // highPassHz (ignored when disabled)
          -45,   // thresholdDb
          2.5,   // ratio
          -18,   // floorDb
          3,     // attackMs
          80     // releaseMs
        );

        expect(mockModule.nrSetConfig).toHaveBeenCalledWith(
          false, 0, -45, 2.5, -18, 3, 80
        );
      });
    });
  });

  describe('Audio Safety', () => {
    describe('safetySetConfig', () => {
      it('should set audio safety configuration', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.safetySetConfig.mockReturnValue(undefined);

        NativeAudioEqualizerModule.safetySetConfig(
          true,   // enabled
          true,   // dcRemovalEnabled
          0.002,  // dcThreshold
          true,   // limiterEnabled
          -1.0,   // limiterThresholdDb
          true,   // softKneeLimiter
          6.0,    // kneeWidthDb
          true,   // feedbackDetectEnabled
          0.95    // feedbackCorrThreshold
        );

        expect(mockModule.safetySetConfig).toHaveBeenCalledWith(
          true, true, 0.002, true, -1.0, true, 6.0, true, 0.95
        );
      });

      it('should disable audio safety features', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.safetySetConfig.mockReturnValue(undefined);

        NativeAudioEqualizerModule.safetySetConfig(
          false,  // enabled (disables all)
          false,  // dcRemovalEnabled
          0,      // dcThreshold
          false,  // limiterEnabled
          0,      // limiterThresholdDb
          false,  // softKneeLimiter
          0,      // kneeWidthDb
          false,  // feedbackDetectEnabled
          0       // feedbackCorrThreshold
        );

        expect(mockModule.safetySetConfig).toHaveBeenCalledWith(
          false, false, 0, false, 0, false, 0, false, 0
        );
      });
    });

    describe('safetyGetReport', () => {
      it('should get audio safety report', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.safetyGetReport.mockReturnValue(mockAudioSafetyReport);

        const report = NativeAudioEqualizerModule.safetyGetReport();

        expect(report).toEqual(mockAudioSafetyReport);
        expect(report.peak).toBe(0.95);
        expect(report.overload).toBe(false);
      });

      it('should detect overload condition', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        const overloadReport = {
          ...mockAudioSafetyReport,
          peak: 1.0,
          clippedSamples: 150,
          overload: true,
        };
        mockModule.safetyGetReport.mockReturnValue(overloadReport);

        const report = NativeAudioEqualizerModule.safetyGetReport();

        expect(report.overload).toBe(true);
        expect(report.clippedSamples).toBeGreaterThan(0);
      });

      it('should monitor DC offset', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.safetyGetReport.mockReturnValue(mockAudioSafetyReport);

        const report = NativeAudioEqualizerModule.safetyGetReport();

        expect(report.dcOffset).toBeDefined();
        expect(report.dcOffset).toBeLessThan(0.01); // Should be minimal
      });
    });
  });

  describe('Creative Effects (FX)', () => {
    describe('fxSetEnabled / fxGetEnabled', () => {
      it('should enable creative effects', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetEnabled.mockReturnValue(undefined);
        mockModule.fxGetEnabled.mockReturnValue(true);

        NativeAudioEqualizerModule.fxSetEnabled(true);
        const isEnabled = NativeAudioEqualizerModule.fxGetEnabled();

        expect(mockModule.fxSetEnabled).toHaveBeenCalledWith(true);
        expect(isEnabled).toBe(true);
      });
    });

    describe('fxSetCompressor', () => {
      it('should set compressor parameters', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetCompressor.mockReturnValue(undefined);

        NativeAudioEqualizerModule.fxSetCompressor(
          -18.0,  // thresholdDb
          3.0,    // ratio
          10.0,   // attackMs
          80.0,   // releaseMs
          0.0     // makeupDb
        );

        expect(mockModule.fxSetCompressor).toHaveBeenCalledWith(
          -18.0, 3.0, 10.0, 80.0, 0.0
        );
      });

      it('should handle extreme compression ratios', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetCompressor.mockReturnValue(undefined);

        // Limiting (infinite ratio)
        NativeAudioEqualizerModule.fxSetCompressor(
          -6.0,   // thresholdDb
          100.0,  // ratio (limiting)
          0.1,    // attackMs (fast)
          50.0,   // releaseMs
          6.0     // makeupDb
        );

        expect(mockModule.fxSetCompressor).toHaveBeenCalledWith(
          -6.0, 100.0, 0.1, 50.0, 6.0
        );
      });
    });

    describe('fxSetDelay', () => {
      it('should set delay parameters', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetDelay.mockReturnValue(undefined);

        NativeAudioEqualizerModule.fxSetDelay(
          150.0,  // delayMs
          0.3,    // feedback
          0.25    // mix
        );

        expect(mockModule.fxSetDelay).toHaveBeenCalledWith(150.0, 0.3, 0.25);
      });

      it('should handle various delay times', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetDelay.mockReturnValue(undefined);

        const delayTimes = [10, 50, 100, 200, 500];
        
        delayTimes.forEach(time => {
          NativeAudioEqualizerModule.fxSetDelay(time, 0.5, 0.3);
        });

        expect(mockModule.fxSetDelay).toHaveBeenCalledTimes(5);
      });

      it('should handle feedback oscillation prevention', () => {
        const mockModule = NativeModules.NativeAudioEqualizerModule;
        mockModule.fxSetDelay.mockReturnValue(undefined);

        // High feedback but safe mix level
        NativeAudioEqualizerModule.fxSetDelay(
          100.0,  // delayMs
          0.95,   // feedback (near oscillation)
          0.1     // mix (low to prevent runaway)
        );

        expect(mockModule.fxSetDelay).toHaveBeenCalledWith(100.0, 0.95, 0.1);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid band gain updates', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.setBandGain.mockReturnValue(undefined);

      const startTime = Date.now();

      // Simulate 1000 rapid updates across all bands
      for (let i = 0; i < 100; i++) {
        for (let band = 0; band < 10; band++) {
          const gain = Math.random() * 24 - 12; // -12 to +12 dB
          NativeAudioEqualizerModule.setBandGain(band, gain);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockModule.setBandGain).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle spectrum data polling', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.getSpectrumData.mockReturnValue(mockSpectrumData);

      const startTime = Date.now();
      const spectrumReadings = [];

      // Simulate 60 FPS spectrum polling for 1 second
      for (let i = 0; i < 60; i++) {
        spectrumReadings.push(NativeAudioEqualizerModule.getSpectrumData());
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(spectrumReadings).toHaveLength(60);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle preset switching performance', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.setPreset.mockReturnValue(undefined);

      const startTime = Date.now();

      // Switch through all presets multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        mockEQPresets.forEach(preset => {
          NativeAudioEqualizerModule.setPreset(preset);
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockModule.setPreset).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle module not available', () => {
      const originalModule = NativeModules.NativeAudioEqualizerModule;
      NativeModules.NativeAudioEqualizerModule = undefined;

      expect(() => {
        NativeAudioEqualizerModule.setEQEnabled(true);
      }).toThrow();

      NativeModules.NativeAudioEqualizerModule = originalModule;
    });

    it('should handle concurrent operations', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.setEQEnabled.mockReturnValue(undefined);
      mockModule.setBandGain.mockReturnValue(undefined);
      mockModule.setPreset.mockReturnValue(undefined);

      // Simulate concurrent operations
      NativeAudioEqualizerModule.setEQEnabled(true);
      NativeAudioEqualizerModule.setBandGain(0, 3.0);
      NativeAudioEqualizerModule.setPreset('Rock');

      expect(mockModule.setEQEnabled).toHaveBeenCalledTimes(1);
      expect(mockModule.setBandGain).toHaveBeenCalledTimes(1);
      expect(mockModule.setPreset).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid band indices gracefully', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.setBandGain.mockReturnValue(undefined);
      mockModule.getBandGain.mockReturnValue(0);

      // Negative index
      NativeAudioEqualizerModule.setBandGain(-1, 1.0);
      expect(mockModule.setBandGain).toHaveBeenCalledWith(-1, 1.0);

      // Out of bounds index
      NativeAudioEqualizerModule.setBandGain(100, 1.0);
      expect(mockModule.setBandGain).toHaveBeenCalledWith(100, 1.0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should apply full audio processing chain', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      
      // Enable all processing
      mockModule.setEQEnabled.mockReturnValue(undefined);
      mockModule.nrSetEnabled.mockReturnValue(undefined);
      mockModule.fxSetEnabled.mockReturnValue(undefined);
      mockModule.safetySetConfig.mockReturnValue(undefined);

      // Enable EQ with preset
      NativeAudioEqualizerModule.setEQEnabled(true);
      NativeAudioEqualizerModule.setPreset('Rock');

      // Enable noise reduction
      NativeAudioEqualizerModule.nrSetEnabled(true);

      // Enable effects
      NativeAudioEqualizerModule.fxSetEnabled(true);
      NativeAudioEqualizerModule.fxSetCompressor(-12, 3, 5, 50, 2);

      // Enable safety features
      NativeAudioEqualizerModule.safetySetConfig(
        true, true, 0.002, true, -0.5, true, 3, true, 0.9
      );

      expect(mockModule.setEQEnabled).toHaveBeenCalled();
      expect(mockModule.nrSetEnabled).toHaveBeenCalled();
      expect(mockModule.fxSetEnabled).toHaveBeenCalled();
      expect(mockModule.safetySetConfig).toHaveBeenCalled();
    });

    it('should handle real-time parameter automation', () => {
      const mockModule = NativeModules.NativeAudioEqualizerModule;
      mockModule.beginBatch?.mockReturnValue(undefined);
      mockModule.setBandGain.mockReturnValue(undefined);
      mockModule.setMasterGain.mockReturnValue(undefined);
      mockModule.endBatch?.mockReturnValue(undefined);

      // Simulate parameter automation over time
      const automationSteps = 20;
      
      for (let step = 0; step < automationSteps; step++) {
        const t = step / automationSteps;
        
        NativeAudioEqualizerModule.beginBatch?.();
        
        // Automate band gains with sine wave
        for (let band = 0; band < 10; band++) {
          const gain = Math.sin(t * Math.PI * 2 + band * 0.5) * 6;
          NativeAudioEqualizerModule.setBandGain(band, gain);
        }
        
        // Automate master gain
        const masterGain = Math.cos(t * Math.PI) * 3;
        NativeAudioEqualizerModule.setMasterGain(masterGain);
        
        NativeAudioEqualizerModule.endBatch?.();
      }

      expect(mockModule.setBandGain).toHaveBeenCalledTimes(200);
      expect(mockModule.setMasterGain).toHaveBeenCalledTimes(20);
    });
  });
});
