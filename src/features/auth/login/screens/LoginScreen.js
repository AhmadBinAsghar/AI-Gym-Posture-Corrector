import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../styles/login.styles';
import { useLogin } from '../hooks/useLogin';
import Button from '../../../../components/Button';
import Input from '../../../../components/Input';

const LoginScreen = ({ navigation }) => {
  const {
    email,
    password,
    errors,
    isLoading,
    handleChangeEmail,
    handleChangePassword,
    handleLogin,
    handleOfflineSandbox,
    handleGoToRegister,
  } = useLogin(navigation);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.logoText}>⚡</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Log in to check your exercise posture.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChangeText={handleChangeEmail}
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={handleChangePassword}
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="Log In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.submitBtn}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          <Button
            title="⚡ Guest Offline Sandbox Mode"
            onPress={handleOfflineSandbox}
            style={styles.sandboxBtn}
            variant="secondary"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleGoToRegister} activeOpacity={0.7}>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
