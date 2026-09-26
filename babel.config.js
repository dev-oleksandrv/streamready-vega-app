module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        // Only inline keys declared in .env files, never arbitrary host env vars.
        safe: true,
        // Missing keys become undefined instead of failing the build (CI, tests).
        allowUndefined: true,
      },
    ],
  ],
};
