/**
 * @format
 */

// Must come first: supabase-js needs a spec-compliant URL in React Native.
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
