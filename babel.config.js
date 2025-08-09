module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./'],
      alias: {
        '@teleprompter': './src/teleprompter',
        '@ui': './src/ui',
        '@screens': './src/screens',
        '@components': './src/camera/components',
        'system@components': './src/camera/components',
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    }]
  ]
};
