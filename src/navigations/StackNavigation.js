import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../features/splash/screens/SplashScreen';
import OnboardingScreen from '../features/onboard/screens/OnboardingScreen';
import LoginScreen from '../features/auth/login/screens/LoginScreen';
import RegisterScreen from '../features/auth/register/screens/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/forgot/screens/ForgotPasswordScreen';
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import HistoryScreen from '../features/history/screens/HistoryScreen';
import CameraScreen from '../features/camera/screens/CameraScreen';

const StackNavigation = () => {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />

      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigation;

