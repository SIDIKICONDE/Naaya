module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/jest.init.js',
    'react-native-gesture-handler/jestSetup',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/setup/testSetup.ts',
  ],
  testPathIgnorePatterns: [
    '/__tests__/setup/',
    '/__tests__/fixtures/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|react-native-gesture-handler|react-native-reanimated|react-native-vector-icons|react-native-video|react-native-vision-camera|react-native-svg)/)'
  ],
  moduleNameMapper: {
    'react-native-reanimated': '<rootDir>/node_modules/react-native-reanimated/mock.js',
  },
};
