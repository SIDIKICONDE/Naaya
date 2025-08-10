// Setup Jest pour React Native et TurboModules
// Assurer une config de bridge pour éviter l'invariant RN
if (!global.__fbBatchedBridgeConfig) {
  // remoteModuleConfig vide par défaut
  // RN lira cette config sans lever d'erreur
  global.__fbBatchedBridgeConfig = { remoteModuleConfig: [] };
}

// Activer les matchers jest-extended
try { require('jest-extended'); } catch (_) {}

// Matchers additionnels si non fournis par jest-extended
expect.extend({
  toHaveBeenCalledBefore(received, other) {
    if (!received || !received.mock || !other || !other.mock) {
      return { pass: false, message: () => 'Matchers attendent des jest.fn()' };
    }
    const a = received.mock.invocationCallOrder?.[0];
    const b = other.mock.invocationCallOrder?.[0];
    const pass = typeof a === 'number' && typeof b === 'number' && a < b;
    return {
      pass,
      message: () => `expected first call of received (${a}) to be before other (${b})`,
    };
  },
});

// Préparer nos NativeModules mocks avant que RN et RNGH ne soient chargés
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => {
  const createModuleNM = () => new Proxy({}, {
    get: (target, prop) => {
      if (!(prop in target)) target[prop] = jest.fn();
      return target[prop];
    }
  });
  return {
    NativeCameraModule: createModuleNM(),
    NativeCameraFiltersModule: createModuleNM(),
    NativeAudioEqualizerModule: createModuleNM(),
    NativeDeviceInfo: {
      getConstants: jest.fn(() => ({
        Dimensions: {
          windowPhysicalPixels: { width: 1080, height: 1920, scale: 2, fontScale: 2, densityDpi: 320 },
          screenPhysicalPixels: { width: 1080, height: 1920, scale: 2, fontScale: 2, densityDpi: 320 },
        },
        isTesting: true,
      })),
    },
    SettingsManager: {
      getConstants: jest.fn(() => ({ AppleLocale: 'en_US', AppleLanguages: ['en-US'], ForceRTL: false })),
    },
    NativeI18nManager: {
      getConstants: jest.fn(() => ({
        isRTL: false,
        doLeftAndRightSwapInRTL: false,
        allowRTL: false,
        forceRTL: false,
      })),
    },
  };
});

// RNGH: config officielle de test (nos mocks sont déjà en place)
require('react-native-gesture-handler/jestSetup');

// Reanimated: mock officiel
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
try {
  require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();
} catch (_) {}

// (déjà mocké ci-dessus)

// Mock de TurboModuleRegistry pour retourner les NativeModules correspondants
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const NativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');
  const isOurModule = (name) => (
    name === 'NativeCameraModule' ||
    name === 'NativeCameraFiltersModule' ||
    name === 'NativeAudioEqualizerModule'
  );
  const dynamic = (name) => new Proxy({}, {
    get: (_t, prop) => {
      if (name === 'SourceCode' && prop === 'getConstants') {
        return () => ({ scriptURL: 'http://localhost/index.bundle' });
      }
      if (name === 'NativeI18nManager' && prop === 'getConstants') {
        return () => ({ isRTL: false, doLeftAndRightSwapInRTL: false, allowRTL: false, forceRTL: false });
      }
      if (name === 'NativePlatformConstantsIOS' && prop === 'getConstants') {
        return () => ({ forceTouchAvailable: false, interfaceIdiom: 'phone', osVersion: '14.0', systemName: 'iOS' });
      }
      if (name === 'NativeStatusBarManagerIOS') {
        return jest.fn();
      }
      const current = NativeModules[name];
      if (!current) {
        if (isOurModule(name)) {
          throw new Error(`TurboModule ${name} is not available`);
        }
        return jest.fn();
      }
      return current[prop] ?? jest.fn();
    }
  });
  return {
    getEnforcing: jest.fn((name) => dynamic(name)),
    get: jest.fn((name) => dynamic(name)),
  };
});

// S'assurer que react-native expose bien nos NativeModules mockés
try {
  const RN = require('react-native');
  const NativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');
  RN.NativeModules = NativeModules;
} catch (_) {}

/* eslint-env jest */
// Configuration Jest pour Naaya

// RN GH setup est déjà chargé et notre mock NativeModules couvre les besoins

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
