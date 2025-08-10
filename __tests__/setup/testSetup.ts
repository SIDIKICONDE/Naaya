// Configuration globale des tests
import 'react-native';

// Les mocks de NativeModules et TurboModuleRegistry sont définis dans jest.setup.js

// Mock des modules tiers
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mocked/path',
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Configuration globale
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
