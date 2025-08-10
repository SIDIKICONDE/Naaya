/* eslint-env jest */
// Configuration Jest pour Naaya
// Mock simple des modules natifs

// Mock de TurboModuleRegistry
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const eqModule = {
    setEQEnabled: jest.fn(),
    getEQEnabled: jest.fn(() => false),
    setMasterGain: jest.fn(),
    getMasterGain: jest.fn(() => 0),
    setBandGain: jest.fn(),
    getBandGain: jest.fn(() => 0),
    setPreset: jest.fn(),
    getCurrentPreset: jest.fn(() => 'Flat'),
    getSpectrumData: jest.fn(() => []),
    startSpectrumAnalysis: jest.fn(),
    stopSpectrumAnalysis: jest.fn(),
    beginBatch: jest.fn(),
    endBatch: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    getData: jest.fn(() => []),
    checkPermissions: jest.fn(() => ({ camera: 'granted', microphone: 'granted', storage: 'granted' })),
    requestPermissions: jest.fn(() => ({ camera: 'granted', microphone: 'granted', storage: 'granted' })),
    getAvailableDevices: jest.fn(() => []),
    getCurrentDevice: jest.fn(() => null),
    selectDevice: jest.fn(() => true),
    switchDevice: jest.fn(() => true),
    startCamera: jest.fn(() => true),
    stopCamera: jest.fn(() => true),
    isActive: jest.fn(() => false),
    capturePhoto: jest.fn(() => ({ uri: 'mock.jpg', width: 1920, height: 1080 })),
    startRecording: jest.fn(() => true),
    stopRecording: jest.fn(() => ({ uri: 'mock.mp4', duration: 0, size: 0, width: 1920, height: 1080 })),
    isRecording: jest.fn(() => false),
    getRecordingProgress: jest.fn(() => ({ duration: 0, size: 0 })),
    hasFlash: jest.fn(() => true),
    setFlashMode: jest.fn(() => true),
    setTorchMode: jest.fn(() => true),
    getMinZoom: jest.fn(() => 1.0),
    getMaxZoom: jest.fn(() => 10.0),
    setZoom: jest.fn(() => true),
    getPreviewSize: jest.fn(() => ({ width: 1920, height: 1080 })),
    getSupportedFormats: jest.fn(() => []),
  };

  const cameraFiltersModule = {
    getAvailableFilters: jest.fn(() => []),
    setAdvancedFilter: jest.fn(() => true),
    clearFilter: jest.fn(() => true),
  };

  const nativeDeviceInfo = {
    getConstants: jest.fn(() => ({
      Dimensions: {
        windowPhysicalPixels: {
          width: 1080,
          height: 1920,
          scale: 2,
          fontScale: 2,
          densityDpi: 320,
        },
        screenPhysicalPixels: {
          width: 1080,
          height: 1920,
          scale: 2,
          fontScale: 2,
          densityDpi: 320,
        },
      },
      isTesting: true,
    })),
  };

  return {
    getEnforcing: jest.fn((name) => {
      if (name === 'NativeDeviceInfo') return nativeDeviceInfo;
      if (name === 'NativeCameraFiltersModule') return cameraFiltersModule;
      return eqModule;
    }),
    get: jest.fn(() => undefined),
  };
});

// Mock de NativeModules nécessaires à Dimensions/PixelRatio
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  NativeDeviceInfo: {
    getConstants: jest.fn(() => ({
      Dimensions: {
        windowPhysicalPixels: {
          width: 1080,
          height: 1920,
          scale: 2,
          fontScale: 2,
          densityDpi: 320,
        },
        screenPhysicalPixels: {
          width: 1080,
          height: 1920,
          scale: 2,
          fontScale: 2,
          densityDpi: 320,
        },
      },
      isTesting: true,
    })),
  },
}));

// Mock direct du module privé déprécié utilisé par RN pour Dimensions/PixelRatio
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
  getConstants: jest.fn(() => ({
    Dimensions: {
      windowPhysicalPixels: {
        width: 1080,
        height: 1920,
        scale: 2,
        fontScale: 2,
        densityDpi: 320,
      },
      screenPhysicalPixels: {
        width: 1080,
        height: 1920,
        scale: 2,
        fontScale: 2,
        densityDpi: 320,
      },
    },
    isTesting: true,
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-fs pour éviter la transformation de node_modules
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => true),
  exists: jest.fn(async () => true),
  unlink: jest.fn(async () => true),
  mkdir: jest.fn(async () => true),
  moveFile: jest.fn(async () => true),
  copyFile: jest.fn(async () => true),
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
}));

// Mock StatusBar manager iOS
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeStatusBarManagerIOS', () => ({
  setStyle: jest.fn(),
  setHidden: jest.fn(),
  setNetworkActivityIndicatorVisible: jest.fn(),
}));

// Mock Platform constants iOS
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativePlatformConstantsIOS', () => ({
  getConstants: jest.fn(() => ({
    forceTouchAvailable: false,
    interfaceIdiom: 'phone',
    osVersion: '14.0',
    systemName: 'iOS',
    isTesting: true,
  })),
}));

// Mock NativeEventEmitter pour éviter l'argument requis non-null
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    removeSubscription: jest.fn(),
    emit: jest.fn(),
    listeners: jest.fn(() => []),
  }));
});

// Utiliser le AnimatedMock officiel de RN pour les tests
jest.mock('react-native/Libraries/Animated/Animated', () =>
  jest.requireActual('react-native/Libraries/Animated/AnimatedMock')
);

// Neutraliser l'helper natif privé si importé par RN
jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => ({
  API: { flushQueue: jest.fn(), startOperationBatch: jest.fn(), finishOperationBatch: jest.fn() },
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

// Alléger le rendu de l'App: mocker l'écran caméra complet
jest.mock('./src/screens/RealCameraViewScreen', () => ({
  RealCameraViewScreen: () => null,
}));
