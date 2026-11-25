import { StatusBar } from 'react-native'
import React from 'react'
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { enableScreens } from 'react-native-screens';
import {store, persistor} from './src/redux/store';
import { NavigationContainer } from '@react-navigation/native'
import StackNavigation from './src/navigations/StackNavigation'
import { useAutoSync } from './src/hooks/useAutoSync'
import { AppDialogHost } from './src/components/AppDialog'

enableScreens();

// Runs app-wide so queued workouts sync themselves the moment the network is back.
const AutoSync = () => {
  useAutoSync();
  return null;
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AutoSync />
        <NavigationContainer>
          <StatusBar
            barStyle="light-content"
            backgroundColor="#121212"
            translucent
          />
          <StackNavigation />
        </NavigationContainer>
        {/* App-themed pop-ups (replaces the system Alert.alert everywhere) */}
        <AppDialogHost />
      </PersistGate>
    </Provider>
  )
}

export default App

