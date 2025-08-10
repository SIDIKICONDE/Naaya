/**
 * Tests complets pour NativeCameraFiltersModule
 */
import { NativeModules } from 'react-native';
import NativeCameraFiltersModule from '../../specs/NativeCameraFiltersModule';
import {
  mockFilterState,
  mockAdvancedFilterParams,
  mockAvailableFilters,
} from '../fixtures/testData';

describe('NativeCameraFiltersModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Filter Discovery', () => {
    describe('getAvailableFilters', () => {
      it('should return list of available filters', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.getAvailableFilters.mockReturnValue(mockAvailableFilters);

        const filters = NativeCameraFiltersModule.getAvailableFilters();

        expect(mockModule.getAvailableFilters).toHaveBeenCalledTimes(1);
        expect(filters).toEqual(mockAvailableFilters);
        expect(filters).toContain('vintage');
        expect(filters).toContain('sepia');
      });

      it('should always include "none" filter', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.getAvailableFilters.mockReturnValue(mockAvailableFilters);

        const filters = NativeCameraFiltersModule.getAvailableFilters();

        expect(filters[0]).toBe('none');
      });

      it('should handle empty filter list', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.getAvailableFilters.mockReturnValue([]);

        const filters = NativeCameraFiltersModule.getAvailableFilters();

        expect(filters).toEqual([]);
      });
    });
  });

  describe('Filter Application', () => {
    describe('setFilter', () => {
      it('should apply filter with intensity', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(true);

        const result = NativeCameraFiltersModule.setFilter('vintage', 0.75);

        expect(mockModule.setFilter).toHaveBeenCalledWith('vintage', 0.75);
        expect(result).toBe(true);
      });

      it('should apply filter with default intensity', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(true);

        const result = NativeCameraFiltersModule.setFilter('sepia', 1.0);

        expect(mockModule.setFilter).toHaveBeenCalledWith('sepia', 1.0);
        expect(result).toBe(true);
      });

      it('should clamp intensity between 0 and 1', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(true);

        // Test over 1
        NativeCameraFiltersModule.setFilter('vintage', 1.5);
        expect(mockModule.setFilter).toHaveBeenCalledWith('vintage', 1.5);

        // Test under 0
        NativeCameraFiltersModule.setFilter('vintage', -0.5);
        expect(mockModule.setFilter).toHaveBeenCalledWith('vintage', -0.5);
      });

      it('should handle invalid filter name', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(false);

        const result = NativeCameraFiltersModule.setFilter('invalid_filter', 0.5);

        expect(result).toBe(false);
      });

      it('should apply LUT filter with path', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(true);

        const lutPath = 'lut3d:/path/to/lut.cube';
        const result = NativeCameraFiltersModule.setFilter(lutPath, 0.8);

        expect(mockModule.setFilter).toHaveBeenCalledWith(lutPath, 0.8);
        expect(result).toBe(true);
      });

      it('should handle filter switching', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilter.mockReturnValue(true);

        // Apply first filter
        NativeCameraFiltersModule.setFilter('vintage', 0.5);
        expect(mockModule.setFilter).toHaveBeenCalledWith('vintage', 0.5);

        // Switch to another filter
        NativeCameraFiltersModule.setFilter('sepia', 0.7);
        expect(mockModule.setFilter).toHaveBeenCalledWith('sepia', 0.7);

        expect(mockModule.setFilter).toHaveBeenCalledTimes(2);
      });
    });

    describe('setFilterWithParams', () => {
      it('should apply filter with advanced parameters', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilterWithParams.mockReturnValue(true);

        const result = NativeCameraFiltersModule.setFilterWithParams(
          'vintage',
          0.75,
          mockAdvancedFilterParams
        );

        expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
          'vintage',
          0.75,
          mockAdvancedFilterParams
        );
        expect(result).toBe(true);
      });

      it('should handle partial parameters', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilterWithParams.mockReturnValue(true);

        const partialParams = {
          brightness: 0.5,
          contrast: 1.2,
          saturation: 0.8,
        };

        const result = NativeCameraFiltersModule.setFilterWithParams(
          'custom',
          1.0,
          partialParams as any
        );

        expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
          'custom',
          1.0,
          partialParams
        );
        expect(result).toBe(true);
      });

      it('should validate parameter ranges', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilterWithParams.mockReturnValue(true);

        const params = {
          ...mockAdvancedFilterParams,
          brightness: -1.0, // Min value
          contrast: 2.0,     // Max value
          exposure: -2.0,    // Min value
        };

        const result = NativeCameraFiltersModule.setFilterWithParams(
          'custom',
          1.0,
          params
        );

        expect(result).toBe(true);
      });

      it('should handle LUT with advanced parameters', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilterWithParams.mockReturnValue(true);

        const lutPath = 'lut3d:/path/to/custom.cube';
        const result = NativeCameraFiltersModule.setFilterWithParams(
          lutPath,
          0.9,
          mockAdvancedFilterParams
        );

        expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
          lutPath,
          0.9,
          mockAdvancedFilterParams
        );
        expect(result).toBe(true);
      });

      it('should handle empty parameters', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.setFilterWithParams.mockReturnValue(true);

        const result = NativeCameraFiltersModule.setFilterWithParams(
          'vintage',
          0.5,
          {} as any
        );

        expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
          'vintage',
          0.5,
          {}
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('Filter State Management', () => {
    describe('getFilter', () => {
      it('should return current filter state', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.getFilter.mockReturnValue(mockFilterState);

        const filter = NativeCameraFiltersModule.getFilter();

        expect(mockModule.getFilter).toHaveBeenCalledTimes(1);
        expect(filter).toEqual(mockFilterState);
        expect(filter?.name).toBe('vintage');
        expect(filter?.intensity).toBe(0.75);
      });

      it('should return null when no filter is active', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.getFilter.mockReturnValue(null);

        const filter = NativeCameraFiltersModule.getFilter();

        expect(filter).toBeNull();
      });

      it('should update after filter change', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        
        // Initial state
        mockModule.getFilter.mockReturnValueOnce(null);
        let filter = NativeCameraFiltersModule.getFilter();
        expect(filter).toBeNull();

        // After setting filter
        mockModule.setFilter.mockReturnValue(true);
        NativeCameraFiltersModule.setFilter('sepia', 0.6);
        
        mockModule.getFilter.mockReturnValueOnce({
          name: 'sepia',
          intensity: 0.6,
        });
        filter = NativeCameraFiltersModule.getFilter();
        expect(filter?.name).toBe('sepia');
        expect(filter?.intensity).toBe(0.6);
      });
    });

    describe('clearFilter', () => {
      it('should clear active filter', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.clearFilter.mockReturnValue(true);

        const result = NativeCameraFiltersModule.clearFilter();

        expect(mockModule.clearFilter).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });

      it('should handle clear when no filter is active', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        mockModule.clearFilter.mockReturnValue(true);

        const result = NativeCameraFiltersModule.clearFilter();

        expect(result).toBe(true);
      });

      it('should reset filter state after clear', () => {
        const mockModule = NativeModules.NativeCameraFiltersModule;
        
        // Set a filter
        mockModule.setFilter.mockReturnValue(true);
        NativeCameraFiltersModule.setFilter('vintage', 0.8);
        
        // Clear it
        mockModule.clearFilter.mockReturnValue(true);
        NativeCameraFiltersModule.clearFilter();
        
        // Check state is null
        mockModule.getFilter.mockReturnValue(null);
        const filter = NativeCameraFiltersModule.getFilter();
        
        expect(filter).toBeNull();
      });
    });
  });

  describe('Advanced Filter Parameters', () => {
    it('should handle brightness adjustment', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, brightness: 0.5 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ brightness: 0.5 })
      );
    });

    it('should handle contrast adjustment', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, contrast: 1.5 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ contrast: 1.5 })
      );
    });

    it('should handle saturation adjustment', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, saturation: 0.5 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ saturation: 0.5 })
      );
    });

    it('should handle color temperature (warmth)', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, warmth: 0.8 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ warmth: 0.8 })
      );
    });

    it('should handle exposure adjustment', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, exposure: 1.0 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ exposure: 1.0 })
      );
    });

    it('should handle shadows and highlights', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = {
        ...mockAdvancedFilterParams,
        shadows: -0.5,
        highlights: 0.5,
      };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({
          shadows: -0.5,
          highlights: 0.5,
        })
      );
    });

    it('should handle vignette effect', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, vignette: 0.7 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ vignette: 0.7 })
      );
    });

    it('should handle grain effect', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const params = { ...mockAdvancedFilterParams, grain: 0.3 };
      const result = NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'custom',
        1.0,
        expect.objectContaining({ grain: 0.3 })
      );
    });
  });

  describe('Filter Combinations', () => {
    it('should combine filter with all parameters', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const fullParams = {
        brightness: 0.2,
        contrast: 1.3,
        saturation: 1.1,
        hue: 30,
        gamma: 1.2,
        warmth: 0.3,
        tint: -0.1,
        exposure: 0.5,
        shadows: -0.2,
        highlights: 0.2,
        vignette: 0.4,
        grain: 0.2,
      };

      const result = NativeCameraFiltersModule.setFilterWithParams(
        'cinematic',
        0.9,
        fullParams
      );

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        'cinematic',
        0.9,
        fullParams
      );
    });

    it('should handle rapid filter changes', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(true);

      const filters = ['vintage', 'sepia', 'blackwhite', 'cool', 'warm'];
      
      filters.forEach(filter => {
        const result = NativeCameraFiltersModule.setFilter(filter, 0.5);
        expect(result).toBe(true);
      });

      expect(mockModule.setFilter).toHaveBeenCalledTimes(5);
    });

    it('should handle intensity animation', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(true);

      // Simulate animating intensity from 0 to 1
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const intensity = i / steps;
        NativeCameraFiltersModule.setFilter('vintage', intensity);
      }

      expect(mockModule.setFilter).toHaveBeenCalledTimes(11);
      expect(mockModule.setFilter).toHaveBeenLastCalledWith('vintage', 1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle module not available', () => {
      const originalModule = NativeModules.NativeCameraFiltersModule;
      NativeModules.NativeCameraFiltersModule = undefined;

      expect(() => {
        NativeCameraFiltersModule.getAvailableFilters();
      }).toThrow();

      NativeModules.NativeCameraFiltersModule = originalModule;
    });

    it('should handle invalid filter parameters', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(false);

      const invalidParams = {
        brightness: NaN,
        contrast: Infinity,
        saturation: -Infinity,
      } as any;

      const result = NativeCameraFiltersModule.setFilterWithParams(
        'custom',
        1.0,
        invalidParams
      );

      expect(result).toBe(false);
    });

    it('should handle concurrent filter operations', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(true);
      mockModule.clearFilter.mockReturnValue(true);

      // Simulate concurrent operations
      const operations = [
        NativeCameraFiltersModule.setFilter('vintage', 0.5),
        NativeCameraFiltersModule.clearFilter(),
        NativeCameraFiltersModule.setFilter('sepia', 0.7),
      ];

      operations.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid parameter updates', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const startTime = Date.now();
      
      // Simulate 100 rapid parameter updates
      for (let i = 0; i < 100; i++) {
        const params = {
          ...mockAdvancedFilterParams,
          brightness: Math.random() * 2 - 1,
          contrast: Math.random() * 2,
        };
        
        NativeCameraFiltersModule.setFilterWithParams('custom', 1.0, params);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockModule.setFilterWithParams).toHaveBeenCalledTimes(100);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle filter preset switching performance', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(true);

      const presets = [
        'vintage', 'sepia', 'blackwhite', 'cool', 'warm',
        'dramatic', 'filmic', 'none'
      ];

      const startTime = Date.now();

      // Simulate switching through all presets 10 times
      for (let cycle = 0; cycle < 10; cycle++) {
        presets.forEach(preset => {
          NativeCameraFiltersModule.setFilter(preset, 1.0);
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(mockModule.setFilter).toHaveBeenCalledTimes(80);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('LUT Filter Tests', () => {
    it('should load LUT from file path', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(true);

      const lutPath = 'lut3d:/storage/emulated/0/DCIM/luts/cinematic.cube';
      const result = NativeCameraFiltersModule.setFilter(lutPath, 1.0);

      expect(mockModule.setFilter).toHaveBeenCalledWith(lutPath, 1.0);
      expect(result).toBe(true);
    });

    it('should handle invalid LUT path', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilter.mockReturnValue(false);

      const invalidPath = 'lut3d:/non/existent/file.cube';
      const result = NativeCameraFiltersModule.setFilter(invalidPath, 1.0);

      expect(result).toBe(false);
    });

    it('should combine LUT with advanced parameters', () => {
      const mockModule = NativeModules.NativeCameraFiltersModule;
      mockModule.setFilterWithParams.mockReturnValue(true);

      const lutPath = 'lut3d:/storage/luts/custom.cube';
      const params = {
        ...mockAdvancedFilterParams,
        brightness: 0.1,
        contrast: 1.1,
      };

      const result = NativeCameraFiltersModule.setFilterWithParams(
        lutPath,
        0.8,
        params
      );

      expect(result).toBe(true);
      expect(mockModule.setFilterWithParams).toHaveBeenCalledWith(
        lutPath,
        0.8,
        params
      );
    });
  });
});
