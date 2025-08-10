// Init très précoce: mock NativeModules et TurboModuleRegistry avant que RN ne charge

const createProxy = () => new Proxy({}, {
  get: (target, prop) => {
    if (!(prop in target)) target[prop] = jest.fn();
    return target[prop];
  }
});

// NOTE: le mock de NativeModules est géré dans jest.setup.js pour centraliser la config

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const {NativeModules} = require('react-native');
  const createProxy = () => new Proxy({}, { get: (target, prop) => {
    if (!(prop in target)) target[prop] = jest.fn();
    return target[prop];
  }});
  const stubByName = (name) => {
    if (name === 'SourceCode') {
      return { getConstants: () => ({ scriptURL: 'http://localhost/index.bundle' }) };
    }
    if (name === 'NativeI18nManager') {
      return { getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: false, allowRTL: false, forceRTL: false }) };
    }
    if (name === 'NativePlatformConstantsIOS') {
      return { getConstants: () => ({ forceTouchAvailable: false, interfaceIdiom: 'phone', osVersion: '14.0', systemName: 'iOS' }) };
    }
    if (name === 'NativeStatusBarManagerIOS') {
      return { setStyle: jest.fn(), setHidden: jest.fn(), setNetworkActivityIndicatorVisible: jest.fn() };
    }
    return null;
  };
  return {
    getEnforcing: jest.fn((name) => {
      const stub = stubByName(name);
      if (stub) return stub;
      if (!NativeModules[name]) NativeModules[name] = createProxy();
      return NativeModules[name];
    }),
    get: jest.fn((name) => {
      const stub = stubByName(name);
      if (stub) return stub;
      if (!NativeModules[name]) NativeModules[name] = createProxy();
      return NativeModules[name];
    }),
  };
});

// Déprécié: certains chemins RN utilisent encore ce module pour I18n
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeI18nManager', () => ({
  getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: false, allowRTL: false, forceRTL: false }),
}));

// NOTE: suppression du mock explicite de 'react-native' pour éviter les conflits avec le preset RN


