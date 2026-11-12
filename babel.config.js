module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reads .env at build time -> `import { X } from '@env'`
    ['module:react-native-dotenv', { moduleName: '@env', path: '.env', allowUndefined: true }],
    // Must stay last.
    'react-native-worklets/plugin',
  ],
};
